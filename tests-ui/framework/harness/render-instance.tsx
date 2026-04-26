import React from 'react';
import { render, RenderAPI } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../../src/components/live-commenting';
import { FastCommentsRNConfig } from '../../../src/types/react-native-config';
import type { FastCommentsCallbacks } from '../../../src/types';

export interface InstanceHandle {
    rendered: RenderAPI;
    config: FastCommentsRNConfig;
    role: string;
    unmount: () => void;
}

export interface RenderInstanceParams {
    role: string;
    config: FastCommentsRNConfig;
    callbacks?: FastCommentsCallbacks;
}

/**
 * Render a single FastComments instance. Returns the @testing-library/react-native
 * RenderAPI plus a label for diagnostics.
 *
 * Each call has its own zustand store and (when the SDK opens one) its own
 * WebSocket connection - so multiple calls in the same test produce independent
 * "users" sharing only the production backend.
 */
export function renderInstance(params: RenderInstanceParams): InstanceHandle {
    const { role, config, callbacks } = params;
    const rendered = render(
        <FastCommentsLiveCommenting config={config} callbacks={callbacks} />
    );
    return {
        rendered,
        config,
        role,
        unmount: () => rendered.unmount(),
    };
}
