import { Platform, Alert } from 'react-native';

/** `Alert.alert` is unreliable on react-native-web; use `window.alert` there. */
export function showAppAlert(title: string, message?: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  if (message) Alert.alert(title, message);
  else Alert.alert(title);
}
