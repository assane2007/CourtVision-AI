declare module '@mediapipe/tasks-vision' {
  export interface Landmark {
    x: number
    y: number
    z: number
    visibility?: number
  }

  export interface PoseLandmarkerResult {
    landmarks: Landmark[][]
    worldLandmarks: Landmark[][]
  }

  export interface PoseLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string
      delegate?: string
    }
    runningMode: 'VIDEO' | 'IMAGE'
    numPoses?: number
    minPoseDetectionConfidence?: number
    minPosePresenceConfidence?: number
    minTrackingConfidence?: number
    outputSegmentationMasks?: boolean
  }

  export class PoseLandmarker {
    static createFromOptions(filesetResolver: unknown, options: PoseLandmarkerOptions): Promise<PoseLandmarker>
    detect(video: HTMLVideoElement, timestamp: number): PoseLandmarkerResult
    close(): void
    setOptions(options: Partial<PoseLandmarkerOptions>): void
  }

  export class FilesetResolver {
    static forVisionTasks(url: string): Promise<unknown>
  }
}