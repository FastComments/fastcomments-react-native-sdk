import { CommonHTTPResponse } from './http';
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
