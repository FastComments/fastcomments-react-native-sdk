/**
 * Verifies the online presence indicator renders as a badge INSIDE the
 * commentRow of the authoring user's comment in the regular comment widget
 * (not just live-chat mode). Two SDK instances run concurrently so each has
 * a live WebSocket; A authors a comment, B observes it and should see an
 * onlineIndicator-{userId} testID nested inside the matching commentRow.
 */
import React from 'react';
import { render, within } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil } from '../framework/harness/poll';
import { seedComment } from '../framework/api/comments-rest';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Avatar online indicator (regular comment widget)', () => {
    let ctx: TestContext;

    afterEach(async () => teardownTestContext(ctx));

    it('renders onlineIndicator inside the authoring user commentRow', async () => {
        ctx = await setupTestContext({
            emailPrefix: 'avatar-online',
            urlIdLabel: 'avatar-online',
        });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');

        // A seeds a comment; both A and B will subscribe to live presence so
        // each sees the other as online.
        const seededId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Avatar badge target from A',
            ssoToken: ssoA,
        });

        const overrides = { showLiveRightAway: true };
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA, overrides });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB, overrides });

        const a = render(<FastCommentsLiveCommenting config={cfgA} />);
        const b = render(<FastCommentsLiveCommenting config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        // Both trees mount and B sees the seeded comment.
        await pollUntil(() => !!b.queryByText('Avatar badge target from A'), {
            timeoutMs: 15000,
            label: "B sees A's seeded comment",
        });

        // Locate the commentRow for the seeded comment in B's tree, then
        // assert that the onlineIndicator for A's userId lives inside that row.
        // We don't know A's tenant-prefixed userIdWS up front, so we use a
        // regex match scoped via within() to the row instance.
        await pollUntil(
            () => {
                const row = b.queryByTestId(`commentRow-${seededId}`);
                if (!row) return false;
                const indicator = within(row).queryByTestId(/^onlineIndicator-/);
                return !!indicator;
            },
            {
                timeoutMs: 30000,
                label: "onlineIndicator nested inside A's commentRow on B's tree",
            }
        );
    }, 120000);
});
