import {FastCommentsWidgetComment} from "fastcomments-typescript";
import {CommentState} from "../types/fastcomments-state";
import {none, State} from "@hookstate/core";

export function getCommentsTreeAndCommentsById(collapseRepliesByDefault: boolean, commentState: State<Record<string, CommentState>>, rawComments: State<FastCommentsWidgetComment[]>) {
    const commentsById: Record<string, FastCommentsWidgetComment> = {};
    const commentsLength = rawComments.length;
    const resultComments: FastCommentsWidgetComment[] = [];

    let comment, i;
    for (i = 0; i < commentsLength; i++) {
        const comment = rawComments[i];
        commentsById[comment._id.get()] = comment.get();
    }

    for (i = 0; i < commentsLength; i++) {
        comment = rawComments[i];
        comment.nestedChildrenCount.set(0);
        //!commentsById[comment.parentId] check for user profile feed
        if (collapseRepliesByDefault && (!comment.parentId || !commentsById[comment.parentId?.get()!]) && (commentState[comment._id.get()]?.repliesHidden === undefined)) {
            if (!commentState[comment._id.get()]) {
                commentState[comment._id.get()].set({
                    repliesHidden: true
                });
            } else {
                commentState[comment._id.get()].repliesHidden.set(true);
            }
        }
        const parentId = comment.parentId?.get();
        if (parentId && commentsById[parentId]) {
            if (!commentsById[parentId].children) {
                commentsById[parentId].children = [comment.get()];
            } else { // checking if comment is already in children causes lag
                commentsById[parentId].children!.push(comment.get());
            }
        } else {
            resultComments.push(comment.get());
        }
    }

    for (i = 0; i < commentsLength; i++) {
        comment = rawComments[i];
        let parentId = comment.parentId?.get();
        while (parentId) {
            comment = commentsById[parentId];
            if (comment) {
                comment.nestedChildrenCount!++;
                parentId = comment.parentId;
            } else {
                break;
            }
        }
    }

    return {
        comments: resultComments,
        commentsById: commentsById
    };
}

export function ensureRepliesOpenToComment(commentState: State<Record<string, CommentState>>, commentsById: Record<string, FastCommentsWidgetComment>, commentId: string) {
    let parentId: string | null | undefined = commentId;
    let iterations = 0;
    while (parentId && iterations < 100) {
        iterations++;
        if (commentState[parentId]) {
            commentState[parentId].repliesHidden.set(none);
        }
        if (commentsById[parentId]) {
            parentId = commentsById[parentId].parentId;
        } else {
            break;
        }
    }
}

/**
 *
 * @param {Object} allComments
 * @param {Array.<Object>} commentsTree
 * @param {Object.<string, Object>} commentsById
 * @param {Object} comment
 * @param {boolean} newCommentsToBottom
 */
export function addCommentToTree(allComments: State<FastCommentsWidgetComment[]>, commentsTree: State<FastCommentsWidgetComment[]>, commentsById: State<Record<string, FastCommentsWidgetComment>>, comment: FastCommentsWidgetComment, newCommentsToBottom: boolean) {
    if (comment.parentId && !commentsById[comment.parentId]) { // don't use memory for this comment since its parent is not visible. they should be received in-order to the client.
        return;
    }
    allComments.merge([comment]);
    if (comment.parentId) {
        if (!commentsById[comment.parentId].children) {
            commentsById[comment.parentId].children.set([comment]);
        } else {
            if (newCommentsToBottom) {
                commentsById[comment.parentId].children.merge([comment]);
            } else {
                commentsById[comment.parentId].children.set((children) => {
                    children!.unshift(comment);
                    return children;
                });
            }
        }
    } else {
        // ensure pinned comments stay at the top
        if (commentsTree.length > 0 && commentsTree[0].isPinned) {
            let found = false;
            for (let i = 0; i < commentsTree.length; i++) {
                if (!commentsTree[i].isPinned) {
                    commentsTree.set((commentsTree) => {
                        commentsTree.splice(i, 0, comment);
                        return commentsTree;
                    });
                    found = true;
                    break;
                }
            }
            // means they're all pinned
            if (!found) {
                commentsTree.merge([comment]);
            }
        } else {
            if (newCommentsToBottom) {
                commentsTree.merge([comment]);
            } else {
                commentsTree.set((commentsTree) => {
                    commentsTree.unshift(comment);
                    return commentsTree;
                });
            }
        }
    }
    updateNestedChildrenCountInTree(commentsById, comment.parentId, 1);
}

