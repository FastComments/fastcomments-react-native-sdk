import { useEffect, useState } from 'react';
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
const componentLoadsByStore = new WeakMap<FastCommentsStore, Map<string, Promise<boolean>>>();
// Keys whose strings are in the store, so UI that needs them can render on the first frame once loaded.
const componentsLoadedByStore = new WeakMap<FastCommentsStore, Set<string>>();

function getComponentKey(store: FastCommentsStore, component: string): string {
    return `${component}:${store.getState().config.locale ?? ''}`;
}

export function isTranslationComponentLoaded(store: FastCommentsStore, component: string): boolean {
    const loaded = componentsLoadedByStore.get(store);
    return !!loaded && loaded.has(getComponentKey(store, component));
}

/**
 * Load a `widgets` translation component into the store once per (store, locale),
 * merging its strings in. Components that extend comment-ui (see the localization
 * repo) return their inherited keys too. Resolves whether the strings arrived.
 * Failures are non-fatal and clear the marker so a later mount can retry.
 */
export function ensureTranslationComponentLoaded(store: FastCommentsStore, component: string): Promise<boolean> {
    let loads = componentLoadsByStore.get(store);
    if (!loads) {
        loads = new Map();
        componentLoadsByStore.set(store, loads);
    }
    const state = store.getState();
    const key = getComponentKey(store, component);
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
                let loaded = componentsLoadedByStore.get(store);
                if (!loaded) {
                    loaded = new Set();
                    componentsLoadedByStore.set(store, loaded);
                }
                loaded.add(key);
                return true;
            }
            return false;
        } catch {
            // Non-fatal: the affected labels render empty. Drop the marker so a
            // later mount can retry rather than caching the failure forever.
            loads!.delete(key);
            return false;
        }
    })();
    loads.set(key, load);
    return load;
}

/**
 * Loads a translation component while `enabled` and reports whether its strings are in the store. UI built from
 * them waits for this, the way the web widget only activates an extension once its translations load.
 */
export function useTranslationComponent(store: FastCommentsStore, component: string, enabled: boolean): boolean {
    const [loaded, setLoaded] = useState(() => isTranslationComponentLoaded(store, component));
    useEffect(() => {
        if (!enabled || loaded) {
            return;
        }
        let active = true;
        ensureTranslationComponentLoaded(store, component).then((ok) => {
            if (active && ok) {
                setLoaded(true);
            }
        });
        return () => {
            active = false;
        };
    }, [store, component, enabled, loaded]);
    return loaded;
}
