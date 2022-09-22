import {FastCommentsWidgetComment} from "fastcomments-typescript";
import {none, State} from "@hookstate/core";
import {RNComment} from "../types/react-native-comment";

export function getCommentsTreeAndCommentsById(collapseRepliesByDefault: boolean, rawComments: RNComment[]) {
    const commentsById: Record<string, FastCommentsWidgetComment> = {};
    const commentsLength = rawComments.length;
    const resultComments: FastCommentsWidgetComment[] = [];

    let comment, i;
    for (i = 0; i < commentsLength; i++) {
        const comment = rawComments[i];
        commentsById[comment._id] = comment;
    }

    for (i = 0; i < commentsLength; i++) {
        comment = rawComments[i];
        comment.nestedChildrenCount = 0
        //!commentsById[comment.parentId] check for user profile feed
        if (collapseRepliesByDefault && (!(comment.parentId) || !commentsById[comment.parentId!]) && (comment!.repliesHidden === undefined)) {
            comment.repliesHidden = true;
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

export function ensureRepliesOpenToComment(commentsById: Record<string, RNComment>, commentId: string) {
    let parentId: string | null | undefined = commentId;
    let iterations = 0;
    while (parentId && iterations < 100) {
        iterations++;
        const parent: RNComment = commentsById[parentId];
        if (parent) {
            parent.repliesHidden = true;
            parentId = parent.parentId;
        } else {
            break;
        }
    }
}

export function addCommentToTree(allComments: State<FastCommentsWidgetComment[]>, commentsTree: State<FastCommentsWidgetComment[]>, commentsById: State<Record<string, FastCommentsWidgetComment>>, comment: FastCommentsWidgetComment, newCommentsToBottom: boolean) {
    if (comment.parentId && !(commentsById[comment.parentId]?.get())) { // don't use memory for this comment since its parent is not visible. they should be received in-order to the client.
        return;
    }
    allComments.merge([comment]);
    if (comment.parentId) {
        commentsById[comment.parentId].children.set((children) => {
            if (!children) {
                children = [comment]
            } else if (newCommentsToBottom) {
                children.push(comment);
            } else {
                children.unshift(comment);
            }
            return [...children];
        });
        // We do this to tell the tree to re-render.
        // commentsTree and commentsById use the same references to comment objects. commentsById has "ownership" of the comments. However, adding a child does not trigger the UI, which is based on the tree, to re-render.
        // we could always have both contain a reference to a State<Comment> that is unwrapped every time we use it, but this has extra overhead.
        // It may be better to store the children in state.commentState[id], but this adds a hashmap lookup on render (which is still better than N time here!).
        // *Another* solution would be for commentsTree to just be a tree of ids (like an index) and the actual documents are owned by commentsById. This would have constant time updates/iteration, but slower overall.
        commentsTree.set((tree) => {
            return [...tree];
        });
    } else {
        const stealth = {stealth: true}; // avoid extra object allocation
        // ensure pinned comments stay at the top
        if (commentsTree.length > 0 && commentsTree[0].isPinned.get(stealth)) {
            let found = false;
            for (let i = 0; i < commentsTree.length; i++) {
                if (!commentsTree[i].isPinned.get(stealth)) {
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

export function removeCommentFromTree(allComments: State<FastCommentsWidgetComment[]>, commentsTree: State<FastCommentsWidgetComment[]>, commentsById: State<Record<string, FastCommentsWidgetComment>>, comment: FastCommentsWidgetComment) {
    const commentBeforeRemoval = JSON.parse(JSON.stringify(comment));
    const allCommentsIndex = allComments.get().findIndex((otherComment) => otherComment._id === commentBeforeRemoval._id);
    if (allCommentsIndex > -1) {
        allComments[allCommentsIndex].set(none);
    }

    // allComments.set((allComments) => {
    //     const allCommentsIndex = allComments.findIndex((otherComment) => otherComment._id === commentBeforeRemoval._id);
    //     console.log('allCommentsIndex', allCommentsIndex); // TODO REMOVE
    //     if (allCommentsIndex > -1) {
    //         allComments.splice(allCommentsIndex, 1);
    //     }
    //     console.log('allComments Spliced', allCommentsIndex); // TODO REMOVE
    //     return allComments;
    // });
    console.log('comment.parentId:');
    console.log('???', commentBeforeRemoval);
    if (commentBeforeRemoval.parentId) {
        console.log('commentsById[commentBeforeRemoval.parentId].get()');
        console.log(commentsById[commentBeforeRemoval.parentId].get());
    }
    if (commentBeforeRemoval.parentId && commentsById[commentBeforeRemoval.parentId].get()) {
        const parentChildrenState = commentsById[commentBeforeRemoval.parentId].children;
        const parentChildren = parentChildrenState?.get();
        if (parentChildren) {
            const index = parentChildren.findIndex((otherComment) => otherComment._id === commentBeforeRemoval._id);
            if (index > -1) {
                // @ts-ignore
                parentChildrenState[index].set(none);
            }
            // const index = parentChildren.findIndex((otherComment) => otherComment._id === commentBeforeRemoval._id);
            // if (index > -1) {
            //     parentChildrenState.set((parentChildrenState) => {
            //         parentChildrenState!.splice(index, 1);
            //         return parentChildrenState;
            //     });
            // }
        }
    } else {
        const index = commentsTree.get().findIndex((otherComment) => otherComment?._id === commentBeforeRemoval._id);
        console.log('commentsTree index', index); // TODO REMOVE
        if (index > -1) {
            commentsTree[index].set(none);
        }
        // const index = commentsTree.get().findIndex((otherComment) => otherComment._id === commentBeforeRemoval._id);
        // console.log('commentsTree index', index); // TODO REMOVE
        // if (index > -1) {
        //     commentsTree.set((commentsTree) => {
        //         commentsTree.splice(index, 1);
        //         return commentsTree;
        //     });
        // }
    }
    updateNestedChildrenCountInTree(commentsById, commentBeforeRemoval.parentId, -1);
    commentsById[commentBeforeRemoval._id].set(none);
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

export function iterateCommentsTreeState(nodes: State<RNComment[]> | State<RNComment>[], cb: (comment: State<RNComment>) => false | 'delete' | undefined | void) {
    let i = nodes.length;
    while (i--) {
        const comment = nodes[i];
        const result = cb(comment);
        if (result === false) {
            break;
        }
        if (comment.children) {
            // @ts-ignore
            iterateCommentsTreeState(comment.children, cb);
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
