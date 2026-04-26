/**
 * Pure-render smoke test: verifies the SDK component renders without throwing
 * when given a stub config. Does NOT hit the network - the FastComments SDK
 * will issue a fetch on mount and we just let it fail. We're only asserting
 * that the React tree mounts.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';

describe('SDK render smoke', () => {
    it('mounts without throwing using a stub config', () => {
        const renderResult = render(
            <FastCommentsLiveCommenting
                config={{
                    tenantId: 'demo',
                    urlId: 'native-test',
                    apiHost: 'http://127.0.0.1:1', // unreachable host -> fetch fails fast
                    wsHost: 'ws://127.0.0.1:1',
                    disableLiveCommenting: true,
                } as any}
            />
        );
        expect(renderResult.toJSON()).toBeTruthy();
        renderResult.unmount();
    });
});
