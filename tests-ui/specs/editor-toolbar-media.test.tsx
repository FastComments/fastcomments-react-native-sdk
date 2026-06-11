/**
 * The web widget ships image-upload and GIF buttons in the editor toolbar by
 * default; the RN SDK must too. The GIF button opens the SDK's built-in
 * GifBrowser (no host callback required) and the selection lands in the
 * comment. (The image button needs a host pickImage callback on native, where
 * the SDK has no file picker; on web it falls back to a DOM file input, which
 * the web lane covers.)
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil } from '../framework/harness/poll';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Editor toolbar media buttons', () => {
    let ctx: TestContext;

    afterEach(async () => teardownTestContext(ctx));

    it('testGifButtonOpensBuiltInBrowserAndInsertsIntoComment', async () => {
        ctx = await setupTestContext({ emailPrefix: 'gifbtn', urlIdLabel: 'gif-button' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });
        const { getByTestId, queryByTestId, queryAllByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId('commentInput'), { timeoutMs: 15000, label: 'commentInput visible' });
        // No pickGIF callback configured: the button must still render.
        await pollUntil(() => !!queryByTestId('toolbarGifButton'), {
            timeoutMs: 5000,
            label: 'gif button rendered by default',
        });

        fireEvent.press(getByTestId('toolbarGifButton'));
        await pollUntil(() => !!queryByTestId('gifBrowserModal'), {
            timeoutMs: 15000,
            label: 'built-in gif browser opened',
        });
        // Trending results load from the real backend.
        await pollUntil(() => queryAllByTestId(/^gifResult-/).length > 0, {
            timeoutMs: 20000,
            label: 'trending gifs loaded',
        });

        fireEvent.press(queryAllByTestId(/^gifResult-/)[0]);
        await pollUntil(() => !queryByTestId('gifBrowserModal'), {
            timeoutMs: 5000,
            label: 'gif browser closed after selection',
        });
        // The selection landed in the editor as an image.
        await pollUntil(() => {
            const input = queryByTestId('commentInput');
            const value = input ? input.props.value : '';
            return typeof value === 'string' && value.includes('<img');
        }, { timeoutMs: 5000, label: 'gif inserted into the editor' });
    }, 120000);

    it('testGifSearchAutoSearchesWithDebounce', async () => {
        ctx = await setupTestContext({ emailPrefix: 'gifsearch', urlIdLabel: 'gif-search' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });
        const { getByTestId, queryByTestId, queryAllByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId('toolbarGifButton'), { timeoutMs: 15000, label: 'gif button' });
        fireEvent.press(getByTestId('toolbarGifButton'));
        await pollUntil(() => queryAllByTestId(/^gifResult-/).length > 0, {
            timeoutMs: 20000,
            label: 'trending gifs loaded',
        });
        const firstGifSource = () => {
            const image = queryByTestId('gifResultImage-0');
            if (!image) return '';
            const source = image.props.source;
            return source && typeof source.uri === 'string' ? source.uri : '';
        };
        const trendingFirstSrc = firstGifSource();
        expect(trendingFirstSrc.length).toBeGreaterThan(0);

        // Typing alone (no submit) must trigger the search after the debounce,
        // like the web widget's 700ms trailing search.
        fireEvent.changeText(getByTestId('gifSearchInput'), 'congratulations');
        await pollUntil(() => {
            const src = firstGifSource();
            return src.length > 0 && src !== trendingFirstSrc;
        }, { timeoutMs: 20000, label: 'results changed via auto-search' });
    }, 120000);

    it('testImageButtonRendersWithHostCallback', async () => {
        ctx = await setupTestContext({ emailPrefix: 'imgbtn', urlIdLabel: 'image-button' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });
        const { queryByTestId, getByTestId, unmount } = render(
            <FastCommentsLiveCommenting
                config={config}
                callbacks={{ pickImage: async () => 'https://staticm.fastcomments.com/1663891248769-IMG_20200419_092549.jpg' }}
            />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId('toolbarImageButton'), {
            timeoutMs: 15000,
            label: 'image button rendered with pickImage callback',
        });
        fireEvent.press(getByTestId('toolbarImageButton'));
        // The returned http URL inserts straight into the editor.
        await pollUntil(() => {
            const input = queryByTestId('commentInput');
            const value = input ? input.props.value : '';
            return typeof value === 'string' && value.includes('<img');
        }, { timeoutMs: 5000, label: 'image inserted into the editor' });
    }, 90000);
});
