import type { APIError } from 'fastcomments-sdk';

/**
 * fastcomments-sdk v5 narrowed the public success-response types to their
 * documented success shape, dropping the server's error/overflow fields
 * (code, reason, translatedError, customConfig, maxCharacterLength, bannedUntil).
 * Those fields still arrive at runtime - on failures, plus config echoes on some
 * responses - so read them through APIError's shape rather than leaking `any`.
 */
export function responseExtras(response: unknown): Partial<APIError> {
    return (response ?? {}) as Partial<APIError>;
}

/** The standard `code ?? reason ?? fallback` error string off any response. */
export function responseError(response: unknown, fallback: string): string {
    const extras = responseExtras(response);
    return extras.code ?? extras.reason ?? fallback;
}
