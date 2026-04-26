/**
 * Feed follow pill (per-viewer state).
 *
 * Two SDK instances. A creates a post. B sees A's post via the new-feed-post
 * banner; B taps the follow pill twice to verify the label flips, then
 * verifies B does NOT see a follow pill on B's own posts.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { FastCommentsFeed } from '../../src/components/feed';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { clearAlerts } from '../framework/harness/alert-helper';

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

interface LocalizationFile {
    [key: string]: string;
}

/**
 * Read FEED_FOLLOW / FEED_FOLLOWING from the source-of-truth en_us.json. The
 * production translation cache may not yet have these keys; the component
 * fetches them off the live server and falls back to undefined when missing.
 * This test installs an in-process fetch interceptor (see installTranslationStub
 * below) so the SDK sees the keys even when the upstream cache is stale.
 */
function loadLocalEnUs(): LocalizationFile {
    // CommonJS require() is the simplest path to read the en_us.json from the
    // sibling fastcomments-localization repo without pulling in `fs`/`path`
    // type declarations that aren't loaded into the tests-ui tsconfig. The
    // worktree layout adds extra hops; try the layouts we ship in.
    const candidatePaths = [
        '../../../../../../fastcomments-localization/text/widgets/comment-ui/en_us.json',
        '../../../fastcomments-localization/text/widgets/comment-ui/en_us.json',
    ];
    let lastErr: unknown;
    for (const p of candidatePaths) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const json = require(p) as LocalizationFile;
            if (json && typeof json === 'object') return json;
        } catch (e) {
            lastErr = e;
        }
    }
    throw new Error(
        'Could not locate fastcomments-localization en_us.json. Last error: ' +
            (lastErr as Error)?.message
    );
}

interface TranslationsBody {
    status: string;
    translations: Record<string, string>;
}

/**
 * Wrap global fetch so any GET to `/translations/widgets/comment-ui` returns a
 * payload that contains the local FEED_FOLLOW / FEED_FOLLOWING keys, merged on
 * top of whatever the upstream server returned. Restores the original fetch on
 * teardown.
 */
function installTranslationStub(localKeys: LocalizationFile): () => void {
    const orig = globalThis.fetch.bind(globalThis);
    const augment = async (url: string, init?: RequestInit): Promise<Response> => {
        const upstream = await orig(url, init);
        if (!upstream.ok) return upstream;
        const cloned = upstream.clone();
        const body = (await cloned.json()) as TranslationsBody;
        const merged: Record<string, string> = {
            ...(body.translations ?? {}),
            FEED_FOLLOW: localKeys.FEED_FOLLOW,
            FEED_FOLLOWING: localKeys.FEED_FOLLOWING,
            FEED_FOLLOW_FAILED: localKeys.FEED_FOLLOW_FAILED,
            FEED_EMPTY: localKeys.FEED_EMPTY ?? body.translations?.FEED_EMPTY ?? '',
            FEED_NEW_POST_BANNER: localKeys.FEED_NEW_POST_BANNER ?? body.translations?.FEED_NEW_POST_BANNER ?? '',
            FEED_NEW_POST_BANNER_PLURAL: localKeys.FEED_NEW_POST_BANNER_PLURAL ?? body.translations?.FEED_NEW_POST_BANNER_PLURAL ?? '',
            FEED_COMPOSER_TITLE_PLACEHOLDER: localKeys.FEED_COMPOSER_TITLE_PLACEHOLDER ?? body.translations?.FEED_COMPOSER_TITLE_PLACEHOLDER ?? '',
            FEED_COMPOSER_CONTENT_PLACEHOLDER: localKeys.FEED_COMPOSER_CONTENT_PLACEHOLDER ?? body.translations?.FEED_COMPOSER_CONTENT_PLACEHOLDER ?? '',
            FEED_SUBMIT_POST: localKeys.FEED_SUBMIT_POST ?? body.translations?.FEED_SUBMIT_POST ?? '',
        };
        const responseBody: TranslationsBody = {
            status: body.status ?? 'success',
            translations: merged,
        };
        return new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    };
    const wrapped: typeof fetch = (input, init) => {
        const url =
            typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : (input as Request).url;
        if (url.includes('/translations/widgets/comment-ui')) {
            return augment(url, init);
        }
        return orig(input, init);
    };
    globalThis.fetch = wrapped;
    return () => {
        globalThis.fetch = orig;
    };
}

function findFollowPillTestIds(tree: ReturnType<typeof render>): string[] {
    const matches = tree.queryAllByTestId(/^feedFollowPill-/);
    const ids: string[] = [];
    for (const node of matches) {
        const tid = (node.props as { testID?: unknown } | undefined)?.testID;
        if (typeof tid === 'string') ids.push(tid);
    }
    return ids;
}

