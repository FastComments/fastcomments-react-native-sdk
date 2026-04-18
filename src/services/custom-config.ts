import { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';
import type { FastCommentsStore } from '../store/types';

export function handleNewCustomConfig(
    store: FastCommentsStore,
    customConfig: FastCommentsCommentWidgetConfig | null | undefined,
    overwrite?: boolean
) {
    const state = store.getState();
    if (customConfig) {
        const nextConfig = { ...state.config };
        for (const key in customConfig) {
            const k = key as keyof FastCommentsCommentWidgetConfig;
            if (key === 'translations') {
                const existing = (nextConfig as any).translations;
                (nextConfig as any).translations = existing
                    ? Object.assign({}, (customConfig as any)[key], existing)
                    : (customConfig as any)[key];
            } else if (
                nextConfig[k] === undefined ||
                overwrite ||
                key === 'wrap' ||
                key === 'hasDarkBackground'
            ) {
                (nextConfig as any)[k] = (customConfig as any)[k];
            }
        }
        state.setConfig(nextConfig as typeof state.config);
        if (!state.sortDirection) {
            const defaultSortDirection = nextConfig.defaultSortDirection;
            if (typeof defaultSortDirection === 'string') {
                state.setSortDirection(defaultSortDirection);
            }
        }
    }

    const configTranslations = store.getState().config.translations;
    if (configTranslations) {
        store.getState().setTranslations({
            ...store.getState().translations,
            ...configTranslations,
        });
    }
}
