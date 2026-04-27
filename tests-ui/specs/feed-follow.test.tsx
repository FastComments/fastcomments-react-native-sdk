/**
 * Feed follow pill (host-supplied state via FollowStateProvider).
 *
 * The SDK no longer makes any follow-REST calls. The host owns follow state
 * and supplies it through a typed provider, mirroring Android. These tests
 * stub the provider with an in-memory Set and verify the pill flips, hides
 * on the viewer's own posts, and rebinds when the host calls
 * `feedRef.current.invalidateFollowState()`.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { FastCommentsFeed, FastCommentsFeedHandle } from '../../src/components/feed';
import type { FollowStateProvider, FollowUser } from '../../src/types/follow-state-provider';
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

function loadLocalEnUs(): LocalizationFile {
    // Feed-specific keys (FEED_FOLLOW, FEED_FOLLOWING, etc.) live in their
    // own widgets/feed-ui namespace; comment-ui still owns the cross-cutting
    // keys (CANCEL etc.). We merge both so test-side lookups don't have to
    // know which namespace a key lives in.
    const namespaces = ['feed-ui', 'comment-ui'];
    const merged: LocalizationFile = {};
    let loadedAny = false;
    let lastErr: unknown;
    for (const ns of namespaces) {
        const candidatePaths = [
            `../../../../../../fastcomments-localization/text/widgets/${ns}/en_us.json`,
            `../../../fastcomments-localization/text/widgets/${ns}/en_us.json`,
        ];
        for (const p of candidatePaths) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const json = require(p) as LocalizationFile;
                if (json && typeof json === 'object') {
                    Object.assign(merged, json);
                    loadedAny = true;
                    break;
                }
            } catch (e) {
                lastErr = e;
            }
        }
    }
    if (!loadedAny) {
        throw new Error(
            'Could not locate fastcomments-localization en_us.json. Last error: ' +
                (lastErr as Error)?.message
        );
    }
    return merged;
}

interface TranslationsBody {
    status: string;
    translations: Record<string, string>;
}

/**
 * Wrap global fetch so any GET to `/translations/widgets/{comment-ui,feed-ui}`
 * returns a payload that contains the local feed translation keys merged on
 * top of whatever the upstream server returned. Falls back to fully
 * synthesizing a 200 response when the upstream is non-OK (the feed-ui
 * namespace may not be deployed to production yet, so we don't want a 500
 * there to drop the keys the feed needs to render). Restores the original
 * fetch on teardown.
 */
