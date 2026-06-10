import {showAlertDialog} from './dialogs';

export function showError(title: string, message: string, dismissLabel?: string, onError?: (title: string, message: string) => void) {
    if (onError) {
        onError(title, message);
    } else {
        showAlertDialog(title, message, dismissLabel || 'Dismiss');
    }
}
