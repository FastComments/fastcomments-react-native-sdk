import {FastCommentsCommentWidgetConfig, FastCommentsWidgetComment} from "fastcomments-typescript";
import {FastCommentsState} from "../types/fastcomments-state";
import {createURLQueryString, makeRequest} from "./http";
import {GetCommentsResponse} from "../types/dto";
import {addCommentToTree, ensureRepliesOpenToComment, getCommentsTreeAndCommentsById} from "./comment-trees";
import {Dispatch, SetStateAction} from "react";
import {SubscriberInstance, subscribeToChanges} from "./subscribe-to-changes";
import {checkBlockedComments} from "./blocking";
import {DefaultIcons} from "../resources/default-icons";
import {addCommentToUserPresenceState, handleNewRemoteUser, setupUserPresenceState} from "./user-presense";
import {WebsocketLiveEvent} from "../types/dto/websocket-live-event";
import {repositionComment} from "./comment-positioning";
import {incOverallCommentCount} from "./comment-count";

interface FastCommentsInternalState {
    isFirstRequest: boolean;
    lastGenDate?: number;
    lastComments: FastCommentsWidgetComment[];
    lastSubscriberInstance?: SubscriberInstance | void;
    broadcastIdsSent: string[];
}

export class FastCommentsLiveCommentingService {
    private readonly state: FastCommentsState;
    private readonly internalState: FastCommentsInternalState;
    private setState!: Dispatch<SetStateAction<FastCommentsState>>;

    constructor(config: FastCommentsCommentWidgetConfig) {
        this.state = {
            instanceId: Math.random() + '.' + Date.now(),
            apiHost: config.apiHost ? config.apiHost : (config.region === 'eu' ? 'https://eu.fastcomments.com' : 'https://fastcomments.com'),
            wsHost: config.wsHost ? config.wsHost : (config.region === 'eu' ? 'wss://ws-eu.fastcomments.com' : 'wss://wsfastcomments.com'),
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
            icons: DefaultIcons,
            isDemo: false,
            isSiteAdmin: false,
            newRootCommentCount: 0,
            notificationCount: 0,
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
            ssoConfigString: config.sso ? JSON.stringify(config.sso) : undefined,
        };

        this.internalState = {
            isFirstRequest: true,
            lastGenDate: undefined,
            lastComments: [],
            lastSubscriberInstance: undefined,
            broadcastIdsSent: [],
        };
    }

    getState(): FastCommentsState {
        return this.state;
    }

    setStateCallback(setState: Dispatch<SetStateAction<FastCommentsState>>) {
        this.setState = setState;
    }

    async fetchRemoteState(isPrev: boolean): Promise<void> {
        const internalState = this.internalState;
        const state = this.state;
        const config = this.state.config;
        config.onInit && config.onInit();
        if (config.urlId === undefined || config.urlId === null) {
            throw new Error('FastComments initialization failure: Configuration parameter "urlId" must be defined!');
        }
        const queryParams: Record<string, string | number | undefined> = {
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

        if (state.ssoConfigString) {
            queryParams.sso = state.ssoConfigString;
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
                state.moderatingTenantIds = response.moderatingTenantIds;
            }

            if (internalState.isFirstRequest && config.readonly && state.commentCountOnClient === 0 && !state.translations.NO_COMMENTS) {
                config.onCommentsRendered && config.onCommentsRendered([]);
                return;
            }

            if (response.user) {
                state.currentUser = response.user;
                config.onAuthenticationChange && config.onAuthenticationChange('user-set', state.currentUser);
            }

            if (state.commentsVisible === undefined) {
                state.commentsVisible = !(config.hideCommentsUnderCountTextFormat || config.useShowCommentsToggle);
            }

            const result = getCommentsTreeAndCommentsById(!!config.collapseReplies, state.commentState, state.allComments);
            state.commentsById = result.commentsById;
            state.commentsTree = result.comments;

            if (config.jumpToId) {
                ensureRepliesOpenToComment(state.commentState, state.commentsById, config.jumpToId);
            }

            state.isSiteAdmin = !!response.isSiteAdmin;
            state.hasBillingIssue = !!response.hasBillingIssue;
            internalState.lastGenDate = response.lastGenDate;
            state.isDemo = !!response.isDemo;
            if (response.commentCount !== undefined && Number.isFinite(response.commentCount)) {
                state.commentCountOnServer = response.commentCount;
            }

            if (config.jumpToId) {
                // scrollToComment(config.instanceId, config.jumpToId, 200); // TODO how?
                delete config.jumpToId; // don't jump next render
                if (typeof response.pageNumber === 'number') {
                    state.page = response.pageNumber;
                }
            }

            // Don't create websocket connections if they're overloading us.
            // also, urlIdClean is not available at this point.
            if (!isRateLimited && internalState.isFirstRequest && response.urlIdWS && response.tenantIdWS && response.userIdWS) {
                state.userPresenceState.presencePollState = response.presencePollState;
                this.persistSubscriberState(response.urlIdWS, response.tenantIdWS, response.userIdWS);
            }
            internalState.isFirstRequest = false;
            config.onCommentsRendered && config.onCommentsRendered(response.comments || []);
            // saveUIStateAndRestore(renderCommentsTree); // TODO tell React to rerender
        } catch (e) {
            // TODO handle failures
            console.error(e);
        }
    }

