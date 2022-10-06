import {FastCommentsCommentWidgetConfig, FastCommentsWidgetComment} from "fastcomments-typescript";
import {FastCommentsState, GetCommentsResponse, FastCommentsCallbacks, ImageAssetConfig} from "../types";
import {createURLQueryString, getAPIHost, makeRequest} from "./http";
import {ensureRepliesOpenToComment, getCommentsTreeAndCommentsById} from "./comment-trees";
import {SubscriberInstance} from "./subscribe-to-changes";
import {mergeSimpleSSO} from "./sso";
import {State} from "@hookstate/core";
import {handleNewCustomConfig} from "./custom-config";
import {persistSubscriberState} from "./live";
import {getDefaultImageAssets} from "../resources";

interface FastCommentsInternalState {
    isFirstRequest: boolean;
    lastGenDate?: number;
    lastComments: FastCommentsWidgetComment[];
    lastSubscriberInstance?: SubscriberInstance | void;
}

export class FastCommentsLiveCommentingService {
    private readonly state: State<FastCommentsState>;
    private readonly internalState: FastCommentsInternalState;
    private readonly callbacks?: FastCommentsCallbacks;

    constructor(state: State<FastCommentsState>, callbacks?: FastCommentsCallbacks) {
        this.state = state;
        this.callbacks = callbacks;
        this.internalState = {
            isFirstRequest: true,
            lastGenDate: undefined,
            lastComments: [],
            lastSubscriberInstance: undefined,
        };
    }

    static createFastCommentsStateFromConfig(config: FastCommentsCommentWidgetConfig, assets?: ImageAssetConfig): FastCommentsState {
        mergeSimpleSSO(config);
        return {
            apiHost: getAPIHost(config),
            wsHost: config.wsHost ? config.wsHost : (config.region === 'eu' ? 'wss://ws-eu.fastcomments.com' : 'wss://ws.fastcomments.com'),
            PAGE_SIZE: 30,
            blockingErrorMessage: undefined,
            commentCountOnClient: 0,
            commentCountOnServer: 0,
            commentsById: {},
            commentsTree: [],
            allComments: [],
            commentsVisible: undefined,
            currentUser: !config.sso && config.simpleSSO && config.simpleSSO.username ? config.simpleSSO : undefined,
            hasBillingIssue: false,
            hasMore: false,
            instanceId: Math.random() + '.' + Date.now(),
            imageAssets: assets ? assets : getDefaultImageAssets(),
            isDemo: false,
            isSiteAdmin: false,
            newRootCommentCount: 0,
            page: typeof config.startingPage === 'number' ? config.startingPage : 0,
            pagesLoaded: [],
            sortDirection: config.defaultSortDirection || 'MR',
            translations: {},
            userPresenceState: {
                heartbeatActive: false,
                presencePollState: undefined,
                usersOnlineMap: {},
                userIdsToCommentIds: {}
            },
            userNotificationState: {
                isOpen: false,
                isLoading: false,
                count: 0,
                notifications: [],
                isPaginationInProgress: false,
                isSubscribed: false,
            },
            config,
            ssoConfigString: config.sso ? JSON.stringify(config.sso) : undefined
        };
    }

