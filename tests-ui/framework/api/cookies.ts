/**
 * Minimal cookie jar - just enough to carry the session set by /auth/tenant-signup
 * over to /auth/my-account/api-secret. Does not understand domains or paths;
 * it stores cookies by host and replays them on subsequent requests to the
 * same host.
 */
export class CookieJar {
    private byHost = new Map<string, Map<string, string>>();

    saveFromResponse(host: string, setCookieHeaders: string[]) {
        const bucket = this.byHost.get(host) || new Map<string, string>();
        for (const header of setCookieHeaders) {
            const semi = header.indexOf(';');
            const head = semi === -1 ? header : header.slice(0, semi);
            const eq = head.indexOf('=');
            if (eq === -1) continue;
            const name = head.slice(0, eq).trim();
            const value = head.slice(eq + 1).trim();
            if (name) bucket.set(name, value);
        }
        this.byHost.set(host, bucket);
    }

    cookieHeader(host: string): string | undefined {
        const bucket = this.byHost.get(host);
        if (!bucket || bucket.size === 0) return undefined;
        return Array.from(bucket.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
    }
}

export function readSetCookieHeaders(headers: Headers): string[] {
    // The standard fetch Headers API folds set-cookie. Some Node versions expose
    // getSetCookie(); fall back to splitting on commas for older ones.
    const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
    if (typeof anyHeaders.getSetCookie === 'function') {
        return anyHeaders.getSetCookie();
    }
    const raw = headers.get('set-cookie');
    if (!raw) return [];
    return raw.split(/,(?=\s*[a-zA-Z0-9_-]+=)/);
}

export function hostOf(url: string): string {
    return new URL(url).host;
}