    handleNewCustomConfig(customConfig: FastCommentsCommentWidgetConfig | null | undefined, overwrite?: boolean) {
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
                } else if ((config[key as keyof FastCommentsCommentWidgetConfig] === undefined || overwrite) || key === 'wrap' || key === 'hasDarkBackground') { // undefined is important here (test comment thread viewer w/ customizations like hideCommentsUnderCountTextFormat/useShowCommentsToggle
                    // @ts-ignore
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

    persistSubscriberState(newUrlIdWS: string, newTenantIdWS: string, newUserIdWS: string) {
        const state = this.state;
        const internalState = this.internalState;
        const didChange = state.urlIdWS !== newUrlIdWS || state.tenantIdWS !== newTenantIdWS || state.userIdWS !== newUserIdWS;
        if (!didChange) {
            return;
        }
        state.urlIdWS = newUrlIdWS;
        state.tenantIdWS = newTenantIdWS;
        state.userIdWS = newUserIdWS;

        if (internalState.lastSubscriberInstance) {
            internalState.lastSubscriberInstance.close();
        }

        internalState.lastSubscriberInstance = subscribeToChanges(state.config, state.wsHost, state.tenantIdWS, state.config.urlId!, state.urlIdWS, state.userIdWS, async (commentIds: string[]) => {
            return await checkBlockedComments(state, commentIds);
        }, this.handleLiveEvent, () => {
            this.setState(this.state);
        }, function connectionStatusChange(isConnected, lastEventTime) {
            // if we have a current user, update the status icon on their comments!
            if (state.currentUser && 'id' in state.currentUser) {
                state.userPresenceState.usersOnlineMap[state.currentUser.id] = isConnected;
            }
            // if we are reconnecting, re-fetch all user statuses and render them
            if (isConnected) {
                const isReconnect = !!lastEventTime;
                if (isReconnect) {
                    // reset user presence state because we know nothing since we disconnected
                    state.userPresenceState.userIdsToCommentIds = {};
                    state.userPresenceState.usersOnlineMap = {};
                    // getAndRenderLatestNotificationCount(); // TODO
                }
                // noinspection JSIgnoredPromiseFromCall
                setupUserPresenceState(state.config, newUrlIdWS, state);
            }
        });
    }

    handleLiveEvent(dataJSON: WebsocketLiveEvent): boolean {
        if ('broadcastId' in dataJSON && this.internalState.broadcastIdsSent.includes(dataJSON.broadcastId)) {
            return false;
        }
        if ('bId' in dataJSON && this.internalState.broadcastIdsSent.includes(dataJSON.bId)) {
            return false;
        }
        let needsReRender = false;
        switch (dataJSON.type) {
            case 'new-badge':
                for (const comment of this.state.allComments) {
                    if (comment.userId === dataJSON.badge.userId) {
                        if (!comment.badges) {
                            comment.badges = [dataJSON.badge];
                        } else if (!comment.badges.some(function (badge) { // handle race conditions
                            return badge.id === dataJSON.badge.id;
                        })) {
                            comment.badges.push(dataJSON.badge)
                        }
                    }
                }
                this.internalState.broadcastIdsSent.push(dataJSON.broadcastId);
                break;
            case 'removed-badge':
                for (const comment of this.state.allComments) {
                    if (comment.userId === dataJSON.badge.userId && comment.badges) {
                        const newBadges = [];
                        for (const badge of comment.badges) {
                            if (badge.id !== dataJSON.badge.id) {
                                newBadges.push(badge);
                            }
                        }
                        comment.badges = newBadges;
                    }
                }
                this.internalState.broadcastIdsSent.push(dataJSON.broadcastId);
                break;
            case 'notification':
                if (this.state.userNotificationState.count) {
                    this.state.userNotificationState.count++;
                } else {
                    this.state.userNotificationState.count = 1;
                }
                if (this.state.userNotificationState.notifications) {
                    this.state.userNotificationState.notifications.unshift(dataJSON.notification);
                }
                break;
            case 'presence-update':
                if (dataJSON.uj) {
                    for (const userJoined of dataJSON.uj) {
                        this.state.userPresenceState.usersOnlineMap[userJoined] = true;
                    }
                }
                if (dataJSON.ul) {
                    for (const userLeft of dataJSON.ul) {
                        this.state.userPresenceState.usersOnlineMap[userLeft] = false;
                    }
                }
                break;
            case 'new-vote':
                const newVoteComment = this.state.commentsById[dataJSON.vote.commentId];
                if (newVoteComment) {
                    if (newVoteComment.votes === null || newVoteComment.votes === undefined) {
                        newVoteComment.votes = 0;
                    }
                    newVoteComment.votes += dataJSON.vote.direction;
                    if (dataJSON.vote.direction > 0) {
                        if (newVoteComment.votesUp === null || newVoteComment.votesUp === undefined) {
                            newVoteComment.votesUp = 0;
                        }
                        newVoteComment.votesUp++;
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && dataJSON.vote.userId === this.state.currentUser.id) {
                            newVoteComment.isVotedUp = true;
                        }
                    } else {
                        if (newVoteComment.votesDown === null || newVoteComment.votesDown === undefined) {
                            newVoteComment.votesDown = 0;
                        }
                        newVoteComment.votesDown++;
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && dataJSON.vote.userId === this.state.currentUser.id) {
                            newVoteComment.isVotedDown = true;
                        }
                    }
                }
                break;
            case 'deleted-vote':
                const deletedVoteComment = this.state.commentsById[dataJSON.vote.commentId];
                if (deletedVoteComment) {
                    // votes always set as vote was originally populated for it to be deleted
                    deletedVoteComment.votes! += (dataJSON.vote.direction * -1);
                    if (dataJSON.vote.direction > 0) {
                        if (deletedVoteComment.votesUp) {
                            deletedVoteComment.votesUp--;
                        }
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && deletedVoteComment.isVotedUp && dataJSON.vote.userId === this.state.currentUser.id) {
                            delete deletedVoteComment.isVotedUp;
                        }
                    } else {
                        if (deletedVoteComment.votesDown) {
                            deletedVoteComment.votesDown--;
                        }
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && deletedVoteComment.isVotedDown && dataJSON.vote.userId === this.state.currentUser.id) {
                            delete deletedVoteComment.isVotedDown;
                        }
                    }
                }
                break;
            case 'deleted-comment':
                if (this.state.commentsById[dataJSON.comment._id]) {
                    needsReRender = true;
                }
                break;
            case 'new-comment':
            case 'updated-comment':
                const dataJSONComment = dataJSON.comment;
                const dataJSONExtraInfo = dataJSON.extraInfo;
                const showLiveRightAway = this.state.config.showLiveRightAway;
                const commentsById = this.state.commentsById;
                // the hidden check here is for approving, un-approving, and then re-approving a comment
                if (dataJSON.type === 'new-comment' && commentsById[dataJSONComment._id]) {
                    if (!commentsById[dataJSONComment._id].approved && dataJSONComment.approved) {
                        dataJSON.type = 'updated-comment'; // we'll just set the comment as approved
                    } else {
                        return false;
                    }
                }

                /*
                    What we want to do is show a count on the first visible parent comment like:
                    "8 New Comments - Click to show"
                    This means that if you could have:
                    Visible Comment (2 new comments, click to show)
                        - Hidden New Comment
                            - Hidden New Comment
                    So we need to walk the tree to find the first visible parent comment, and also
                    calculate how many hidden comments are under that parent.

                    If parentId is null - like when replying to a page instead of a parent comment - we can just
                    treat the page as the root and don't have to walk any tree.

                    ASSUMPTION: We should always receive the comments in order so that we can just walk
                    the tree backwards.

                    Then we just need to render that text/button. Clicking it then goes and changes the hidden
                    flag on said comments and re-renders that part of the tree.
                 */

                const isNew = !commentsById[dataJSONComment._id];
                if (isNew) {
                    commentsById[dataJSONComment._id] = dataJSONComment;
                } else {
                    for (const key in dataJSONComment) {
                        // @ts-ignore
                        commentsById[dataJSONComment._id][key as keyof FastCommentsWidgetComment] = dataJSONComment[key as keyof FastCommentsWidgetComment];
                    }
                }

                if (!isNew) {
                    if (dataJSONExtraInfo) {
                        if (dataJSONExtraInfo.commentPositions) {
                            repositionComment(dataJSONComment._id, dataJSONExtraInfo.commentPositions, this.state);
                        }
                    }
                } else {
                    const presenceChanges = {};
                    addCommentToUserPresenceState(this.state.userPresenceState, dataJSONComment, presenceChanges);
                    dataJSONComment.isLive = true; // so we can animate the background color
                    // commentsVisible check is here because if comments are hidden, we want this comment to show as soon as comments are un-hidden.
                    const newCommentHidden = this.state.commentsVisible && !showLiveRightAway;
                    dataJSONComment.hidden = newCommentHidden; // don't irritate the user with content popping in and out.

                    let updateRoot = false, currentParent = null;
                    if (!dataJSONComment.parentId) {
                        updateRoot = true;
                    } else {
                        currentParent = commentsById[dataJSONComment.parentId];
                        // TODO What was this supposed to do? It does not look like it was working correctly as we would hit iteratedCount when a new comment comes in that is a child of a comment that is not visible.
                        // let iteratedCount = 0;
                        // while ((!currentParent || currentParent.hidden === true) && iteratedCount < 5000) {
                        //     if (currentParent && !currentParent.parentId) {
                        //         updateRoot = true;
                        //         break; // reached top of page
                        //     }
                        //     currentParent = currentParent ? commentsById[currentParent.parentId] : null;
                        //     iteratedCount++;
                        // }
                        // if (iteratedCount >= 4998) {
                        //     console.warn('FC - iteration hit limit', iteratedCount);
                        // }
                    }

                    addCommentToTree(this.state.allComments, this.state.commentsTree, commentsById, dataJSONComment, !!this.state.config.newCommentsToBottom);
                    incOverallCommentCount(this.state.config, this.state, dataJSONComment.parentId);

                    // TODO update the "Show X Comments" button text live like vanilla js widget
                    // const showCommentsMessageButton = document.querySelector('.comments-toggle');
                    // if (showCommentsMessageButton) {
                    //     showCommentsMessageButton.innerHTML = getShowHideCommentsCountText(translations, commentsVisible, commentCountOnServer);
                    // }

                    if (updateRoot) {
                        if (newCommentHidden) {
                            this.state.newRootCommentCount++;
                            // TODO update the "Show New X Comments" button text live.
                            // const messageRootTarget = getElementById('new-comments-message-root');
                            // if (messageRootTarget) { // element may not be in DOM - like if comments hidden.
                            //     messageRootTarget.classList.remove('hidden');
                            //     messageRootTarget.innerHTML = getNewCommentCountText(translations, newRootCommentCount);
                            // }
                        } else {
                            needsReRender = true;
                        }
                    } else if (currentParent) {
                        if (newCommentHidden) {
                            if (!('hiddenChildrenCount' in currentParent)) {
                                currentParent.hiddenChildrenCount = 1;
                            } else {
                                currentParent.hiddenChildrenCount!++;
                            }
                        }
                    }

                    const userIdsChanged = Object.keys(presenceChanges);
                    // noinspection JSIgnoredPromiseFromCall - fire and forget
                    if (userIdsChanged.length > 0) {
                        handleNewRemoteUser(this.state.config, this.state.urlIdWS!, this.state.userPresenceState, userIdsChanged);
                    }
                }
                break;
            case 'new-config':
                this.handleNewCustomConfig(dataJSON.config, true);
                needsReRender = true;
                break;
        }
        return needsReRender;
    }
}
