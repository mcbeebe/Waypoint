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

declare module 'expo-document-picker' {
  interface DocumentPickerAsset {
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  }

  interface DocumentPickerResult {
    canceled: boolean;
    assets: DocumentPickerAsset[] | null;
  }

  interface DocumentPickerOptions {
    type?: string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }

  function getDocumentAsync(options?: DocumentPickerOptions): Promise<DocumentPickerResult>;
}

declare module 'expo-notifications' {
  interface NotificationPermissionsStatus {
    status: 'granted' | 'denied' | 'undetermined';
  }

  interface NotificationContent {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    sound?: boolean;
    badge?: number;
  }

  enum SchedulableTriggerInputTypes {
    DATE = 1,
    TIME_INTERVAL = 2,
    DAILY = 3,
    WEEKLY = 4,
    CALENDAR = 5,
  }

  interface DateTriggerInput {
    type: SchedulableTriggerInputTypes.DATE;
    date: Date;
  }

  interface ScheduleNotificationInput {
    content: NotificationContent;
    trigger: DateTriggerInput | null;
  }

  interface NotificationHandler {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }

  function setNotificationHandler(handler: NotificationHandler): void;
  function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  function requestPermissionsAsync(options?: {
    ios?: { allowAlert?: boolean; allowBadge?: boolean; allowSound?: boolean };
  }): Promise<NotificationPermissionsStatus>;
  function scheduleNotificationAsync(input: ScheduleNotificationInput): Promise<string>;
  function cancelScheduledNotificationAsync(id: string): Promise<void>;
  function cancelAllScheduledNotificationsAsync(): Promise<void>;
}

declare module '@sentry/react-native' {
  interface SentryUser {
    id?: string;
    email?: string;
    ip_address?: string;
  }

  interface SentryBreadcrumb {
    message?: string;
    category?: string;
    data?: Record<string, unknown>;
    level?: string;
  }

  interface SentryEvent {
    user?: SentryUser;
  }

  interface SentryScope {
    setTag(key: string, value: string): void;
  }

  interface SentryInitOptions {
    dsn: string;
    environment?: string;
    release?: string;
    dist?: string;
    tracesSampleRate?: number;
    enabled?: boolean;
    beforeBreadcrumb?: (breadcrumb: SentryBreadcrumb) => SentryBreadcrumb | null;
    beforeSend?: (event: SentryEvent) => SentryEvent | null;
  }

  function init(options: SentryInitOptions): void;
  function setUser(user: SentryUser | null): void;
  function captureException(error: Error): void;
  function withScope(callback: (scope: SentryScope) => void): void;
  function addBreadcrumb(breadcrumb: SentryBreadcrumb): void;
  function wrap<T extends React.ComponentType>(component: T): T;
}
