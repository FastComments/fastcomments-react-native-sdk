import { SubscriberInstance, subscribeToChanges } from './subscribe-to-changes';
import { checkBlockedComments } from './blocking';
import { addCommentToPresenceIndex, handleNewRemoteUser, setupUserPresenceState } from './user-presense';
import { RNComment, WebsocketLiveEvent } from '../types';
import { removeCommentOnClient } from './remove-comment-on-client';
import { repositionComment } from './comment-positioning';
import { incOverallCommentCount } from './comment-count';
import { handleNewCustomConfig } from './custom-config';
import { applyOnlineUsersPresenceUpdate } from './online-users';
import type { FastCommentsStore } from '../store/types';

const SubscriberInstanceById: Record<string, SubscriberInstance | void> = {};

export function handleLiveEvent(store: FastCommentsStore, dataJSON: WebsocketLiveEvent) {
    const state = store.getState();
    if ('broadcastId' in dataJSON && state.broadcastIdsSent.has(dataJSON.broadcastId)) {
        return;
    }
    if ('bId' in dataJSON && state.broadcastIdsSent.has(dataJSON.bId)) {
        return;
    }

    switch (dataJSON.type) {
        case 'new-badge':
            if (dataJSON.badge.userId) state.applyBadge(dataJSON.badge.userId, dataJSON.badge, false);
            state.rememberBroadcastId(dataJSON.broadcastId);
            break;

        case 'removed-badge':
            if (dataJSON.badge.userId) state.applyBadge(dataJSON.badge.userId, dataJSON.badge, true);
            state.rememberBroadcastId(dataJSON.broadcastId);
            break;

        case 'notification':
            state.incNotificationCount(1);
            if (state.userNotificationState.notifications.length > 0) {
                state.prependNotification(dataJSON.notification);
            }
            break;

        case 'p-u': {
            // Activity-dot presence map (keyed by raw id, incl. anon) + the
            // status-bar subscriber count.
            if (dataJSON.uj && dataJSON.uj.length > 0) {
                state.setUsersOnline(dataJSON.uj, true);
            }
            if (dataJSON.ul && dataJSON.ul.length > 0) {
                state.setUsersOnline(dataJSON.ul, false);
            }
            if (typeof dataJSON.sc === 'number') {
                state.setSubscriberCount(Math.max(dataJSON.sc, 1));
            }
            // Incrementally update the online-users list/facepile (add/remove +
            // debounced name/avatar enrich) instead of re-fetching the whole list.
            applyOnlineUsersPresenceUpdate(store, { uj: dataJSON.uj, ul: dataJSON.ul, sc: dataJSON.sc });
            break;
        }

        case 'new-vote': {
            const currentUser = state.currentUser;
            const userId = currentUser && 'id' in currentUser ? currentUser.id : undefined;
            const isByCurrentUser = !!userId && dataJSON.vote.userId === userId;
            state.applyVoteDelta(dataJSON.vote.commentId, dataJSON.vote.direction, false, isByCurrentUser);
            break;
        }

        case 'deleted-vote': {
            const currentUser = state.currentUser;
            const userId = currentUser && 'id' in currentUser ? currentUser.id : undefined;
            const isByCurrentUser = !!userId && dataJSON.vote.userId === userId;
            state.applyVoteDelta(dataJSON.vote.commentId, dataJSON.vote.direction, true, isByCurrentUser);
            break;
        }

        case 'deleted-comment':
            removeCommentOnClient(store, dataJSON.comment._id);
            break;

        case 'new-comment':
        case 'updated-comment': {
            const dataJSONComment = dataJSON.comment;
            const dataJSONExtraInfo = dataJSON.extraInfo;
            const showLiveRightAway = !!state.config.showLiveRightAway;
            const existing = state.byId[dataJSONComment._id];

            // Approval flip: approving a previously-unapproved comment is treated as an update, not a new insert.
            if (dataJSON.type === 'new-comment' && existing) {
                if (!existing.approved && dataJSONComment.approved) {
                    dataJSON.type = 'updated-comment';
                } else {
                    return;
                }
            }

            const isNew = !existing;
            if (isNew) {
                const newCommentHidden = state.commentsVisible && !showLiveRightAway;
                const commentWithFlags = {
                    ...dataJSONComment,
                    isLive: true,
                    hidden: newCommentHidden,
                } as typeof dataJSONComment;

                // Find the first visible parent (for the "8 new comments" counter).
                let updateRoot = false;
                let visibleParentId: string | undefined;
                if (!dataJSONComment.parentId) {
                    updateRoot = true;
                } else {
                    let cursorId: string | null | undefined = dataJSONComment.parentId;
                    let iterations = 0;
                    while (cursorId && iterations < 5000) {
                        iterations++;
                        const parent: RNComment | undefined = state.byId[cursorId];
                        if (!parent) break;
                        if (parent.hidden !== true) {
                            visibleParentId = cursorId;
                            break;
                        }
                        cursorId = parent.parentId;
                    }
                    if (!visibleParentId) {
                        updateRoot = true;
                    }
                }

                state.upsertComment(commentWithFlags, !!state.config.newCommentsToBottom);
                addCommentToPresenceIndex(store, commentWithFlags);
                incOverallCommentCount(state.config.countAll, store, dataJSONComment.parentId);

                if (updateRoot) {
                    if (newCommentHidden) {
                        state.incNewRootCommentCount(1);
                    }
                } else if (visibleParentId && newCommentHidden) {
                    state.incHiddenChildrenCount(visibleParentId, 1);
                }

                const presenceUserIds = [dataJSONComment.userId, dataJSONComment.anonUserId].filter(
                    Boolean
                ) as string[];
                if (presenceUserIds.length > 0 && state.urlIdWS) {
                    void handleNewRemoteUser(state.config, state.urlIdWS, store, presenceUserIds);
                }
            } else {
                state.mergeCommentFields(dataJSONComment._id, dataJSONComment);
                if (dataJSONExtraInfo?.commentPositions) {
                    repositionComment(dataJSONComment._id, dataJSONExtraInfo.commentPositions, store);
                }
            }
            break;
        }

        case 'new-config':
            handleNewCustomConfig(store, dataJSON.config, true);
            break;

        case 'new-feed-post':
            // Banner-only mechanic: do NOT insert the post into the visible
            // list. We just bump the counter so the host can render a
            // "Show N new posts" banner. On banner tap the host reloads the
            // head of the feed and we replace the in-memory list.
            if (dataJSON.feedPost) state.incFeedNewPostsCount(1);
            break;

        case 'updated-feed-post': {
            const fp = dataJSON.feedPost;
            const id = fp?.id ?? fp?._id;
            if (fp && id) {
                const { _id, ...rest } = fp;
                state.updateFeedPost({ ...rest, id });
            }
            break;
        }

        case 'deleted-feed-post':
            if (dataJSON.postId) state.removeFeedPost(dataJSON.postId);
            break;

        case 'fr':
        case 'dfr': {
            // Remote reactions: we know +1/-1 but the server doesn't tell us
            // who reacted, so we never touch the local user's `myReacts`
            // (third arg undefined). Local writes are filtered out earlier by
            // the `broadcastIdsSent` check.
            const r = dataJSON.feedPostReact;
            if (r?.postId && r.reactType) {
                const delta = dataJSON.type === 'fr' ? 1 : -1;
                state.applyFeedPostReactDelta(r.postId, r.reactType, delta);
            }
            break;
        }
    }
}

