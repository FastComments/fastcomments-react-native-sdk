/**
 * Ports MentionUITests.java -> React Native SDK.
 *
 * Verifies the @mention typeahead popup: typing "@<query>" in the comment input
 * triggers a server-side user search; tapping a result inserts the mention; a
 * trailing space dismisses the popup.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil } from '../framework/harness/poll';
import { seedComment } from '../framework/api/comments-rest';
import { clearAlerts } from '../framework/harness/alert-helper';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Mention UI tests', () => {
    let ctx: TestContext;

    beforeEach(() => {
        clearAlerts();
    });

    afterEach(async () => {
        await teardownTestContext(ctx);
    });

    it('testMentionSearchAndSelect', async () => {
        ctx = await setupTestContext({ emailPrefix: 'mention-search', urlIdLabel: 'mention-search' });
        // Seed three commenters under distinct SSO users so the server-side
        // user search has results.
        const aliceSso = ctx.ssoFor('alice1');
        const bobSso = ctx.ssoFor('bob1');
        const carolSso = ctx.ssoFor('carol1');
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'Hello from Alice', ssoToken: aliceSso });
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'Hello from Bob', ssoToken: bobSso });
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'Hello from Carol', ssoToken: carolSso });

        const mentionerSso = ctx.ssoFor('mentioner');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: mentionerSso });

        const { getByTestId, queryByTestId, queryAllByTestId, queryByText, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!getByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'commentInput visible',
        });

        // Type "@Tester a" to trigger the mention search.
        fireEvent.changeText(getByTestId('commentInput'), '@Tester a');

        // Wait for the popup to appear.
        await pollUntil(() => !!queryByTestId('mentionPopup'), {
            timeoutMs: 15000,
            label: 'mentionPopup visible',
        });

        // Wait for at least one mentionItem-* to render.
        await pollUntil(
            () => queryAllByTestId(/^mentionItem-/).length > 0,
            { timeoutMs: 15000, label: 'mentionItem appeared' }
        );

        // Tap the first item.
        const items = queryAllByTestId(/^mentionItem-/);
        expect(items.length).toBeGreaterThan(0);
        fireEvent.press(items[0]);

        // After selection, the popup should be dismissed.
        await pollUntil(() => queryByTestId('mentionPopup') === null, {
            timeoutMs: 5000,
            label: 'mentionPopup dismissed after select',
        });

        // The input should now contain the mentioned username (or display name).
        // The seeded SSO users have username "Tester alice1" / "Tester bob1" / "Tester carol1".
        // We assert the input now references at least one of them.
        const input = getByTestId('commentInput');
        const inputValue: string = (input.props && input.props.value) || '';
        const insertedMention = /Tester (alice1|bob1|carol1)/.test(inputValue);
        expect(insertedMention).toBe(true);

        // Submit and verify the comment lands in the list with the mentioned username.
        fireEvent.press(getByTestId('sendButton'));
        await pollUntil(
            () => {
                const aliceMatch = queryByText(/Tester alice1/);
                const bobMatch = queryByText(/Tester bob1/);
                const carolMatch = queryByText(/Tester carol1/);
                return !!(aliceMatch || bobMatch || carolMatch);
            },
            { timeoutMs: 15000, label: 'submitted comment shows mentioned username' }
        );
    }, 120000);

    it('testMentionPopupDismissesOnSpace', async () => {
        ctx = await setupTestContext({ emailPrefix: 'mention-space', urlIdLabel: 'mention-space' });
        const aliceSso = ctx.ssoFor('alice1');
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'Hello from Alice', ssoToken: aliceSso });

        const mentionerSso = ctx.ssoFor('mentioner');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: mentionerSso });

        const { getByTestId, queryByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!getByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'commentInput visible',
        });

        // Trigger the mention search.
        fireEvent.changeText(getByTestId('commentInput'), '@Tester a');
        await pollUntil(() => !!queryByTestId('mentionPopup'), {
            timeoutMs: 15000,
            label: 'mentionPopup visible',
        });

        // Type a trailing space; popup should be dismissed.
        fireEvent.changeText(getByTestId('commentInput'), '@Tester a ');
        await pollUntil(() => queryByTestId('mentionPopup') === null, {
            timeoutMs: 5000,
            label: 'mentionPopup dismissed after trailing space',
        });
    }, 120000);
});
