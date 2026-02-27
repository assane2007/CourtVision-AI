// Mock for react-native
export const Platform = { OS: 'ios', select: (spec: any) => spec.ios ?? spec.default }
export const Vibration = { vibrate: jest.fn() }
export const Alert = { alert: jest.fn() }
export const Dimensions = { get: () => ({ width: 390, height: 844 }) }
export const Share = { share: jest.fn().mockResolvedValue({ action: 'sharedAction' }) }
export const Linking = { openURL: jest.fn() }
export const AppState = { addEventListener: jest.fn(() => ({ remove: jest.fn() })) }
export const StatusBar = {}
export const StyleSheet = {
    create: (styles: any) => styles,
    flatten: (s: any) => s,
    hairlineWidth: 1,
}
export const View = 'View'
export const Text = 'Text'
export const TouchableOpacity = 'TouchableOpacity'
export const ScrollView = 'ScrollView'
export const FlatList = 'FlatList'
export const Image = 'Image'
export const TextInput = 'TextInput'
export const ActivityIndicator = 'ActivityIndicator'
export default {
    Platform, Vibration, Alert, Dimensions, Share, Linking, AppState, StatusBar,
    StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, Image, TextInput, ActivityIndicator,
}
