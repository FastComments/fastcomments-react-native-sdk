import {FastCommentsCommentWithState} from "../components/comment";

// auth middleware needs to know what tenant and url id the request is for - so can't determine all params like pageTitle on reply.
export function getActionTenantId({state, comment}: FastCommentsCommentWithState): string {
    return state.config.tenantId.get() === 'all' && state.config.userId.get() && comment ? comment.tenantId.get()! : state.config.tenantId.get()!;
}

export function getActionURLID({state, comment}: FastCommentsCommentWithState): string {
    return state.config.tenantId.get() === 'all' && state.config.userId.get() && comment && comment.urlId.get() ? comment.urlId.get()! : state.config.urlId.get()!;
}
