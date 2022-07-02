import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsState} from "../types/fastcomments-state";
import {FastCommentsComment} from "../types/comment";
import {createURLQueryString, makeRequest} from "./http";
import {GetCommentsResponse} from "../types/dto";

interface FastCommentsInternalState {
    isFirstRequest: boolean;
    areCommentDatesMaintained: boolean;
    ssoConfigString?: string;
    lastGenDate?: number;
    lastComments: FastCommentsComment[];
}

export class FastCommentsLiveCommentingService {
    private readonly state: FastCommentsState;
    private readonly internalState: FastCommentsInternalState;

    constructor(config: FastCommentsCommentWidgetConfig) {
        this.state = {
            apiHost: config.apiHost ? config.apiHost : (config.region === 'eu' ? 'https://eu.fastcomments.com' : 'https://fastcomments.com'),
            PAGE_SIZE: 30,
            blockingErrorMessage: undefined,
            commentCountOnClient: 0,
            commentCountOnServer: 0,
            commentState: {},
            commentsById: {},
            commentsTree: [],
            allComments: [],
            commentsVisible: false,
            currentUser: !config.sso && config.simpleSSO && config.simpleSSO.username ? config.simpleSSO : undefined,
            hasBillingIssue: false,
            hasMore: false,
            icons: undefined,
            isDemo: false,
            isSiteAdmin: false,
            newRootCommentCount: 0,
            notificationCount: 0,
            page: typeof config.startingPage === 'number' ? config.startingPage : 0,
            pagesLoaded: [],
            sortDirection: config.defaultSortDirection,
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
            config
        };

        this.internalState = {
            isFirstRequest: true,
            areCommentDatesMaintained: false,
            ssoConfigString: undefined,
            lastGenDate: undefined,
            lastComments: [],
        };
    }

    getState(): FastCommentsState {
        return this.state;
    }

    async fetchAndRender(nextCB, isPrev): Promise<void> {
        const internalState = this.internalState;
        const state = this.state;
        const config = this.state.config;
        config.onInit && config.onInit();
        const queryParams: Record<string, string | number> = {
            urlId: config.urlId,
            page: state.page,
            lastGenDate: internalState.lastGenDate
        };

        if (internalState.lastComments.length === 0) {
            // We only send these on the initial request (when lastComments is empty).
            queryParams.includei10n = 'true';

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

        if (internalState.ssoConfigString) {
            queryParams.sso = internalState.ssoConfigString;
        }

        queryParams.direction = state.sortDirection;

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
                apiHost: this.state.apiHost,
                method: 'GET',
                url: url + createURLQueryString(queryParams),
            });
            const isRateLimited = response.code === 'rate-limited';

            this.handleNewCustomConfig(response.customConfig);

            if (isRateLimited) {
                state.blockingErrorMessage = state.translations.EXCEEDED_QUOTA;
            } else if (response.code === 'domain-unauthorized') {
                state.blockingErrorMessage = state.translations.DOMAIN_NOT_AUTHORIZED;
            } else if (response.code === 'unauthorized-page') {
                state.blockingErrorMessage = state.translations.UNAUTHORIZED_VIEW_THIS_PAGE;
            } else if (response.code === 'invalid-tenant') {
                state.blockingErrorMessage = state.translations.INVALID_TENANT;
            } else if (response.code === 'malformed-sso') {
                state.blockingErrorMessage = state.translations.MALFORMED_SSO;
                if (response.reason && response.reason !== 'SSO Request Malformed') {
                    state.blockingErrorMessage += ' ' + response.reason;
                }
            } else if (response.isCommentsHidden) {
                state.blockingErrorMessage = state.translations.BILLING_INFO_INV_60_DAYS;
            }

            if (typeof response.pageNumber === 'number') {
                state.page = response.pageNumber;
                if (!state.pagesLoaded.includes(state.page)) {
                    state.pagesLoaded.push(state.page);
                }
            }

            if (typeof response.notificationCount === 'number') {
                state.userNotificationState.count = response.notificationCount;
            }

            const responseComments = response.comments || [];
            const isLiveChatStyle = config.defaultSortDirection === 'NF' && config.newCommentsToBottom;
            if (isLiveChatStyle) {
                responseComments.reverse();
            }
            state.hasMore = responseComments.length >= state.PAGE_SIZE;

            if (!response.includesPastPages) {
                if (isPrev) {
                    state.allComments = responseComments.concat(internalState.lastComments);
                } else if (state.page > 0) { // for example for changing sort direction
                    if (isLiveChatStyle) {
                        state.allComments = responseComments.concat(internalState.lastComments);
                    } else {
                        state.allComments = internalState.lastComments.concat(responseComments);
                    }
                } else {
                    state.allComments = responseComments;
                }
            } else {
                state.allComments = responseComments;
            }
            internalState.lastComments = JSON.parse(JSON.stringify(state.allComments));
            state.commentCountOnClient = state.allComments.length;

            if (response.moderatingTenantIds) {
                config.moderatingTenantIds = response.moderatingTenantIds;
            }

            if (internalState.isFirstRequest && config.readonly && state.commentCountOnClient === 0 && !state.translations.NO_COMMENTS) {
                config.onCommentsRendered && config.onCommentsRendered([]);
                return;
            }

