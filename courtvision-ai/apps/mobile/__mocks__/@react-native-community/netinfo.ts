// Mock for @react-native-community/netinfo
const listeners: Array<(state: any) => void> = [];

const NetInfo = {
  addEventListener: jest.fn((callback: (state: any) => void) => {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  // Test helper to simulate connectivity changes
  __simulateChange: (state: any) => {
    listeners.forEach(cb => cb(state));
  },
};

export default NetInfo;
