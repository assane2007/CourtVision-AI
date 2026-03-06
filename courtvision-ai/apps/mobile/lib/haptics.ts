import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

class HapticFeedbackService {
    /**
     * Used for generic, short, light interactions. (e.g., toggles, minor list selections)
     */
    async light() {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {
                // Non-blocking catch
            }
        }
    }

    /**
     * Used for standard buttons presses, such as "PrimaryButton".
     */
    async medium() {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (e) { }
        }
    }

    /**
     * Used for strong button presses, perhaps destructive actions.
     */
    async heavy() {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } catch (e) { }
        }
    }

    /**
     * Used for successful actions (e.g., payment complete, user followed, upload finished).
     */
    async success() {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) { }
        }
    }

    /**
     * Used for explicitly denied actions (e.g., invalid input, network error on submit).
     */
    async error() {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } catch (e) { }
        }
    }

    /**
     * Used for warning situations.
     */
    async warning() {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e) { }
        }
    }

    /**
     * Used when the user scrolls through wheel pickers or navigates across tabs.
     */
    async selection() {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.selectionAsync();
            } catch (e) { }
        }
    }
}

export const HapticFeedback = new HapticFeedbackService();