function installTranslationStub(localKeys: LocalizationFile): () => void {
    const orig = globalThis.fetch.bind(globalThis);
    const synthesizeMerged = (existing: Record<string, string>): Record<string, string> => ({
        ...existing,
        FEED_FOLLOW: localKeys.FEED_FOLLOW,
        FEED_FOLLOWING: localKeys.FEED_FOLLOWING,
        FEED_EMPTY: localKeys.FEED_EMPTY ?? existing.FEED_EMPTY ?? '',
        FEED_NEW_POST_BANNER: localKeys.FEED_NEW_POST_BANNER ?? existing.FEED_NEW_POST_BANNER ?? '',
        FEED_NEW_POST_BANNER_PLURAL: localKeys.FEED_NEW_POST_BANNER_PLURAL ?? existing.FEED_NEW_POST_BANNER_PLURAL ?? '',
        FEED_COMPOSER_TITLE_PLACEHOLDER: localKeys.FEED_COMPOSER_TITLE_PLACEHOLDER ?? existing.FEED_COMPOSER_TITLE_PLACEHOLDER ?? '',
        FEED_COMPOSER_CONTENT_PLACEHOLDER: localKeys.FEED_COMPOSER_CONTENT_PLACEHOLDER ?? existing.FEED_COMPOSER_CONTENT_PLACEHOLDER ?? '',
        FEED_SUBMIT_POST: localKeys.FEED_SUBMIT_POST ?? existing.FEED_SUBMIT_POST ?? '',
    });
    const augment = async (url: string, init?: RequestInit): Promise<Response> => {
        let upstreamBody: TranslationsBody | undefined;
        try {
            const upstream = await orig(url, init);
            if (upstream.ok) {
                upstreamBody = (await upstream.clone().json()) as TranslationsBody;
            }
        } catch {
            // upstream failed entirely (network error, bad port, etc.) - fall through
        }
        const merged = synthesizeMerged(upstreamBody?.translations ?? {});
        const responseBody: TranslationsBody = {
            status: upstreamBody?.status ?? 'success',
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
        if (
            url.includes('/translations/widgets/comment-ui') ||
            url.includes('/translations/widgets/feed-ui')
        ) {
            return augment(url, init);
        }
        return orig(input, init);
    };
    globalThis.fetch = wrapped;
    return () => {
        globalThis.fetch = orig;
    };
}

class StubFollowProvider implements FollowStateProvider {
    private readonly followed: Set<string> = new Set<string>();
    isFollowing(user: FollowUser): boolean {
        return this.followed.has(user.id);
    }
    async onFollowStateChangeRequested(
        user: FollowUser,
        desiredFollowing: boolean,
    ): Promise<{ following: boolean }> {
        if (desiredFollowing) this.followed.add(user.id);
        else this.followed.delete(user.id);
        return { following: desiredFollowing };
    }
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
        const providerA = new StubFollowProvider();
        const providerB = new StubFollowProvider();
        const a = render(<FastCommentsFeed config={cfgA} followStateProvider={providerA} />);
        const b = render(<FastCommentsFeed config={cfgB} followStateProvider={providerB} />);
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

        await pollUntil(() => findFollowPillTestIds(b).length === 1, {
            timeoutMs: 5000,
            label: 'B sees exactly one follow pill (for A post)',
        });

        const [pillId] = findFollowPillTestIds(b);

        await pollUntil(() => !!b.queryByText(followLabel), {
            timeoutMs: 5000,
            label: 'pill initially shows FEED_FOLLOW',
        });

        pressViaProp(b.getByTestId(pillId));
        await pollUntil(
            () => !!b.queryByText(followingLabel) && !b.queryByText(followLabel),
            { timeoutMs: 5000, label: 'pill flipped to FEED_FOLLOWING' }
        );

        pressViaProp(b.getByTestId(pillId));
        await pollUntil(
            () => !!b.queryByText(followLabel) && !b.queryByText(followingLabel),
            { timeoutMs: 5000, label: 'pill reverted to FEED_FOLLOW' }
        );

        await sleep(500);
        const bText = `Follow-test post from B ${Date.now()}`;
        changeTextViaProp(b.getByTestId('postContentEditText'), bText);
        await sleep(100);
        pressViaProp(b.getByTestId('submitPostButton'));

        await pollUntil(() => !!b.queryByText(bText), {
            timeoutMs: 15000,
            label: "B sees its own post (locally inserted)",
        });

        await sleep(300);
        const pillIdsAfter = findFollowPillTestIds(b);
        expect(pillIdsAfter.length).toBe(1);
        const rowIds = findFeedPostRowIds(b);
        expect(rowIds.length).toBe(2);
    }, 180000);

    it('invalidateFollowState() rebinds pill after external host state change', async () => {
        const localKeys = loadLocalEnUs();
        const followLabel = localKeys.FEED_FOLLOW;
        const followingLabel = localKeys.FEED_FOLLOWING;

        const restoreFetch = installTranslationStub(localKeys);
        ctx = await setupTestContext({ emailPrefix: 'followinv', urlIdLabel: 'followinv' });
        ctx.onTeardown(restoreFetch);

        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB });
        const providerB = new StubFollowProvider();
        const feedRef = React.createRef<FastCommentsFeedHandle>();

        const a = render(<FastCommentsFeed config={cfgA} />);
        const b = render(
            <FastCommentsFeed config={cfgB} followStateProvider={providerB} ref={feedRef} />,
        );
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

        const aText = `Follow-invalidate post from A ${Date.now()}`;
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

        await pollUntil(() => findFollowPillTestIds(b).length === 1, {
            timeoutMs: 5000,
            label: 'B sees exactly one follow pill (for A post)',
        });

        await pollUntil(() => !!b.queryByText(followLabel), {
            timeoutMs: 5000,
            label: 'pill initially shows FEED_FOLLOW (host stub set is empty)',
        });

        // Host externally mutates its follow store (e.g. action from elsewhere
        // in the app). Without an invalidate the pill won't notice. The pill
        // testID is `feedFollowPill-{postId}`; the post's authorId is resolved
        // by swapping isFollowing to a permissive predicate.
        providerB.isFollowing = (_user: FollowUser) => true;

        act(() => {
            feedRef.current?.invalidateFollowState();
        });

        await pollUntil(
            () => !!b.queryByText(followingLabel) && !b.queryByText(followLabel),
            { timeoutMs: 5000, label: 'pill rebound to FEED_FOLLOWING after invalidateFollowState' }
        );
    }, 180000);
});
