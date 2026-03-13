/**
 * Type declarations for third-party modules without installed types.
 * These will be replaced by proper @types packages after npm install.
 */

declare module '@react-native-community/netinfo' {
  interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
  }

  type NetInfoChangeHandler = (state: NetInfoState) => void;

  const NetInfo: {
    addEventListener(listener: NetInfoChangeHandler): () => void;
    fetch(): Promise<NetInfoState>;
  };

  export default NetInfo;
}
