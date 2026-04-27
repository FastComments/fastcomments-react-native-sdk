import { FastCommentsRNConfig } from '../types/react-native-config';

/**
 * Resolve the API host for a given config. Mirrors the same precedence the
 * legacy makeRequest helper used: explicit `apiHost` wins, then EU region,
 * then the default global host. Used as the SDK's `basePath` and to seed the
 * store's `apiHost` field.
 */
export function getAPIHost(config: Pick<FastCommentsRNConfig, 'apiHost' | 'region'>): string {
    if (config.apiHost) return config.apiHost;
    return config.region === 'eu' ? 'https://eu.fastcomments.com' : 'https://fastcomments.com';
}
