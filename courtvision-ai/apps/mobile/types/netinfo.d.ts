declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
  }

  interface NetInfo {
    addEventListener(listener: (state: NetInfoState) => void): () => void;
    fetch(): Promise<NetInfoState>;
  }

  const netInfo: NetInfo;
  export default netInfo;
}
