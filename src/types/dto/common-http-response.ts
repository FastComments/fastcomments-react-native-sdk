/**
 * Shared response shape used by legacy DTOs in this folder. Any new code
 * should prefer typed responses from `fastcomments-sdk` directly. This is
 * kept only to preserve the existing DTO contracts after `services/http.ts`
 * was deleted.
 */
export interface CommonHTTPResponse {
    status: 'success' | 'failed';
    code?: string;
    reason?: string;
    translatedError?: string;
    translations?: Record<string, string>;
}
