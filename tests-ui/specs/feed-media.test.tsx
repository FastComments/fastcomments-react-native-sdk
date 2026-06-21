/**
 * Feed media-attach tests. We test the public API surface end-to-end:
 * - The composer's pickImage callback adds a preview chip.
 * - Submitting a post with media attached creates a post the second instance
 *   can see, and that post carries the media payload back through the public
 *   GET endpoint.
 *
 * We don't go through the disk-backed image-upload pipeline here: instead we
 * have the host's pickImage callback return a publicly-resolvable http URL,
 * which the SDK wraps into a single-asset FeedPostMediaItem (mirroring
 * Android's `addImageUri` http-shortcut path). This keeps the test hermetic
 * (no file system needed) while still exercising the create + read media
 * round-trip.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { FastCommentsFeed } from '../../src/components/feed';
import { FeedPostComposer } from '../../src/components/feed-post-composer';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { clearAlerts } from '../framework/harness/alert-helper';
import type { FastCommentsCallbacks } from '../../src/types';

interface TestInstanceLike {
    props: Record<string, unknown>;
    parent: TestInstanceLike | null;
}

function pressViaProp(element: TestInstanceLike) {
    let cursor: TestInstanceLike | null = element;
    while (cursor) {
        const onPress = cursor.props?.onPress;
        if (typeof onPress === 'function') {
            const fn = onPress as () => void;
            act(() => {
                fn();
            });
            return;
        }
        cursor = cursor.parent;
    }
    throw new Error('No onPress prop found in the ancestor chain');
}

function changeTextViaProp(element: TestInstanceLike, value: string) {
    const onChangeText = element.props?.onChangeText;
    if (typeof onChangeText !== 'function') {
        throw new Error('Element does not have an onChangeText prop');
    }
    const fn = onChangeText as (v: string) => void;
    act(() => {
        fn(value);
    });
}

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

const REMOTE_IMAGE_URL = 'https://placehold.co/400x300/png';

maybe('Feed media-attach (dual-instance)', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('attaches a preview chip and the peer renders the gallery', async () => {
        ctx = await setupTestContext({ emailPrefix: 'feedmedia', urlIdLabel: 'feedmedia' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB });

        const callbacksB: FastCommentsCallbacks = {
            // Returning an http URL is the documented shortcut path: the SDK
            // wraps it into a single-asset FeedPostMediaItem instead of
            // hitting /upload-image.
            pickImage: async () => REMOTE_IMAGE_URL,
        };
        const a = render(<FastCommentsFeed config={cfgA} />);
        const b = render(<FastCommentsFeed config={cfgB} callbacks={callbacksB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        await pollUntil(
            () =>
                !!b.queryByTestId('feedPostCreate') &&
                !!b.queryByTestId('toolbarImageButton'),
            { timeoutMs: 15000, label: 'B composer ready' }
        );
        await pollUntil(
            () => !!a.queryByTestId('feedPostCreate') && !!a.queryByTestId('recyclerViewFeed'),
            { timeoutMs: 15000, label: 'A composer + recycler ready' }
        );
        await sleep(500);

        // 1. Tap the toolbar image button. The host's pickImage returns the
        // remote URL, which the composer attaches to the post (preview chip
        // feedComposerAttachedMedia-0) rather than inserting into the text.
        pressViaProp(b.getByTestId('toolbarImageButton'));
        await pollUntil(() => !!b.queryByTestId('feedComposerAttachedMedia-0'), {
            timeoutMs: 5000,
            label: 'B preview chip visible',
        });

        // 2. Submit a post with media. We supply a title too so the test stays
        // robust if any future server-side validation requires content.
        const bText = `Feed media post from B ${Date.now()}`;
        changeTextViaProp(b.getByTestId('postTitleEditText'), bText);
        pressViaProp(b.getByTestId('submitPostButton'));

        await pollUntil(() => !!b.queryByText(bText), {
            timeoutMs: 15000,
            label: "B sees its own post (locally inserted)",
        });

        // 3. A receives the new-posts banner via WS, taps it, and renders
        // the gallery for the freshly-loaded post.
        await pollUntil(() => !!a.queryByTestId('newPostsBanner'), {
            timeoutMs: 15000,
            label: 'A sees newPostsBanner via WS',
        });
        pressViaProp(a.getByTestId('newPostsBanner'));

        await pollUntil(() => !!a.queryByText(bText), {
            timeoutMs: 15000,
            label: "A sees B's post text after banner tap",
        });

        // The gallery testID is `feedPostMedia-{postId}`. We don't know the id
        // up-front, so look up any node whose testID starts with that prefix.
        await pollUntil(
            () => {
                const nodes = a.UNSAFE_root.findAll(
                    (n: { props: { testID?: string } }) =>
                        typeof n.props.testID === 'string' &&
                        n.props.testID.startsWith('feedPostMedia-')
                );
                return nodes.length > 0;
            },
            { timeoutMs: 15000, label: 'A renders the post media gallery' }
        );
    }, 180000);

    it('standalone composer toolbar image + GIF buttons attach media to the post', async () => {
        ctx = await setupTestContext({ emailPrefix: 'feedtoolbar', urlIdLabel: 'feed-toolbar-media' });
        const sso = ctx.ssoFor('userA');
        const cfg = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: sso });

        // Mount the composer in self-managed (config) mode so it builds its own
        // store + loads translations, without a FastCommentsFeed (whose loading
        // skeleton would be unrelated to what we're asserting). Host callbacks
        // return public http URLs: the image/GIF toolbar buttons hand these to
        // addMedia (via onAttachMedia), which wraps each as a single-asset remote
        // media item - no /upload-image round-trip.
        const composer = render(
            <FeedPostComposer
                config={cfg}
                pickImage={async () => REMOTE_IMAGE_URL}
                pickGIF={async () => REMOTE_IMAGE_URL}
            />
        );
        ctx.onTeardown(() => composer.unmount());

        // The image/GIF buttons live in the shared WYSIWYG toolbar (same as the
        // comment editor); attaching to the post is the feed-only behavior.
        await pollUntil(() => !!composer.queryByTestId('toolbarImageButton'), {
            timeoutMs: 15000,
            label: 'composer image button',
        });
        pressViaProp(composer.getByTestId('toolbarImageButton'));
        await pollUntil(() => !!composer.queryByTestId('feedComposerAttachedMedia-0'), {
            timeoutMs: 5000,
            label: 'image preview chip',
        });

        pressViaProp(composer.getByTestId('toolbarGifButton'));
        await pollUntil(() => !!composer.queryByTestId('feedComposerAttachedMedia-1'), {
            timeoutMs: 5000,
            label: 'gif preview chip',
        });
    }, 120000);
});
