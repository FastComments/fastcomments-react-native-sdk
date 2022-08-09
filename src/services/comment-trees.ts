import { FastCommentsWidgetComment } from "fastcomments-typescript";
import {CommentState} from "../types/fastcomments-state";

export function getCommentsTreeAndCommentsById(collapseRepliesByDefault: boolean, commentState: Record<string, CommentState>, rawComments: FastCommentsWidgetComment[]) {
    const commentsById: Record<string, FastCommentsWidgetComment> = {};
    const commentsLength = rawComments.length;
    const resultComments = [];

    let comment, i;
    for (i = 0; i < commentsLength; i++) {
        const comment = rawComments[i];
        commentsById[comment._id] = comment;
    }

    for (i = 0; i < commentsLength; i++) {
        comment = rawComments[i];
        comment.nestedChildrenCount = 0;
        //!commentsById[comment.parentId] check for user profile feed
        if (collapseRepliesByDefault && (!comment.parentId || !commentsById[comment.parentId]) && (commentState[comment._id]?.repliesHidden === undefined)) {
            if (!commentState[comment._id]) {
                commentState[comment._id] = {
                    repliesHidden: true
                };
            } else {
                commentState[comment._id].repliesHidden = true;
            }
        }
        const parentId = comment.parentId;
        if (parentId && commentsById[parentId]) {
            if (!commentsById[parentId].children) {
                commentsById[parentId].children = [comment];
            } else { // checking if comment is already in children causes lag
                commentsById[parentId].children!.push(comment);
            }
        } else {
            resultComments.push(comment);
        }
    }

    for (i = 0; i < commentsLength; i++) {
        comment = rawComments[i];
        let parentId = comment.parentId;
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

export function ensureRepliesOpenToComment(commentState: Record<string, CommentState>, commentsById: Record<string, FastCommentsWidgetComment>, commentId: string) {
    let parentId: string | null | undefined = commentId;
    let iterations = 0;
    while(parentId && iterations < 100) {
        iterations++;
        if (commentState[parentId]) {
            delete commentState[parentId].repliesHidden;
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
export function addCommentToTree(allComments: FastCommentsWidgetComment[], commentsTree: FastCommentsWidgetComment[], commentsById: Record<string, FastCommentsWidgetComment>, comment: FastCommentsWidgetComment, newCommentsToBottom: boolean) {
    if (comment.parentId && !commentsById[comment.parentId]) { // don't use memory for this comment since its parent is not visible. they should be received in-order to the client.
        return;
    }
    allComments.push(comment);
    if (comment.parentId) {
        if (!commentsById[comment.parentId].children) {
            commentsById[comment.parentId].children = [comment];
        } else {
            if (newCommentsToBottom) {
                commentsById[comment.parentId].children!.push(comment);
            } else {
                commentsById[comment.parentId].children!.unshift(comment);
            }
        }
    } else {
        // ensure pinned comments stay at the top
        if (commentsTree.length > 0 && commentsTree[0].isPinned) {
            let found = false;
            for (let i = 0; i < commentsTree.length; i++) {
                if (!commentsTree[i].isPinned) {
                    commentsTree.splice(i, 0, comment);
                    found = true;
                    break;
                }
            }
            // means they're all pinned
            if (!found) {
                commentsTree.push(comment);
            }
        } else {
            if (newCommentsToBottom) {
                commentsTree.push(comment);
            } else {
                commentsTree.unshift(comment);
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
export function removeCommentFromTree(allComments: FastCommentsWidgetComment[], commentsTree: FastCommentsWidgetComment[], commentsById: Record<string, FastCommentsWidgetComment>, comment: FastCommentsWidgetComment) {
    const allCommentsIndex = allComments.indexOf(comment);
    if (allCommentsIndex > -1) {
        allComments.splice(allCommentsIndex, 1);
    }
    if (comment.parentId && commentsById[comment.parentId]) {
        const parentChildren = commentsById[comment.parentId].children;
        if (parentChildren) {
            const index = parentChildren.indexOf(comment);
            if (index > -1) {
                parentChildren.splice(index, 1);
            }
        }
    } else {
        const index = commentsTree.indexOf(comment);
        if (index > -1) {
            commentsTree.splice(index, 1);
        }
    }
    delete commentsById[comment._id];
    updateNestedChildrenCountInTree(commentsById, comment.parentId, -1);
}

/**
 *
 * @param {Object.<string, Object>} commentsById
 * @param {string} parentId
 * @param {number} inc
 */
export function updateNestedChildrenCountInTree(commentsById: Record<string, FastCommentsWidgetComment>, parentId: string | null | undefined, inc: number) {
    while (parentId) {
        const comment = commentsById[parentId];
        if (comment) {
            if (comment.nestedChildrenCount === undefined) {
                comment.nestedChildrenCount = 0;
            }
            comment.nestedChildrenCount += inc;
            parentId = comment.parentId;
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