            if (response.user) {
                state.currentUser = response.user;
                onAuthenticationChange(config.instanceId, 'user-set', currentUser);
            }

            if (state.commentsVisible === undefined) {
                state.commentsVisible = !(config.hideCommentsUnderCountTextFormat || config.useShowCommentsToggle);
            }

            const result = getCommentsTreeAndCommentsById(config.collapseReplies, commentRepliesHiddenById, state.allComments);
            state.commentsById = result.commentsById;
            state.commentsTree = result.comments;

            if (config.jumpToId) {
                ensureRepliesOpenToComment(commentRepliesHiddenById, commentsById, config.jumpToId);
            }

            WAITING_SPINNER_VOTE_HTML = '<span class="fast-comments-waiting">' + translations.SAVING_VOTE + '</span>';
            WAITING_SPINNER_COMMENT_HTML = '<span class="fast-comments-waiting">' + translations.SAVING_COMMENT + '</span>';
            ERROR_HTML = '<span class="fc-red">' + translations.ERROR_MESSAGE + '</span>';

            state.isSiteAdmin = response.isSiteAdmin;
            state.hasBillingIssue = response.hasBillingIssue;
            internalState.lastGenDate = response.lastGenDate;
            state.isDemo = response.isDemo;
            if (Number.isFinite(response.commentCount)) {
                commentCountOnServer = response.commentCount;
            }

            function completeRender() {
                saveUIStateAndRestore(renderCommentsTree);

                if (config.jumpToId) {
                    scrollToComment(config.instanceId, config.jumpToId, 200);
                    delete config.jumpToId; // don't jump next render
                    if (typeof response.pageNumber === 'number') {
                        page = response.pageNumber;
                    }
                }
                updateConfig(config.instanceId, config);

                // Don't create websocket connections if they're overloading us.
                // also, urlIdClean is not available at this point.
                if (!isRateLimited && isFirstRequest && response.urlIdWS !== null && response.tenantIdWS && response.userIdWS) {
                    UserPresenceState.presencePollState = response.presencePollState;
                    persistSubscriberState(response.urlIdWS, response.tenantIdWS, response.userIdWS);
                }
                if (isFirstRequest) {
                    extensions.forEach(function (extension) {
                        if (extension.onInitialRenderComplete) {
                            extension.onInitialRenderComplete();
                        }
                    });
                }
                isFirstRequest = false;
                if (!areCommentDatesMaintained) {
                    maintainCommentDates(targetElement, config, translations, commentsById);
                    areCommentDatesMaintained = true;
                }
                onCommentsRendered(config.instanceId, response.comments);
                nextCB && nextCB();
            }

            let extensionsToLoad = [];

            if (isFirstRequest) {
                if (isSiteAdmin) {
                    extensionsToLoad.push(['moderation', '/js/comment-ui/extensions/comment-ui.moderation.extension.min.js']);
                }
                if (config.useSingleLineCommentInput) {
                    extensionsToLoad.push(['single-line-comment-input', '/js/comment-ui/extensions/comment-ui.single-line-comment-input.extension.min.js']);
                }
                if (config.hasDarkBackground && !extensions.some(function (extension) {
                    return extension.id === 'dark';
                })) {
                    extensionsToLoad.push(['dark', '/js/comment-ui/extensions/comment-ui.dark.extension.min.js']);
                    targetElement.classList.add('dark');
                }
                if (config.wrap && !extensions.some(function (extension) {
                    return extension.id === 'wrapped';
                })) {
                    extensionsToLoad.push(['wrapped', '/js/comment-ui/extensions/comment-ui.wrapped.extension.min.js']);
                    targetElement.classList.add('wrapped');
                }
            }

            let remainingToLoad = extensionsToLoad.length;

            function handleExtensionLoaded() {
                remainingToLoad--;
                if (remainingToLoad === 0) {
                    completeRender();
                }
            }

            if (extensionsToLoad.length > 0) {
                for (const extension of extensionsToLoad) {
                    addExtension(extension[0], extension[1], true, handleExtensionLoaded);
                }
            } else {
                completeRender();
            }
        } catch (e) {
            // TODO handle failures
            console.error(e);
        }
    }

    handleNewCustomConfig(customConfig: FastCommentsCommentWidgetConfig, overwrite?: boolean) {
        const config = this.state.config;
        if (customConfig) {
            for (const key in customConfig) {
                // for the customization page (css is sent from server, but newer version from client)
                // if the custom config has translations, merge them with what the client specified
                if (key === 'translations') {
                    if (config[key]) {
                        config[key] = Object.assign({}, customConfig[key], config[key]);
                    } else {
                        config[key] = customConfig[key];
                    }
                } else if ((config[key] === undefined || overwrite) || key === 'wrap' || key === 'hasDarkBackground') { // undefined is important here (test comment thread viewer w/ customizations like hideCommentsUnderCountTextFormat/useShowCommentsToggle
                    config[key] = customConfig[key];
                }
            }
            if (!this.state.sortDirection && config.defaultSortDirection) {
                this.state.sortDirection = config.defaultSortDirection;
            }
        }

        if (config.translations) {
            this.state.translations = config.translations;
        }
    }
}
