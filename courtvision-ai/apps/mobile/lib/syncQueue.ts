/**
 * SyncQueue — Persistent offline-first sync queue for cloud uploads.
 *
 * Sessions that fail to sync are enqueued to AsyncStorage and retried
 * automatically when network connectivity is restored via NetInfo.
 * Uses the withRetry utility for exponential backoff on each attempt.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetInfoState } from '@react-native-community/netinfo';
import NetInfo from '@react-native-community/netinfo';
import { withRetry } from './retry';

// ==========================================
// Types
// ==========================================

export interface SyncQueueItem {
  sessionId: string;
  enqueuedAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

type SyncExecutor = (sessionId: string) => Promise<void>;

// ==========================================
// Constants
// ==========================================

const QUEUE_KEY = '@courtvision_sync_queue';
const MAX_ATTEMPTS = 5;

// ==========================================
// Service
// ==========================================

export class SyncQueueService {
  private static instance: SyncQueueService | null = null;
  private queue: SyncQueueItem[] = [];
  private isLoaded = false;
  private isProcessing = false;
  private executor: SyncExecutor | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;

  static getInstance(): SyncQueueService {
    if (!SyncQueueService.instance) {
      SyncQueueService.instance = new SyncQueueService();
    }
    return SyncQueueService.instance;
  }

  private constructor() {}

  // ---- Initialization ----

  /**
   * Start the queue with a sync executor and begin listening for connectivity.
   * The executor receives a sessionId and must sync that session to the cloud.
   */
  start(executor: SyncExecutor): void {
    this.executor = executor;
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.onConnectivityChange);
  }

  stop(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.executor = null;
  }

  // ---- Enqueue ----

  async enqueue(sessionId: string): Promise<void> {
    await this.load();

    // Don't enqueue duplicates
    if (this.queue.some(item => item.sessionId === sessionId)) return;

    this.queue.push({
      sessionId,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    });

    await this.persist();
  }

  // ---- Process Queue ----

  async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isProcessing || !this.executor) return { synced: 0, failed: 0 };

    await this.load();
    if (this.queue.length === 0) return { synced: 0, failed: 0 };

    // Check connectivity before processing
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { synced: 0, failed: 0 };

    this.isProcessing = true;
    let synced = 0;
    let failed = 0;

    const remaining: SyncQueueItem[] = [];

    for (const item of this.queue) {
      if (item.attempts >= MAX_ATTEMPTS) {
        failed++;
        continue; // Drop items that exceeded max attempts
      }

      try {
        await withRetry(() => this.executor!(item.sessionId), {
          maxRetries: 2,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
        });
        synced++;
      } catch (error: any) {
        item.attempts++;
        item.lastAttemptAt = new Date().toISOString();
        item.lastError = error?.message ?? 'Unknown error';
        remaining.push(item);
        failed++;
      }
    }

    this.queue = remaining;
    await this.persist();
    this.isProcessing = false;

    return { synced, failed };
  }

  // ---- Connectivity Listener ----

  private onConnectivityChange = (state: NetInfoState): void => {
    if (state.isConnected && this.queue.length > 0) {
      this.processQueue().catch(() => {});
    }
  };

  // ---- Queue Info ----

  async getPendingCount(): Promise<number> {
    await this.load();
    return this.queue.length;
  }

  async getQueue(): Promise<SyncQueueItem[]> {
    await this.load();
    return [...this.queue];
  }

  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
  }

  // ---- Persistence ----

  private async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw) as SyncQueueItem[];
      }
      this.isLoaded = true;
    } catch {
      this.queue = [];
      this.isLoaded = true;
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Silently fail — queue will be rebuilt from unsynced sessions
    }
  }
}
