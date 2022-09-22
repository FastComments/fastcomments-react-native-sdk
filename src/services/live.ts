import {FastCommentsState} from "../types";
import {SubscriberInstance, subscribeToChanges} from "./subscribe-to-changes";
import {checkBlockedComments} from "./blocking";
import {addCommentToUserPresenceState, handleNewRemoteUser, setupUserPresenceState} from "./user-presense";
import {WebsocketLiveEvent} from "../types";
import {none, State} from "@hookstate/core";
import {broadcastIdsSent} from "./broadcast-id";
import {removeCommentOnClient} from "./remove-comment-on-client";
import {repositionComment} from "./comment-positioning";
import {addCommentToTree} from "./comment-trees";
import {incOverallCommentCount} from "./comment-count";
import {handleNewCustomConfig} from "./custom-config";

const SubscriberInstanceById: Record<string, SubscriberInstance | void> = {};

export function handleLiveEvent(state: State<FastCommentsState>, dataJSON: WebsocketLiveEvent) {
    console.log('handleLiveEvent', dataJSON); // TODO remove
    if ('broadcastId' in dataJSON && broadcastIdsSent.includes(dataJSON.broadcastId)) {
        return;
    }
    if ('bId' in dataJSON && broadcastIdsSent.includes(dataJSON.bId)) {
        return;
    }
    switch (dataJSON.type) {
        case 'new-badge':
            for (const comment of state.allComments) {
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
            for (const comment of state.allComments) {
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
            state.userNotificationState.count.set((count) => {
                if (count) {
                    count++;
                } else {
                    count = 1;
                }
                return count;
            });
            if (state.userNotificationState.notifications.get()) {
                state.userNotificationState.notifications.set((notifications) => {
                    notifications.unshift(dataJSON.notification);
                    return notifications;
                });
            }
            break;
        case 'presence-update':
            if (dataJSON.uj) {
                for (const userJoined of dataJSON.uj) {
                    state.userPresenceState.usersOnlineMap[userJoined].set(true);
                }
            }
            if (dataJSON.ul) {
                for (const userLeft of dataJSON.ul) {
                    state.userPresenceState.usersOnlineMap[userLeft].set(false);
                }
            }
            break;
        case 'new-vote':
            const newVoteComment = state.commentsById[dataJSON.vote.commentId];
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
                    if (state.currentUser && 'id' in state.currentUser && state.currentUser.id && dataJSON.vote.userId === state.currentUser.id.get()) {
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
                    if (state.currentUser && 'id' in state.currentUser && state.currentUser.id && dataJSON.vote.userId === state.currentUser.id.get()) {
                        newVoteComment.isVotedDown.set(true);
                    }
                }
            }
            break;
        case 'deleted-vote':
            const deletedVoteComment = state.commentsById[dataJSON.vote.commentId];
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
                    if (state.currentUser && 'id' in state.currentUser && state.currentUser.id && deletedVoteComment.isVotedUp && dataJSON.vote.userId === state.currentUser.id.get()) {
                        deletedVoteComment.isVotedUp.set(none);
                    }
                } else {
                    deletedVoteComment.votesDown.set((votesDown) => {
                        if (votesDown) {
                            votesDown--;
                        }
                        return votesDown;
                    });
                    if (state.currentUser && 'id' in state.currentUser && state.currentUser.id && deletedVoteComment.isVotedDown && dataJSON.vote.userId === state.currentUser.id.get()) {
                        deletedVoteComment.isVotedDown.set(none);
                    }
                }
            }
            break;
        case 'deleted-comment':
            removeCommentOnClient({state: state, comment: state.commentsById[dataJSON.comment._id]});
            break;
        case 'new-comment':
        case 'updated-comment':
            const dataJSONComment = dataJSON.comment;
            const dataJSONExtraInfo = dataJSON.extraInfo;
            const showLiveRightAway = state.config.showLiveRightAway.get();
            const commentsById = state.commentsById;
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
            console.log('????? isNew', isNew);

            if (!isNew) {
                if (dataJSONExtraInfo) {
                    if (dataJSONExtraInfo.commentPositions) {
                        repositionComment(dataJSONComment._id, dataJSONExtraInfo.commentPositions, state);
                    }
                }
            } else {
                const presenceChanges = {};
                addCommentToUserPresenceState(state.userPresenceState, dataJSONComment, presenceChanges);
                dataJSONComment.isLive = true; // so we can animate the background color
                // commentsVisible check is here because if comments are hidden, we want this comment to show as soon as comments are un-hidden.
                const newCommentHidden = state.commentsVisible.get({stealth: true}) && !showLiveRightAway;
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

                addCommentToTree(state.allComments, state.commentsTree, commentsById, dataJSONComment, !!state.config.newCommentsToBottom.get());
                incOverallCommentCount(state.config.countAll.get(), state, dataJSONComment.parentId);

                if (updateRoot) {
                    if (newCommentHidden) {
                        state.newRootCommentCount.set((newRootCommentCount) => {
                            newRootCommentCount++;
                            return newRootCommentCount;
                        });
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
                    handleNewRemoteUser(state.config.get(), state.urlIdWS.get()!, state.userPresenceState, userIdsChanged);
                }
            }
            break;
        case 'new-config':
            handleNewCustomConfig(state, dataJSON.config, true);
            break;
    }
}

export function persistSubscriberState(state: State<FastCommentsState>, newUrlIdWS: string, newTenantIdWS: string, newUserIdWS: string | null) {
    const didChange = state.urlIdWS.get() !== newUrlIdWS || state.tenantIdWS.get() !== newTenantIdWS || state.userIdWS.get() !== newUserIdWS;
    if (!didChange) {
        return;
    }
    state.urlIdWS.set(newUrlIdWS);
    state.tenantIdWS.set(newTenantIdWS);
    state.userIdWS.set(newUserIdWS);

    const instanceId = state.instanceId.get();
    const prevInstance = SubscriberInstanceById[instanceId];
    if (prevInstance) {
        prevInstance.close();
    }

    SubscriberInstanceById[instanceId] = subscribeToChanges(state.config.get(), state.wsHost.get(), state.tenantIdWS.get()!, state.config.urlId.get()!, state.urlIdWS.get()!, state.userIdWS.get()!, async (commentIds: string[]) => {
        return await checkBlockedComments(state.get(), commentIds);
    }, (dataJSON: WebsocketLiveEvent) => {
        handleLiveEvent(state, dataJSON);
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
            setupUserPresenceState(state, newUrlIdWS); // TODO can cause exception if handled event after component unmounted, how to detect?
        }
    });
}
