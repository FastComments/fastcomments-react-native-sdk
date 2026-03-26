import {Alert} from 'react-native';

export function showError(title: string, message: string, dismissLabel?: string, onError?: (title: string, message: string) => void) {
    if (onError) {
        onError(title, message);
    } else {
        Alert.alert(
            title,
            message,
            [{text: dismissLabel || 'Dismiss'}]
        );
    }
}
