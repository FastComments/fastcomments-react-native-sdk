// @ts-nocheck
/**
 * Global setup that runs once per test file before module imports.
 * Configures globals expected by react-native code paths (__DEV__, etc.) and
 * polyfills WebSocket if the running Node lacks it.
 */

// On Node 22+ globalThis.performance is a read-only built-in. The react-native
// jest preset's setup tries to overwrite it with a stub; redefine it as a
// writable+configurable property up-front so the RN preset's assignment lands.
Object.defineProperty(globalThis, 'performance', {
    value: { now: () => Date.now() },
    writable: true,
    configurable: true,
});

// Pull in the react-native jest preset's setup (mocks Animated, NativeModules,
// ViewManagers, FlatList, etc.). We re-implement this require here rather than
// using `preset.setupFiles` because Jest replaces preset setupFiles when the
// consumer supplies their own list.
require('react-native/jest/setup');

if (typeof (globalThis as any).WebSocket === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (globalThis as any).WebSocket = require('ws');
}

// Install Alert.alert spy so tests can programmatically tap confirmation buttons.
require('./framework/harness/alert-helper').installAlertSpy();

// react-native-render-html ships a virtualization reset hook that uses Animated.
// In jest the RN preset already mocks Animated; nothing else needed here.

// Suppress noisy console.error spam from network failure paths inside the SDK
// when tests intentionally tear tenants down at the end. Tests can re-enable by
// setting FC_LOG=1.
if (!process.env.FC_LOG) {
    const origError = console.error;
    console.error = (...args: any[]) => {
        const msg = String(args[0] || '');
        if (
            msg.includes('FastComments: fetchEventLog FAILURE') ||
            msg.includes('Failed to vote') ||
            msg.includes('ECONNREFUSED')
        ) {
            return;
        }
        origError(...args);
    };
}
