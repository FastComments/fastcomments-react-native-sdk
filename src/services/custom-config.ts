import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";

export function handleNewCustomConfig(state: State<FastCommentsState>, customConfig: FastCommentsCommentWidgetConfig | null | undefined, overwrite?: boolean) {
    const config = state.config;
    if (customConfig) {
        for (const key in customConfig) {
            // for the customization page (css is sent from server, but newer version from client)
            // if the custom config has translations, merge them with what the client specified
            if (key === 'translations') {
                if (config[key].get()) {
                    config[key].set(Object.assign({}, customConfig[key], config[key].get()));
                } else {
                    config[key].set(customConfig[key]);
                }
            } else if ((config[key as keyof FastCommentsCommentWidgetConfig] === undefined || overwrite) || key === 'wrap' || key === 'hasDarkBackground') { // undefined is important here (test comment thread viewer w/ customizations like hideCommentsUnderCountTextFormat/useShowCommentsToggle
                // @ts-ignore
                config[key].set(customConfig[key]);
            }
        }
        if (!state.sortDirection.get()) {
            const defaultSortDirection = config.defaultSortDirection.get();
            if (typeof defaultSortDirection === 'string') {
                state.sortDirection.set(defaultSortDirection);
            }
        }
    }

    const configTranslations = config.translations.get();
    if (configTranslations) {
        state.translations.merge(configTranslations);
    }
}
