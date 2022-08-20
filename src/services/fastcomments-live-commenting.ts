import {FastCommentsCommentWidgetConfig, FastCommentsWidgetComment} from "fastcomments-typescript";
import {FastCommentsState} from "../types/fastcomments-state";
import {createURLQueryString, makeRequest} from "./http";
import {GetCommentsResponse} from "../types/dto";
import {addCommentToTree, ensureRepliesOpenToComment, getCommentsTreeAndCommentsById} from "./comment-trees";
import {SubscriberInstance, subscribeToChanges} from "./subscribe-to-changes";
import {checkBlockedComments} from "./blocking";
import {DefaultIcons} from "../resources/default-icons";
import {addCommentToUserPresenceState, handleNewRemoteUser, setupUserPresenceState} from "./user-presense";
import {WebsocketLiveEvent} from "../types/dto/websocket-live-event";
import {repositionComment} from "./comment-positioning";
import {incOverallCommentCount} from "./comment-count";
import {broadcastIdsSent} from "./broadcast-id";
import {mergeSimpleSSO} from "./sso";
import {none, State} from "@hookstate/core";
import {removeCommentOnClient} from "./remove-comment-on-client";

interface FastCommentsInternalState {
    isFirstRequest: boolean;
    lastGenDate?: number;
    lastComments: FastCommentsWidgetComment[];
    lastSubscriberInstance?: SubscriberInstance | void;
}

export class FastCommentsLiveCommentingService {
    private readonly state: State<FastCommentsState>;
    private readonly internalState: FastCommentsInternalState;

    constructor(state: State<FastCommentsState>) {
        this.state = state;
        this.internalState = {
            isFirstRequest: true,
            lastGenDate: undefined,
            lastComments: [],
            lastSubscriberInstance: undefined,
        };
    }

