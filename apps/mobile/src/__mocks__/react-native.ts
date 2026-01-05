/**
 * Mock for react-native module in vitest
 * This allows testing code that imports from react-native without the full native runtime
 */

// Track the current mock value for Platform.OS
let mockOS = 'ios';

export function setMockOS(os: string) {
  mockOS = os;
}

export const Platform = {
  get OS() {
    return mockOS;
  },
  select: <T>(obj: { ios?: T; android?: T; default?: T }): T | undefined => {
    if (mockOS === 'ios' && obj.ios !== undefined) return obj.ios;
    if (mockOS === 'android' && obj.android !== undefined) return obj.android;
    return obj.default;
  },
  Version: 0,
  isPad: false,
  isTV: false,
  isTesting: true,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: <T>(style: T): T => style,
  hairlineWidth: 1,
};

export const View = 'View';
export const Text = 'Text';
export const Pressable = 'Pressable';
export const ActivityIndicator = 'ActivityIndicator';
export const Alert = {
  alert: () => {},
};
export const Linking = {
  openURL: async () => {},
  canOpenURL: async () => true,
};
export const Modal = 'Modal';
export const TextInput = 'TextInput';
export const KeyboardAvoidingView = 'KeyboardAvoidingView';
export const ScrollView = 'ScrollView';
