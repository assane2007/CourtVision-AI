import { PoseLandmarker } from '@/types/mediapipe.d';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm' {
  export class PoseLandmarker {
    static createFromOptions(vision: any, options: any): Promise<PoseLandmarker>;
    detect(video: HTMLVideoElement, timestampMs: number): any;
    close(): void;
  }
  export class FilesetResolver {
    static forVisionTasks(url: string): Promise<any>;
  }
  export class DrawingUtils {
    static drawLandmarks(canvasCtx: CanvasRenderingContext2D, landmarks: any, options?: any): void;
    static drawConnectors(canvasCtx: CanvasRenderingContext2D, landmarks: any, connections: any, options?: any): void;
  }
  export const POSE_LANDMARKS: any;
  export const POSE_CONNECTIONS: any;
}

declare module '@mediapipe/tasks-vision' {
  export class PoseLandmarker {
    static createFromOptions(vision: any, options: any): Promise<PoseLandmarker>;
    detect(video: HTMLVideoElement, timestampMs: number): any;
    close(): void;
  }
  export class FilesetResolver {
    static forVisionTasks(url: string): Promise<any>;
  }
  export class DrawingUtils {
    static drawLandmarks(canvasCtx: CanvasRenderingContext2D, landmarks: any, options?: any): void;
    static drawConnectors(canvasCtx: CanvasRenderingContext2D, landmarks: any, connections: any, options?: any): void;
  }
  export const POSE_LANDMARKS: any;
  export const POSE_CONNECTIONS: any;
}