    static createFastCommentsStateFromConfig(config: FastCommentsCommentWidgetConfig): FastCommentsState {
        mergeSimpleSSO(config);
        return {
            instanceId: Math.random() + '.' + Date.now(),
            apiHost: config.apiHost ? config.apiHost : (config.region === 'eu' ? 'https://eu.fastcomments.com' : 'https://fastcomments.com'),
            wsHost: config.wsHost ? config.wsHost : (config.region === 'eu' ? 'wss://ws-eu.fastcomments.com' : 'wss://ws.fastcomments.com'),
            PAGE_SIZE: 30,
            blockingErrorMessage: undefined,
            commentCountOnClient: 0,
            commentCountOnServer: 0,
            commentState: {},
            commentsById: {},
            commentsTree: [],
            allComments: [],
            commentsVisible: undefined,
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

            this.handleNewCustomConfig(response.customConfig);

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
            state.hasMore.set(responseComments.length >= state.PAGE_SIZE.get());

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

            if (internalState.isFirstRequest && config.readonly && state.commentCountOnClient.get() === 0 && !state.translations.NO_COMMENTS.get()) {
                config.onCommentsRendered && config.onCommentsRendered([]);
            }

            if (response.user) {
                state.currentUser.set(response.user);
                config.onAuthenticationChange && config.onAuthenticationChange('user-set', state.currentUser.get()!);
            }

            if (state.commentsVisible.get() === undefined) {
                state.commentsVisible.set(!(config.hideCommentsUnderCountTextFormat || config.useShowCommentsToggle));
            }

            // TODO OPTIMIZE away JSON.parse(JSON.stringify()).
            //  We can do this by moving allComments outside of state and into internalState.
            //  Without the deref of the child objects in allComments, deleting comments live breaks.
            const result = getCommentsTreeAndCommentsById(!!config.collapseReplies, state.commentState, JSON.parse(JSON.stringify(state.allComments.get())));
            // Doing two sets() here is faster than doing a million of them in getCommentsTreeAndCommentsById.
            state.commentsById.set(result.commentsById);
            state.commentsTree.set(result.comments);

            if (config.jumpToId) {
                // TODO OPTIMIZE - would passing State<state.commentsById> be faster here?
                ensureRepliesOpenToComment(state.commentState, state.commentsById.get(), config.jumpToId);
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
                this.persistSubscriberState(response.urlIdWS, response.tenantIdWS, response.userIdWS);
            }
            internalState.isFirstRequest = false;
            config.onCommentsRendered && config.onCommentsRendered(response.comments || []);
            // console.log('RESULTING STATE', JSON.stringify(state.get())); // TODO remove
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
                    if (config[key].get()) {
                        config[key].set(Object.assign({}, customConfig[key], config[key].get()));
                    } else {
                        config[key].set(customConfig[key]);
                    }
                } else if ((config[key as keyof FastCommentsCommentWidgetConfig] === undefined || overwrite) || key === 'wrap' || key === 'hasDarkBackground') { // undefined is important here (test comment thread viewer w/ customizations like hideCommentsUnderCountTextFormat/useShowCommentsToggle
                    // @ts-ignore
                    config[key].set(customConfig[key]);
                }
            }
            if (!this.state.sortDirection.get()) {
                const defaultSortDirection = config.defaultSortDirection.get();
                if (typeof defaultSortDirection === 'string') {
                    this.state.sortDirection.set(defaultSortDirection);
                }
            }
        }

        const configTranslations = config.translations.get();
        if (configTranslations) {
            this.state.translations.merge(configTranslations);
        }
    }

    persistSubscriberState(newUrlIdWS: string, newTenantIdWS: string, newUserIdWS: string) {
        const state = this.state;
        const internalState = this.internalState;
        const didChange = state.urlIdWS.get() !== newUrlIdWS || state.tenantIdWS.get() !== newTenantIdWS || state.userIdWS.get() !== newUserIdWS;
        if (!didChange) {
            return;
        }
        state.urlIdWS.set(newUrlIdWS);
        state.tenantIdWS.set(newTenantIdWS);
        state.userIdWS.set(newUserIdWS);

        if (internalState.lastSubscriberInstance) {
            internalState.lastSubscriberInstance.close();
        }

        internalState.lastSubscriberInstance = subscribeToChanges(state.config.get(), state.wsHost.get(), state.tenantIdWS.get()!, state.config.urlId.get()!, state.urlIdWS.get()!, state.userIdWS.get()!, async (commentIds: string[]) => {
            return await checkBlockedComments(state.get(), commentIds);
        }, (dataJSON: WebsocketLiveEvent) => {
            return this.handleLiveEvent(dataJSON);
        }, function connectionStatusChange(isConnected, lastEventTime) {
            // if we have a current user, update the status icon on their comments!
            if (state.currentUser && 'id' in state.currentUser) {
                state.userPresenceState.usersOnlineMap[state.currentUser.id.get()].set(isConnected);
            }
            // if we are reconnecting, re-fetch all user statuses and render them
            if (isConnected) {
                const isReconnect = !!lastEventTime;
                if (isReconnect) {
                    // reset user presence state because we know nothing since we disconnected
                    state.userPresenceState.userIdsToCommentIds.set({});
                    state.userPresenceState.usersOnlineMap.set({});
                    // getAndRenderLatestNotificationCount(); // TODO
                }
                // noinspection JSIgnoredPromiseFromCall
                setupUserPresenceState(state, newUrlIdWS);
            }
        });
    }

    handleLiveEvent(dataJSON: WebsocketLiveEvent) {
        console.log('handleLiveEvent', dataJSON); // TODO remove
        if ('broadcastId' in dataJSON && broadcastIdsSent.includes(dataJSON.broadcastId)) {
            return;
        }
        if ('bId' in dataJSON && broadcastIdsSent.includes(dataJSON.bId)) {
            return;
        }
        switch (dataJSON.type) {
            case 'new-badge':
                for (const comment of this.state.allComments) {
                    if (comment.userId.get() === dataJSON.badge.userId) {
                        if (!comment.badges.get()) {
                            comment.badges.merge([dataJSON.badge]);
                        } else if (!comment.badges.get()!.some(function (badge) { // handle race conditions
                            return badge.id === dataJSON.badge.id;
                        })) {
                            comment.badges.merge([dataJSON.badge]);
                        }
                    }
                }
                broadcastIdsSent.push(dataJSON.broadcastId);
                break;
            case 'removed-badge':
                for (const comment of this.state.allComments) {
                    if (comment.userId.get() === dataJSON.badge.userId && comment.badges.get()) {
                        const newBadges = [];
                        for (const badge of comment.badges.get()!) {
                            if (badge.id !== dataJSON.badge.id) {
                                newBadges.push(badge);
                            }
                        }
                        comment.badges.merge(newBadges);
                    }
                }
                broadcastIdsSent.push(dataJSON.broadcastId);
                break;
            case 'notification':
                this.state.userNotificationState.count.set((count) => {
                    if (count) {
                        count++;
                    } else {
                        count = 1;
                    }
                    return count;
                });
                if (this.state.userNotificationState.notifications.get()) {
                    this.state.userNotificationState.notifications.set((notifications) => {
                        notifications.unshift(dataJSON.notification);
                        return notifications;
                    });
                }
                break;
            case 'presence-update':
                if (dataJSON.uj) {
                    for (const userJoined of dataJSON.uj) {
                        this.state.userPresenceState.usersOnlineMap[userJoined].set(true);
                    }
                }
                if (dataJSON.ul) {
                    for (const userLeft of dataJSON.ul) {
                        this.state.userPresenceState.usersOnlineMap[userLeft].set(false);
                    }
                }
                break;
            case 'new-vote':
                const newVoteComment = this.state.commentsById[dataJSON.vote.commentId];
                if (newVoteComment.get()) {
                    newVoteComment.votes.set((votes) => {
                        if (votes === null || votes === undefined) {
                            votes = 0;
                        } else {
                            votes += dataJSON.vote.direction;
                        }
                        return votes;
                    })
                    if (dataJSON.vote.direction > 0) {
                        newVoteComment.votesUp.set((votesUp) => {
                            if (votesUp === null || votesUp === undefined) {
                                votesUp = 0;
                            } else {
                                votesUp++;
                            }
                            return votesUp;
                        });
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && dataJSON.vote.userId === this.state.currentUser.id.get()) {
                            newVoteComment.isVotedUp.set(true);
                        }
                    } else {
                        newVoteComment.votesDown.set((votesDown) => {
                            if (votesDown === null || votesDown === undefined) {
                                votesDown = 0;
                            } else {
                                votesDown++;
                            }
                            return votesDown;
                        });
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && dataJSON.vote.userId === this.state.currentUser.id.get()) {
                            newVoteComment.isVotedDown.set(true);
                        }
                    }
                }
                break;
            case 'deleted-vote':
                const deletedVoteComment = this.state.commentsById[dataJSON.vote.commentId];
                if (deletedVoteComment.get()) {
                    deletedVoteComment.votes.set((votes) => {
                        // votes always set as vote was originally populated for it to be deleted
                        votes! += (dataJSON.vote.direction * -1);
                        return votes;
                    });
                    if (dataJSON.vote.direction > 0) {
                        deletedVoteComment.votesUp.set((votesUp) => {
                            if (votesUp) {
                                votesUp--;
                            }
                            return votesUp;
                        });
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && deletedVoteComment.isVotedUp && dataJSON.vote.userId === this.state.currentUser.id.get()) {
                            deletedVoteComment.isVotedUp.set(none);
                        }
                    } else {
                        deletedVoteComment.votesDown.set((votesDown) => {
                            if (votesDown) {
                                votesDown--;
                            }
                            return votesDown;
                        });
                        if (this.state.currentUser && 'id' in this.state.currentUser && this.state.currentUser.id && deletedVoteComment.isVotedDown && dataJSON.vote.userId === this.state.currentUser.id.get()) {
                            deletedVoteComment.isVotedDown.set(none);
                        }
                    }
                }
                break;
            case 'deleted-comment':
                removeCommentOnClient({state: this.state, comment: this.state.commentsById[dataJSON.comment._id]});
                break;
            case 'new-comment':
            case 'updated-comment':
                const dataJSONComment = dataJSON.comment;
                const dataJSONExtraInfo = dataJSON.extraInfo;
                const showLiveRightAway = this.state.config.showLiveRightAway;
                const commentsById = this.state.commentsById;
                // the hidden check here is for approving, un-approving, and then re-approving a comment
                if (dataJSON.type === 'new-comment' && commentsById[dataJSONComment._id].get()) {
                    if (!commentsById[dataJSONComment._id].approved.get() && dataJSONComment.approved) {
                        dataJSON.type = 'updated-comment'; // we'll just set the comment as approved
                    } else {
                        console.log('returning', commentsById[dataJSONComment._id].get()); // TODO REMOVE
                        return;
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

                const isNew = !(commentsById[dataJSONComment._id].get());
                if (isNew) {
                    commentsById[dataJSONComment._id].set(dataJSONComment);
                } else {
                    commentsById[dataJSONComment._id].merge(dataJSONComment);
                }
                console.log('isNew?', isNew);

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
                    incOverallCommentCount(this.state.config.get(), this.state, dataJSONComment.parentId);

                    // TODO update the "Show X Comments" button text live like vanilla js widget
                    // const showCommentsMessageButton = document.querySelector('.comments-toggle');
                    // if (showCommentsMessageButton) {
                    //     showCommentsMessageButton.innerHTML = getShowHideCommentsCountText(translations, commentsVisible, commentCountOnServer);
                    // }

                    if (updateRoot) {
                        if (newCommentHidden) {
                            this.state.newRootCommentCount.set((newRootCommentCount) => {
                                newRootCommentCount++;
                                return newRootCommentCount;
                            });
                            // TODO update the "Show New X Comments" button text live.
                            // const messageRootTarget = getElementById('new-comments-message-root');
                            // if (messageRootTarget) { // element may not be in DOM - like if comments hidden.
                            //     messageRootTarget.classList.remove('hidden');
                            //     messageRootTarget.innerHTML = getNewCommentCountText(translations, newRootCommentCount);
                            // }
                        }
                    } else if (currentParent && currentParent?.get()) {
                        if (newCommentHidden) {
                            currentParent.hiddenChildrenCount.set((hiddenChildrenCount) => {
                                if (!hiddenChildrenCount) {
                                    hiddenChildrenCount = 1;
                                } else {
                                    hiddenChildrenCount++;
                                }
                                return hiddenChildrenCount;
                            });
                        }
                    }

                    const userIdsChanged = Object.keys(presenceChanges);
                    if (userIdsChanged.length > 0) {
                        // noinspection JSIgnoredPromiseFromCall - fire and forget
                        handleNewRemoteUser(this.state.config.get(), this.state.urlIdWS.get()!, this.state.userPresenceState, userIdsChanged);
                    }
                }
                break;
            case 'new-config':
                this.handleNewCustomConfig(dataJSON.config, true);
                break;
        }
    }
}
