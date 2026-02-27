// Mock for expo-camera
export const CameraView = 'CameraView'
export type CameraType = 'back' | 'front'
export function useCameraPermissions() {
    return [{ granted: true, canAskAgain: true }, jest.fn()]
}
