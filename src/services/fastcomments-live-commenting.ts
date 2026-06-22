import { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';
import { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import type { SortDirections } from 'fastcomments-sdk';
import {
    GetCommentsResponse,
    FastCommentsCallbacks,
    ImageAssetConfig,
    RNComment,
} from '../types';
import { getAPIHost } from './api-host';
import { mergeSimpleSSO } from './sso';
import { handleNewCustomConfig } from './custom-config';
import { cleanupSubscriber, persistSubscriberState } from './live';
import { getDefaultImageAssets } from '../resources';
import { showError } from './show-error';
import { createFastCommentsStore } from '../store/create-store';
import { ensureTranslationComponentLoaded } from './translations';
import type { FastCommentsStore } from '../store/types';

interface FastCommentsInternalState {
    isFirstRequest: boolean;
    lastGenDate?: number;
    lastComments: RNComment[];
}

/** Chat-style rendering: chronological order with new messages at the bottom. */
export function isLiveChatStyle(config: Pick<FastCommentsCommentWidgetConfig, 'defaultSortDirection' | 'newCommentsToBottom'>): boolean {
    return config.defaultSortDirection === 'NF' && !!config.newCommentsToBottom;
}

export class FastCommentsLiveCommentingService {
    private readonly store: FastCommentsStore;
    private readonly internalState: FastCommentsInternalState;
    private readonly callbacks?: FastCommentsCallbacks;

    constructor(store: FastCommentsStore, callbacks?: FastCommentsCallbacks) {
        this.store = store;
        this.callbacks = callbacks;
        this.internalState = {
            isFirstRequest: true,
            lastGenDate: undefined,
            lastComments: [],
        };
    }

    destroy() {
        cleanupSubscriber(this.store.getState().instanceId);
    }

    resetForNewContext() {
        this.internalState.isFirstRequest = true;
        this.internalState.lastGenDate = undefined;
        this.internalState.lastComments = [];
    }

    static createStoreFromConfig(
        config: FastCommentsCommentWidgetConfig,
        assets?: ImageAssetConfig
    ): FastCommentsStore {
        mergeSimpleSSO(config);
        const apiHost = getAPIHost(config);
        const sdk = new FastCommentsServerSDK({ basePath: apiHost });
        const store = createFastCommentsStore({
            apiHost,
            sdk,
            wsHost:
                config.wsHost ??
                (config.region === 'eu'
                    ? 'wss://ws-eu.fastcomments.com'
                    : 'wss://ws.fastcomments.com'),
            config: config as any,
            currentUser:
                !config.sso && config.simpleSSO && config.simpleSSO.username
                    ? (config.simpleSSO as any)
                    : (undefined as any),
            imageAssets: assets ?? getDefaultImageAssets(),
            isDemo: false,
            instanceId: Math.random() + '.' + Date.now(),
            translations: {},
        });
        const state = store.getState();
        state.setSortDirection(config.defaultSortDirection ?? 'MR');
        state.setPage(typeof config.startingPage === 'number' ? config.startingPage : 0);
        // Like the web widget, toggled widgets start collapsed.
        state.setCommentsVisible(!(config.hideCommentsUnderCountTextFormat || config.useShowCommentsToggle));
        if (config.sso) {
            state.setSSOConfigString(JSON.stringify(config.sso));
        }
        return store;
    }

    async fetchRemoteState(isPrev: boolean): Promise<void> {
        const store = this.store;
        const internalState = this.internalState;
        const config = store.getState().config;
        config.onInit && config.onInit();
        if (config.urlId === undefined || config.urlId === null) {
            throw new Error(
                'FastComments initialization failure: Configuration parameter "urlId" must be defined!'
            );
        }

        const isActivityFeed = config.tenantId === 'all' && config.userId;

        try {
            let response: GetCommentsResponse;
            const sdk = store.getState().sdk;
            const ssoConfigString = store.getState().ssoConfigString;
            const isFirstPageLoad = internalState.lastComments.length === 0;
            if (isActivityFeed) {
                // The activity feed (tenantId === 'all') routes through
                // /comments-for-user which keys off userId rather than urlId.
                const apiResponse = await sdk.publicApi.getCommentsForUserRaw({
                    userId: config.userId,
                    page: store.getState().page,
                    direction: store.getState().sortDirection as SortDirections,
                    includei10n: isFirstPageLoad ? true : undefined,
                    locale: isFirstPageLoad ? config.locale : undefined,
                });
                response = (await apiResponse.raw.json()) as GetCommentsResponse;
            } else {
                const apiResponse = await sdk.publicApi.getCommentsPublicRaw({
                    tenantId: config.tenantId!,
                    urlId: config.urlId,
                    page: store.getState().page,
                    direction: store.getState().sortDirection as SortDirections,
                    sso: ssoConfigString,
                    includeConfig: internalState.isFirstRequest ? true : undefined,
                    countAll: config.countAll ? true : undefined,
                    includei10n: isFirstPageLoad ? true : undefined,
                    locale: isFirstPageLoad ? config.locale : undefined,
                    includeNotificationCount: internalState.isFirstRequest ? true : undefined,
                    useFullTranslationIds: isFirstPageLoad ? true : undefined,
                    fetchPageForCommentId: config.jumpToId,
                });
                response = (await apiResponse.raw.json()) as GetCommentsResponse;
            }

            const isRateLimited = response.code === 'rate-limited';

            handleNewCustomConfig(store, response.customConfig);

            const state = store.getState();
            if (isRateLimited) {
                state.setBlockingErrorMessage(state.translations.EXCEEDED_QUOTA);
            } else if (response.code === 'domain-unauthorized') {
                state.setBlockingErrorMessage(state.translations.DOMAIN_NOT_AUTHORIZED);
            } else if (response.code === 'unauthorized-page') {
                state.setBlockingErrorMessage(state.translations.UNAUTHORIZED_VIEW_THIS_PAGE);
            } else if (response.code === 'invalid-tenant') {
                state.setBlockingErrorMessage(state.translations.INVALID_TENANT);
            } else if (response.code === 'malformed-sso') {
                let msg = state.translations.MALFORMED_SSO;
                if (response.reason && response.reason !== 'SSO Request Malformed') {
                    msg += ' ' + response.reason;
                }
                state.setBlockingErrorMessage(msg);
            } else if (response.isCommentsHidden) {
                state.setBlockingErrorMessage(state.translations.BILLING_INFO_INV_60_DAYS);
            }

            if (typeof response.pageNumber === 'number') {
                state.setPage(response.pageNumber);
                state.addPageLoaded(response.pageNumber);
            }

            if (typeof response.notificationCount === 'number') {
                state.setNotificationsCount(response.notificationCount);
            }

            const responseComments = (response.comments || []) as RNComment[];
            const chatStyle = isLiveChatStyle(config);
            if (chatStyle) responseComments.reverse();

            if (typeof response.hasMore === 'boolean') state.setHasMore(response.hasMore);

            let mergedComments: RNComment[];
            if (!response.includesPastPages) {
                if (isPrev) {
                    mergedComments = responseComments.concat(internalState.lastComments);
                } else if (state.page > 0) {
                    mergedComments = chatStyle
                        ? responseComments.concat(internalState.lastComments)
                        : internalState.lastComments.concat(responseComments);
                } else {
                    mergedComments = responseComments;
                }
            } else {
                mergedComments = responseComments;
            }

            internalState.lastComments = mergedComments;
            state.replaceAll(mergedComments, !!config.collapseReplies);
            state.setCommentCountOnClient(mergedComments.length);

            if (response.moderatingTenantIds) {
                state.setModeratingTenantIds(response.moderatingTenantIds);
            }

            if (response.user) {
                state.setCurrentUser(response.user as any);
                this.callbacks?.onAuthenticationChange &&
                    this.callbacks.onAuthenticationChange('user-set', response.user as any, null);
            }

            if (!state.commentsVisible) {
                state.setCommentsVisible(
                    !(config.hideCommentsUnderCountTextFormat || config.useShowCommentsToggle)
                );
            }

            if (config.jumpToId) {
                state.ensureRepliesOpenTo(config.jumpToId);
            }

            state.setIsSiteAdmin(!!response.isSiteAdmin);
            if (response.isSiteAdmin) {
                // Admins get the moderation menu (approve/spam/ban/badges/view-by-IP).
                // Its labels live in the `comment-ui-moderation` component, which the
                // base comment-ui bundle does not include - load it eagerly so the
                // menu items render with copy instead of empty strings.
                void ensureTranslationComponentLoaded(store, 'comment-ui-moderation');
            }
            state.setHasBillingIssue(!!response.hasBillingIssue);
            internalState.lastGenDate = response.lastGenDate;
            if (response.commentCount !== undefined && Number.isFinite(response.commentCount)) {
                state.setCommentCountOnServer(response.commentCount);
                this.callbacks?.commentCountUpdated &&
                    this.callbacks.commentCountUpdated(response.commentCount);
            }

            if (config.jumpToId) {
                state.mergeConfig({ jumpToId: undefined });
                if (typeof response.pageNumber === 'number') state.setPage(response.pageNumber);
            }

            if (
                !isRateLimited &&
                internalState.isFirstRequest &&
                response.urlIdWS &&
                response.tenantIdWS &&
                response.userIdWS
            ) {
                state.setPresencePollState(response.presencePollState);
                persistSubscriberState(store, response.urlIdWS, response.tenantIdWS, response.userIdWS);
            }
            internalState.isFirstRequest = false;
            config.onCommentsRendered && config.onCommentsRendered((response.comments || []) as any);
        } catch (e) {
            console.error(e);
            const translations = store.getState().translations ?? {
                DISMISS: 'Dismiss',
                ERROR_MESSAGE: 'Whoops! Something went wrong. Please try again later.',
            };
            const message =
                translations.ERROR_MESSAGE ??
                'Whoops! Something went wrong. Please try again later.';
            showError(':(', message, translations.DISMISS, this.callbacks?.onError);
        }
    }
}
