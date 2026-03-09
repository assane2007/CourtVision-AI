/**
 * Tests for the SyncQueueService — persistent retry queue for cloud sync.
 */

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Mock NetInfo
const mockListeners: Array<(state: any) => void> = [];
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: any) => {
      mockListeners.push(cb);
      return () => {
        const idx = mockListeners.indexOf(cb);
        if (idx >= 0) mockListeners.splice(idx, 1);
      };
    }),
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  },
}));

import { SyncQueueService } from '../lib/syncQueue';

describe('SyncQueueService', () => {
  let queue: SyncQueueService;

  beforeEach(() => {
    // Reset singleton
    (SyncQueueService as any).instance = null;
    queue = SyncQueueService.getInstance();
    // Clear storage
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    // Reset loaded state
    (queue as any).isLoaded = false;
    (queue as any).queue = [];
    (queue as any).isProcessing = false;
    mockListeners.length = 0;
  });

  afterEach(() => {
    queue.stop();
  });

  it('should be a singleton', () => {
    const q2 = SyncQueueService.getInstance();
    expect(q2).toBe(queue);
  });

  it('should enqueue a session', async () => {
    await queue.enqueue('session_001');
    const pending = await queue.getPendingCount();
    expect(pending).toBe(1);
  });

  it('should not enqueue duplicate sessions', async () => {
    await queue.enqueue('session_001');
    await queue.enqueue('session_001');
    const pending = await queue.getPendingCount();
    expect(pending).toBe(1);
  });

  it('should persist queue to AsyncStorage', async () => {
    await queue.enqueue('session_002');
    expect(mockStorage['@courtvision_sync_queue']).toBeDefined();
    const parsed = JSON.parse(mockStorage['@courtvision_sync_queue']);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].sessionId).toBe('session_002');
  });

  it('should process queue and call executor', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);
    queue.start(executor);

    await queue.enqueue('session_003');
    const result = await queue.processQueue();

    expect(executor).toHaveBeenCalledWith('session_003');
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(await queue.getPendingCount()).toBe(0);
  });

  it('should keep failed items in queue with incremented attempts', async () => {
    const executor = jest.fn().mockRejectedValue(new Error('Network error'));
    queue.start(executor);

    await queue.enqueue('session_004');
    const result = await queue.processQueue();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);

    const items = await queue.getQueue();
    expect(items).toHaveLength(1);
    expect(items[0].attempts).toBe(1);
    expect(items[0].lastError).toBe('Network error');
  });

  it('should drop items that exceed max attempts', async () => {
    const executor = jest.fn().mockRejectedValue(new Error('fail'));
    queue.start(executor);

    await queue.enqueue('session_005');

    // Simulate 5 failed attempts
    const queueItems = await queue.getQueue();
    (queue as any).queue[0].attempts = 5;

    const result = await queue.processQueue();
    expect(result.failed).toBe(1);
    expect(await queue.getPendingCount()).toBe(0);
  });

  it('should not process when offline', async () => {
    const NetInfo = require('@react-native-community/netinfo').default;
    NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

    const executor = jest.fn().mockResolvedValue(undefined);
    queue.start(executor);

    await queue.enqueue('session_006');
    const result = await queue.processQueue();

    expect(executor).not.toHaveBeenCalled();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('should trigger processing on connectivity restore', async () => {
    const executor = jest.fn().mockResolvedValue(undefined);
    queue.start(executor);

    await queue.enqueue('session_007');

    // Simulate connectivity restore
    expect(mockListeners.length).toBeGreaterThan(0);
    mockListeners[0]({ isConnected: true });

    // Wait for async process
    await new Promise(r => setTimeout(r, 50));
    expect(executor).toHaveBeenCalledWith('session_007');
  });

  it('should clear the queue', async () => {
    await queue.enqueue('session_008');
    await queue.enqueue('session_009');
    expect(await queue.getPendingCount()).toBe(2);

    await queue.clear();
    expect(await queue.getPendingCount()).toBe(0);
  });

  it('should unsubscribe from NetInfo on stop', () => {
    queue.start(jest.fn());
    expect(mockListeners.length).toBe(1);

    queue.stop();
    // The unsubscribe removes the listener
    expect((queue as any).unsubscribeNetInfo).toBeNull();
  });

  it('should load persisted queue from AsyncStorage', async () => {
    // Pre-populate storage
    mockStorage['@courtvision_sync_queue'] = JSON.stringify([
      { sessionId: 'session_010', enqueuedAt: '2024-01-01T00:00:00Z', attempts: 1 },
    ]);

    // Reset loaded state to force reload
    (SyncQueueService as any).instance = null;
    const freshQueue = SyncQueueService.getInstance();

    const items = await freshQueue.getQueue();
    expect(items).toHaveLength(1);
    expect(items[0].sessionId).toBe('session_010');
  });
});
