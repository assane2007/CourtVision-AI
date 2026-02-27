// Mock for expo-file-system
export const documentDirectory = '/mock/documents/'
export const cacheDirectory = '/mock/cache/'
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined)
export const readAsStringAsync = jest.fn().mockResolvedValue('{}')
export const deleteAsync = jest.fn().mockResolvedValue(undefined)
export const getInfoAsync = jest.fn().mockResolvedValue({ exists: false, size: 0 })
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined)
export const EncodingType = { UTF8: 'utf8', Base64: 'base64' }
