import {State} from "@hookstate/core";
import {FastCommentsState} from "../types/fastcomments-state";

export interface GetActionTenantIdProps {
    state: State<FastCommentsState>;
    tenantId?: string;
}

export interface GetActionURLIDProps {
    state: State<FastCommentsState>;
    urlId?: string;
}

// auth middleware needs to know what tenant and url id the request is for - so can't determine all params like pageTitle on reply.
export function getActionTenantId({state, tenantId}: GetActionTenantIdProps): string {
    return state.config.tenantId.get() === 'all' && state.config.userId.get() && tenantId ? tenantId : state.config.tenantId.get()!;
}

export function getActionURLID({state, urlId}: GetActionURLIDProps): string {
    return state.config.tenantId.get() === 'all' && state.config.userId.get() && urlId && urlId ? urlId! : state.config.urlId.get()!;
}