    async fetchRemoteState(isPrev: boolean): Promise<void> {
        const state = this.state;
        const internalState = this.internalState;
        const config = this.state.config.get();
        config.onInit && config.onInit();
        if (config.urlId === undefined || config.urlId === null) {
            throw new Error('FastComments initialization failure: Configuration parameter "urlId" must be defined!');
        }
        const queryParams: Record<string, string | number | undefined> = {
            urlId: config.urlId,
            page: state.page.get(),
            lastGenDate: internalState.lastGenDate
        };

        if (internalState.lastComments.length === 0) {
            // We only send these on the initial request (when lastComments is empty).
            queryParams.includei10n = 'true';
            queryParams.useFullTranslationIds = 'true';

            if (config.locale) {
                queryParams.locale = config.locale;
            }
        }

        if (config.countAll) {
            queryParams.countAll = 'true';
        }

        if (internalState.isFirstRequest) {
            queryParams.includeConfig = 'true';
            queryParams.includeNotificationCount = 'true';
        }

        if (state.ssoConfigString) {
            queryParams.sso = state.ssoConfigString.get();
        }

        queryParams.direction = state.sortDirection.get();

        if (config.jumpToId) {
            queryParams.fetchPageForCommentId = config.jumpToId;
        }

        const isActivityFeed = config.tenantId === 'all' && config.userId;

        if (isActivityFeed) {
            queryParams.userId = config.userId;

            if (config.sso) {
                queryParams.tenantId = config.ssoTenantId;
            }
        }

        const url = isActivityFeed ? '/comments-for-user' : '/comments/' + config.tenantId + '/';

        try {
            const response = await makeRequest<GetCommentsResponse>({
                apiHost: this.state.apiHost.get(),
                method: 'GET',
                url: url + createURLQueryString(queryParams),
            });
            console.log('got', response);
            const isRateLimited = response.code === 'rate-limited';

            handleNewCustomConfig(this.state, response.customConfig);

            if (isRateLimited) {
                state.blockingErrorMessage.set(state.translations.EXCEEDED_QUOTA.get());
            } else if (response.code === 'domain-unauthorized') {
                state.blockingErrorMessage.set(state.translations.DOMAIN_NOT_AUTHORIZED.get());
            } else if (response.code === 'unauthorized-page') {
                state.blockingErrorMessage.set(state.translations.UNAUTHORIZED_VIEW_THIS_PAGE.get());
            } else if (response.code === 'invalid-tenant') {
                state.blockingErrorMessage.set(state.translations.INVALID_TENANT.get());
            } else if (response.code === 'malformed-sso') {
                state.blockingErrorMessage.set(state.translations.MALFORMED_SSO.get());
                if (response.reason && response.reason !== 'SSO Request Malformed') {
                    state.blockingErrorMessage.set(state.blockingErrorMessage.get() + ' ' + response.reason);
                }
            } else if (response.isCommentsHidden) {
                state.blockingErrorMessage.set(state.translations.BILLING_INFO_INV_60_DAYS.get());
            }

            if (typeof response.pageNumber === 'number') {
                state.page.set(response.pageNumber);
                if (!state.pagesLoaded.get().includes(state.page.get())) {
                    state.pagesLoaded.merge([state.page.get()]);
                }
            }

            if (typeof response.notificationCount === 'number') {
                state.userNotificationState.count.set(response.notificationCount);
            }

            const responseComments = response.comments || [];
            const isLiveChatStyle = config.defaultSortDirection === 'NF' && config.newCommentsToBottom;
            if (isLiveChatStyle) {
                responseComments.reverse();
            }
            state.hasMore.set(state.page.get() !== -1 && responseComments.length >= state.PAGE_SIZE.get());

            if (!response.includesPastPages) {
                if (isPrev) {
                    state.allComments.set(responseComments.concat(internalState.lastComments));
                } else if (state.page.get() > 0) { // for example for changing sort direction
                    if (isLiveChatStyle) {
                        state.allComments.set(responseComments.concat(internalState.lastComments));
                    } else {
                        state.allComments.set(internalState.lastComments.concat(responseComments));
                    }
                } else {
                    state.allComments.set(responseComments);
                }
            } else {
                state.allComments.set(responseComments);
            }
            internalState.lastComments = JSON.parse(JSON.stringify(state.allComments.get())); // TODO optimize away
            state.commentCountOnClient.set(state.allComments.length);

            if (response.moderatingTenantIds) {
                state.moderatingTenantIds.set(response.moderatingTenantIds);
            }

            if (response.user) {
                state.currentUser.set(response.user);
                this.callbacks?.onAuthenticationChange && this.callbacks.onAuthenticationChange('user-set', state.currentUser.get(), null);
            }

            if (state.commentsVisible.get() === undefined) {
                state.commentsVisible.set(!(config.hideCommentsUnderCountTextFormat || config.useShowCommentsToggle));
            }

            // TODO OPTIMIZE away JSON.parse(JSON.stringify()).
            //  We can do this by moving allComments outside of state and into internalState.
            //  Without the deref of the child objects in allComments, deleting comments live breaks.
            const result = getCommentsTreeAndCommentsById(!!config.collapseReplies, JSON.parse(JSON.stringify(state.allComments.get())));
            // Doing two sets() here is faster than doing a million of them in getCommentsTreeAndCommentsById.
            state.commentsById.set(result.commentsById);
            state.commentsTree.set(result.comments);

            if (config.jumpToId) {
                // TODO OPTIMIZE - would passing State<state.commentsById> be faster here?
                ensureRepliesOpenToComment(state.commentsById.get(), config.jumpToId);
            }

            state.isSiteAdmin.set(!!response.isSiteAdmin);
            state.hasBillingIssue.set(!!response.hasBillingIssue);
            internalState.lastGenDate = response.lastGenDate;
            state.isDemo.set(!!response.isDemo);
            if (response.commentCount !== undefined && Number.isFinite(response.commentCount)) {
                state.commentCountOnServer.set(response.commentCount);
            }

            if (config.jumpToId) {
                // scrollToComment(config.instanceId, config.jumpToId, 200); // TODO how?
                delete config.jumpToId; // don't jump next render
                if (typeof response.pageNumber === 'number') {
                    state.page.set(response.pageNumber);
                }
            }

            // Don't create websocket connections if they're overloading us.
            // also, urlIdClean is not available at this point.
            if (!isRateLimited && internalState.isFirstRequest && response.urlIdWS && response.tenantIdWS && response.userIdWS) {
                state.userPresenceState.presencePollState.set(response.presencePollState);
                persistSubscriberState(state, response.urlIdWS, response.tenantIdWS, response.userIdWS);
            }
            internalState.isFirstRequest = false;
            config.onCommentsRendered && config.onCommentsRendered(response.comments || []);
            // console.log('RESULTING STATE', JSON.stringify(state.get())); // TODO remove
        } catch (e) {
            // TODO handle failures
            console.error(e);
        }
    }
}
