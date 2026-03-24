import { Platform } from 'react-native';

let Haptics: typeof import('expo-haptics') | null = null;

try {
  if (Platform.OS !== 'web') {
    Haptics = require('expo-haptics');
  }
} catch {}

export function lightTap() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function mediumTap() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function successTap() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function errorTap() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
