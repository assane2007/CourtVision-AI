import * as Haptics from 'expo-haptics';

export function useHaptics() {
  function light() {
    Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light);
  }

  function medium() {
    Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Medium);
  }

  function heavy() {
    Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Heavy);
  }

  function success() {
    Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success);
  }

  function warning() {
    Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Warning);
  }

  function error() {
    Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Error);
  }

  function selection() {
    Haptics?.selectionAsync();
  }

  return { light, medium, heavy, success, warning, error, selection };
}