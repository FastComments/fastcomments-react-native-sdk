import { Alert, Platform } from 'react-native';

/**
 * Alert.alert is a silent no-op under react-native-web, which turns every
 * confirm flow (cancel reply, delete comment, error display) into a dead end
 * in browsers. Route dialogs through window.confirm/window.alert there.
 */
const isWebWithDialogs = () =>
    Platform.OS === 'web'
    && typeof window !== 'undefined'
    && typeof window.confirm === 'function';

export interface ConfirmDialogParams {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function showConfirmDialog(params: ConfirmDialogParams) {
    if (isWebWithDialogs()) {
        if (window.confirm(`${params.title}\n\n${params.message}`)) params.onConfirm();
        else params.onCancel();
        return;
    }
    Alert.alert(
        params.title,
        params.message,
        [
            {
                text: params.cancelText,
                onPress: params.onCancel,
                style: 'cancel',
            },
            {
                text: params.confirmText,
                onPress: params.onConfirm,
                style: params.destructive ? 'destructive' : 'default',
            },
        ],
        { onDismiss: params.onCancel }
    );
}

export function showAlertDialog(title: string, message: string, dismissText: string) {
    if (isWebWithDialogs()) {
        window.alert(`${title}\n\n${message}`);
        return;
    }
    Alert.alert(title, message, [{ text: dismissText }]);
}
