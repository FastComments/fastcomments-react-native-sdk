/**
 * Dedicated SSO coverage. Every other spec authenticates with Secure SSO
 * tokens implicitly; these tests assert the SSO-specific behaviors directly:
 *
 * 1. Secure SSO: the signed user is treated as fully authenticated (top bar
 *    identity, no guest form, comment attributed to the SSO username).
 * 2. Simple SSO: an unsigned { username, email } user can comment and is
 *    shown as the session identity.
 * 3. The SSO login gate: with an SSO config but no user, the composer is
 *    replaced by a login button that fires the host's loginCallback.
 * 4. The SSO logout callback fires from the Log Out menu.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { textOf } from '../framework/harness/text-of';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('SSO', () => {
    let ctx: TestContext;

    afterEach(async () => teardownTestContext(ctx));

    it('testSecureSSOSessionIsAuthenticated', async () => {
        ctx = await setupTestContext({ emailPrefix: 'sso-secure', urlIdLabel: 'sso-secure' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });
        const { getByTestId, queryByTestId, queryByText, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        // The signed user's identity lands in the top bar.
        await pollUntil(() => {
            const node = queryByTestId('topBarUsername');
            return !!node && textOf(node).includes('Tester userA');
        }, { timeoutMs: 15000, label: 'secure SSO username in top bar' });

        // Focusing the composer must NOT reveal the guest name/email form.
        fireEvent(getByTestId('commentInput'), 'focus');
        await sleep(500);
        expect(queryByTestId('authInputForm')).toBeNull();

        // And the user can post, attributed to the SSO identity.
        const text = `Secure SSO comment ${Date.now()}`;
        fireEvent.changeText(getByTestId('commentInput'), text);
        fireEvent.press(getByTestId('sendButton'));
        await pollUntil(() => !!queryByText(text), { timeoutMs: 15000, label: 'secure SSO comment visible' });
    }, 90000);

    it('testSimpleSSOUserCanComment', async () => {
        ctx = await setupTestContext({ emailPrefix: 'sso-simple', urlIdLabel: 'sso-simple' });
        const config = buildSDKConfig({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            overrides: {
                simpleSSO: {
                    username: 'SimpleSSOTester',
                    email: 'simple-sso-tester@fctest.com',
                    avatar: '',
                },
            },
        });
        const { getByTestId, queryAllByText, queryByTestId, queryByText, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => {
            const node = queryByTestId('topBarUsername');
            return !!node && textOf(node).includes('SimpleSSOTester');
        }, { timeoutMs: 15000, label: 'simple SSO username in top bar' });

        fireEvent(getByTestId('commentInput'), 'focus');
        await sleep(500);
        expect(queryByTestId('authInputForm')).toBeNull();

        const text = `Simple SSO comment ${Date.now()}`;
        fireEvent.changeText(getByTestId('commentInput'), text);
        fireEvent.press(getByTestId('sendButton'));
        await pollUntil(() => !!queryByText(text), { timeoutMs: 15000, label: 'simple SSO comment visible' });
        // Attributed to the simple SSO identity in the comment row too (the
        // name appears in both the top bar and the new comment row).
        await pollUntil(() => queryAllByText('SimpleSSOTester').length >= 2, {
            timeoutMs: 5000,
            label: 'commenter name rendered in the comment row',
        });
    }, 90000);

    it('testSSOLoginGateFiresLoginCallback', async () => {
        ctx = await setupTestContext({ emailPrefix: 'sso-gate', urlIdLabel: 'sso-gate' });
        const loginCallback = jest.fn();
        const config = buildSDKConfig({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            overrides: { sso: { loginCallback } },
        });
        const { queryByTestId, getByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        // With SSO configured but no user, the composer is replaced by the
        // login gate; no guest comment input is offered.
        await pollUntil(() => !!queryByTestId('ssoLoginButton'), {
            timeoutMs: 15000,
            label: 'SSO login button rendered',
        });
        expect(queryByTestId('commentInput')).toBeNull();
        fireEvent.press(getByTestId('ssoLoginButton'));
        expect(loginCallback).toHaveBeenCalled();
    }, 90000);

    it('testSSOLogoutCallbackFiresFromMenu', async () => {
        ctx = await setupTestContext({ emailPrefix: 'sso-logout', urlIdLabel: 'sso-logout' });
        const logoutCallback = jest.fn();
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });
        if (!config.sso) throw new Error('expected sso config');
        config.sso.logoutCallback = logoutCallback;
        const { getByTestId, queryByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId('topBarUsername'), {
            timeoutMs: 15000,
            label: 'authenticated top bar rendered',
        });
        fireEvent.press(getByTestId('modalMenuOpenButton'));
        await pollUntil(() => !!queryByTestId('menuItem-logout'), {
            timeoutMs: 5000,
            label: 'logout menu item visible',
        });
        fireEvent.press(getByTestId('menuItem-logout'));
        await pollUntil(() => logoutCallback.mock.calls.length > 0, {
            timeoutMs: 10000,
            label: 'logoutCallback invoked',
        });
    }, 90000);
});
