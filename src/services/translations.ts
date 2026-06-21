import { CommonHTTPResponse } from '../types/dto/common-http-response';
import type { FastCommentsStore } from '../store/types';

export function getMergedTranslations(
    sourceTranslations: Record<string, string>,
    response: CommonHTTPResponse
): Record<string, string> {
    if (response.translations) {
        return { ...sourceTranslations, ...response.translations };
    }
    return sourceTranslations;
}

export function addTranslationsToStore(store: FastCommentsStore, translations: Record<string, string>) {
    const state = store.getState();
    state.setTranslations({ ...state.translations, ...translations });
}

// Tracks which `widgets` translation components have been fetched per store, so
// each one is requested at most once. Keyed by store (WeakMap) and then by
// `component:locale`, the in-flight promise is shared so concurrent callers wait
// on the same request rather than re-fetching. This deliberately does NOT key off
// the presence of any translation string: a client may seed its own translations
// (e.g. config.translations) and we must still load the full component, not assume
// it is already present because one of its keys happens to be set.
const componentLoadsByStore = new WeakMap<FastCommentsStore, Map<string, Promise<void>>>();

/**
 * Load a `widgets` translation component into the store once per (store, locale),
 * merging its strings in. Components that extend comment-ui (see the localization
 * repo) return their inherited keys too. Failures are non-fatal and clear the
 * marker so a later mount can retry.
 */
export function ensureTranslationComponentLoaded(store: FastCommentsStore, component: string): Promise<void> {
    let loads = componentLoadsByStore.get(store);
    if (!loads) {
        loads = new Map();
        componentLoadsByStore.set(store, loads);
    }
    const state = store.getState();
    const key = `${component}:${state.config.locale ?? ''}`;
    const existing = loads.get(key);
    if (existing) return existing;

    const load = (async () => {
        try {
            const response = await state.sdk.publicApi.getTranslations({
                namespace: 'widgets',
                component,
                useFullTranslationIds: true,
                locale: state.config.locale,
            });
            if (response.status === 'success' && response.translations) {
                addTranslationsToStore(store, response.translations);
            }
        } catch {
            // Non-fatal: the affected labels render empty. Drop the marker so a
            // later mount can retry rather than caching the failure forever.
            loads!.delete(key);
        }
    })();
    loads.set(key, load);
    return load;
}