function findFeedPostRowIds(tree: ReturnType<typeof render>): string[] {
    const matches = tree.queryAllByTestId(/^feedPostRow-/);
    const ids: string[] = [];
    for (const node of matches) {
        const tid = (node.props as { testID?: unknown } | undefined)?.testID;
        if (typeof tid === 'string') ids.push(tid);
    }
    return ids;
}

maybe('Feed follow pill', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('B taps follow on A post: flips Follow -> Following -> Follow; no pill on B own post', async () => {
        const localKeys = loadLocalEnUs();
        const followLabel = localKeys.FEED_FOLLOW;
        const followingLabel = localKeys.FEED_FOLLOWING;
        expect(typeof followLabel).toBe('string');
        expect(followLabel.length).toBeGreaterThan(0);
        expect(typeof followingLabel).toBe('string');
        expect(followingLabel.length).toBeGreaterThan(0);
        expect(followLabel).not.toBe(followingLabel);

        const restoreFetch = installTranslationStub(localKeys);
        ctx = await setupTestContext({ emailPrefix: 'follow', urlIdLabel: 'follow' });
        ctx.onTeardown(restoreFetch);

        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB });
        const a = render(<FastCommentsFeed config={cfgA} />);
        const b = render(<FastCommentsFeed config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        await pollUntil(
            () => !!a.queryByTestId('postContentEditText') && !!a.queryByTestId('recyclerViewFeed'),
            { timeoutMs: 15000, label: 'A composer + recycler ready' }
        );
        await pollUntil(
            () => !!b.queryByTestId('postContentEditText') && !!b.queryByTestId('recyclerViewFeed'),
            { timeoutMs: 15000, label: 'B composer + recycler ready' }
        );
        await sleep(500);

        // === A posts; B sees the post via banner tap. ===
        const aText = `Follow-test post from A ${Date.now()}`;
        changeTextViaProp(a.getByTestId('postContentEditText'), aText);
        pressViaProp(a.getByTestId('submitPostButton'));

        await pollUntil(() => !!a.queryByText(aText), {
            timeoutMs: 15000,
            label: "A sees its own post (locally inserted)",
        });

        await pollUntil(() => !!b.queryByTestId('newPostsBanner'), {
            timeoutMs: 15000,
            label: "B sees newPostsBanner via WS",
        });
        pressViaProp(b.getByTestId('newPostsBanner'));
        await pollUntil(() => !!b.queryByText(aText), {
            timeoutMs: 15000,
            label: "B sees A's post text after banner tap",
        });

        // Locate the follow pill on B's tree for A's post. We don't know the
        // post id ahead of time, so scan all `feedFollowPill-*` nodes.
        await pollUntil(() => findFollowPillTestIds(b).length === 1, {
            timeoutMs: 5000,
            label: 'B sees exactly one follow pill (for A post)',
        });

        const [pillId] = findFollowPillTestIds(b);

        // Initial: pill shows translations.FEED_FOLLOW.
        await pollUntil(() => !!b.queryByText(followLabel), {
            timeoutMs: 5000,
            label: 'pill initially shows FEED_FOLLOW',
        });

        // Tap to follow -> flip to translations.FEED_FOLLOWING.
        pressViaProp(b.getByTestId(pillId));
        await pollUntil(
            () => !!b.queryByText(followingLabel) && !b.queryByText(followLabel),
            { timeoutMs: 5000, label: 'pill flipped to FEED_FOLLOWING' }
        );

        // Tap again -> revert to translations.FEED_FOLLOW.
        pressViaProp(b.getByTestId(pillId));
        await pollUntil(
            () => !!b.queryByText(followLabel) && !b.queryByText(followingLabel),
            { timeoutMs: 5000, label: 'pill reverted to FEED_FOLLOW' }
        );

        // === B posts; B's tree must NOT show a follow pill on B's own post. ===
        await sleep(500);
        const bText = `Follow-test post from B ${Date.now()}`;
        changeTextViaProp(b.getByTestId('postContentEditText'), bText);
        await sleep(100);
        pressViaProp(b.getByTestId('submitPostButton'));

        await pollUntil(() => !!b.queryByText(bText), {
            timeoutMs: 15000,
            label: "B sees its own post (locally inserted)",
        });

        // After B's post lands at head, B's tree should still have only ONE
        // follow pill (for A's post, not B's). Verifies "no pill on own posts".
        await sleep(300);
        const pillIdsAfter = findFollowPillTestIds(b);
        expect(pillIdsAfter.length).toBe(1);
        const rowIds = findFeedPostRowIds(b);
        expect(rowIds.length).toBe(2);
    }, 180000);
});