export function cleanupSubscriber(instanceId: string) {
    const instance = SubscriberInstanceById[instanceId];
    if (instance) {
        instance.close();
        delete SubscriberInstanceById[instanceId];
    }
}

export function persistSubscriberState(
    store: FastCommentsStore,
    newUrlIdWS: string,
    newTenantIdWS: string,
    newUserIdWS: string | null
) {
    const state = store.getState();
    const didChange =
        state.urlIdWS !== newUrlIdWS ||
        state.tenantIdWS !== newTenantIdWS ||
        state.userIdWS !== newUserIdWS;
    if (!didChange) return;

    state.setWSIds(newUrlIdWS, newTenantIdWS, newUserIdWS);

    const instanceId = state.instanceId;
    const prevInstance = SubscriberInstanceById[instanceId];
    if (prevInstance) prevInstance.close();

    SubscriberInstanceById[instanceId] = subscribeToChanges(
        store,
        state.config,
        state.wsHost,
        newTenantIdWS,
        state.config.urlId!,
        newUrlIdWS,
        newUserIdWS!,
        async (commentIds: string[]) => checkBlockedComments(store, commentIds),
        (dataJSON: WebsocketLiveEvent) => handleLiveEvent(store, dataJSON),
        (isConnected, lastEventTime) => {
            const s = store.getState();
            s.setWsConnected(isConnected);
            const currentUser = s.currentUser;
            if (currentUser && 'id' in currentUser) {
                s.setUsersOnline([currentUser.id], isConnected);
            }
            if (isConnected) {
                // Seed subscriber count to 1 (self) until the next presence-update lands.
                if (s.subscriberCount < 1) s.setSubscriberCount(1);
                const isReconnect = !!lastEventTime;
                if (isReconnect) {
                    s.setUserIdsToCommentIds({});
                    s.replaceUsersOnlineMap({});
                }
                void setupUserPresenceState(store, newUrlIdWS);
            } else {
                s.setSubscriberCount(0);
            }
        }
    );
}
