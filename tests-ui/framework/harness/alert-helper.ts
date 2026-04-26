/**
 * Alert.alert is used by the SDK for delete confirmations and "cancel reply"
 * confirmations. The react-native jest preset doesn't mock it directly, so we
 * install our own spy + helpers here. Tests import {pressLatestAlertButton}
 * to programmatically tap a button (matching by text or style).
 */
import { Alert } from 'react-native';

export interface AlertCall {
    title: string;
    message?: string;
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
}

const calls: AlertCall[] = [];

export function installAlertSpy() {
    (Alert as any).alert = (
        title: string,
        message?: string,
        buttons?: AlertCall['buttons']
    ) => {
        calls.push({ title, message, buttons });
    };
}

export function getLatestAlert(): AlertCall | undefined {
    return calls[calls.length - 1];
}

export function clearAlerts() {
    calls.length = 0;
}

export function pressLatestAlertButton(
    predicate: 'destructive' | 'cancel' | 'default' | ((b: NonNullable<AlertCall['buttons']>[number]) => boolean)
) {
    const last = calls[calls.length - 1];
    if (!last?.buttons) throw new Error('No Alert.alert call has been made yet');
    const fn =
        typeof predicate === 'function'
            ? predicate
            : (b: NonNullable<AlertCall['buttons']>[number]) => b.style === predicate;
    const btn = last.buttons.find(fn);
    if (!btn) {
        const visible = last.buttons.map((b) => `[${b.style ?? 'default'}] ${b.text}`).join(', ');
        throw new Error(`No matching alert button. Visible buttons: ${visible}`);
    }
    btn.onPress?.();
}
