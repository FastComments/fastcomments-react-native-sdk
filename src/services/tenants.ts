import {FastCommentsCommentWithState} from "../components/comment";

// auth middleware needs to know what tenant and url id the request is for - so can't determine all params like pageTitle on reply.
export function getActionTenantId({state, comment}: FastCommentsCommentWithState) {
    return state.config.tenantId === 'all' && state.config.userId && comment ? comment.tenantId : state.config.tenantId;
}

export function getActionURLID({state, comment}: FastCommentsCommentWithState) {
    return state.config.tenantId === 'all' && state.config.userId && comment && comment.urlId ? comment.urlId : state.config.urlId;
}