/**
 *
 * @param {Object} allComments
 * @param {Array.<Object>} commentsTree
 * @param {Object.<string, Object>} commentsById
 * @param {Object} comment
 */
export function removeCommentFromTree(allComments: State<FastCommentsWidgetComment[]>, commentsTree: State<FastCommentsWidgetComment[]>, commentsById: State<Record<string, FastCommentsWidgetComment>>, comment: FastCommentsWidgetComment) {
    allComments.set((allComments) => {
        const allCommentsIndex = allComments.findIndex((otherComment) => otherComment._id === comment._id);
        console.log('allCommentsIndex', allCommentsIndex); // TODO REMOVE
        if (allCommentsIndex > -1) {
            allComments.splice(allCommentsIndex, 1);
        }
        return allComments;
    });
    if (comment.parentId && commentsById[comment.parentId].get()) {
        const parentChildrenState = commentsById[comment.parentId].children;
        const parentChildren = parentChildrenState?.get();
        if (parentChildren) {
            const index = parentChildren.findIndex((otherComment) => otherComment._id === comment._id);
            if (index > -1) {
                parentChildrenState.set((parentChildrenState) => {
                    parentChildrenState!.splice(index, 1);
                    return parentChildrenState;
                });
            }
        }
    } else {
        const index = commentsTree.get().findIndex((otherComment) => otherComment._id === comment._id);
        console.log('commentsTree index', index); // TODO REMOVE
        if (index > -1) {
            commentsTree.set((commentsTree) => {
                commentsTree.splice(index, 1);
                return commentsTree;
            });
        }
    }
    updateNestedChildrenCountInTree(commentsById, comment.parentId, -1);
    commentsById[comment._id].set(none);
}

/**
 *
 * @param {Object.<string, Object>} commentsById
 * @param {string} parentId
 * @param {number} inc
 */
export function updateNestedChildrenCountInTree(commentsById: State<Record<string, FastCommentsWidgetComment>>, parentId: string | null | undefined, inc: number) {
    while (parentId) {
        const comment = commentsById[parentId];
        if (comment) {
            comment.nestedChildrenCount.set((nestedChildrenCount) => {
                if (nestedChildrenCount === undefined) {
                    nestedChildrenCount = 1;
                } else {
                    nestedChildrenCount += inc;
                }
                return nestedChildrenCount;
            });
            parentId = comment.parentId?.get();
        } else {
            break;
        }
    }
}

export function iterateCommentsTree(nodes: FastCommentsWidgetComment[], cb: (comment: FastCommentsWidgetComment) => boolean | 'delete' | undefined | void) {
    let i = nodes.length;
    while (i--) {
        const comment = nodes[i];
        const result = cb(comment);
        if (result === false) {
            break;
        }
        if (comment.children) {
            iterateCommentsTree(comment.children, cb);
        }
    }
}


// /**
//  *
//  * @param {translations} translations
//  * @param {Array.<Object>} commentsTree
//  * @param {Object.<string, Object>} commentsById
//  * @param {Object.<string, boolean>} commentRepliesHiddenById
//  * @param {string} parentId
//  */
// export function updateNestedChildrenCountInDOM(translations, commentsTree, commentsById, commentRepliesHiddenById, parentId) {
//     while (parentId) {
//         const comment = commentsById[parentId];
//         if (!comment) {
//             break;
//         }
//         const element = document.getElementById(parentId);
//
//         if (element) {
//             const toggleRepliesElement = element.querySelector('.toggle-replies');
//             if (toggleRepliesElement) {
//                 // TODO
//                 // toggleRepliesElement.outerHTML = getCommentReplyToggleHTML(translations, commentRepliesHiddenById, comment);
//             }
//         }
//
//         parentId = comment.parentId;
//     }
// }
