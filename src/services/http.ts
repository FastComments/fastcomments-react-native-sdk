export interface HTTPRequest {
    apiHost: string,
    method: 'DELETE' | 'GET' | 'PUT' | 'POST';
    url: string;
    body?: object;
    attemptsRemaining?: number;
}

export interface CommonHTTPResponse {
    status: 'success' | 'failed';
    code?: string;
    reason?: string;
}

export async function makeRequest<T>({apiHost, method, url, body, attemptsRemaining}: HTTPRequest): Promise<T> {
    console.log('FastComments request', url); // TODO remove
    if (attemptsRemaining === undefined) {
        attemptsRemaining = 2;
    }

    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        headers['Content-type'] = 'application/json';
    }

    const fullURL = apiHost + url;

    try {
        const result = await fetch(fullURL, {
            method,
            headers,
            credentials: 'include',
            body: body ? JSON.stringify(body) : undefined
        });
        if (result.status !== 200 && result.status !== 401 && result.status !== 422 && result.status !== 429) {
            if (result.status !== 400 && attemptsRemaining > 0 && method === 'GET') { // 400 bad request is not retryable
                return new Promise((resolve, reject) => {
                    setTimeout(async function () {
                        attemptsRemaining!--;
                        try {
                            resolve(await makeRequest({apiHost, method, url, body, attemptsRemaining}));
                        } catch (e) {
                            reject(e as T);
                        }
                    }, 1500 * Math.random());
                });
            } else {
                return Promise.reject(result);
            }
        } else {
            return await result.json();
        }
    } catch (e) {
        return Promise.reject(e);
    }
}

export function createURLQueryString(obj: Record<string, string | string[] | number | boolean | null | undefined>) {
    let result = [];
    for (const key in obj) {
        const value = obj[key];
        if (value !== undefined) {
            // @ts-ignore
            result.push(key + '=' + encodeURIComponent(value));
        }
    }
    return '?' + result.join('&');
}
