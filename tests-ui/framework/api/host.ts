export const FC_HOST = process.env.FC_HOST || 'https://fastcomments.com';
export const FC_WS_HOST =
    process.env.FC_WS_HOST ||
    (FC_HOST.startsWith('https')
        ? FC_HOST.replace('https://', 'wss://').replace(/^wss:\/\/(?!ws\.)/, 'wss://ws.')
        : FC_HOST.replace('http://', 'ws://'));

export function getE2EApiKey(): string {
    const key = process.env.FC_E2E_API_KEY;
    if (!key) {
        throw new Error(
            'FC_E2E_API_KEY env var is required. Get the value from a teammate; ' +
                'it must match an entry in the server-side E2E_TEST_KEYS list.'
        );
    }
    return key;
}

export function logHttp(...args: unknown[]) {
    if (process.env.FC_LOG === '1') {
        // eslint-disable-next-line no-console
        console.log('[fc-test-http]', ...args);
    }
}
