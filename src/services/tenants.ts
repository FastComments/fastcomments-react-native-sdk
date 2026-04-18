import type { FastCommentsStore } from '../store/types';

export interface GetActionTenantIdProps {
    store: FastCommentsStore;
    tenantId?: string;
}

export interface GetActionURLIDProps {
    store: FastCommentsStore;
    urlId?: string;
}

// Auth middleware needs to know the tenant and url id for the request.
export function getActionTenantId({ store, tenantId }: GetActionTenantIdProps): string {
    const { config } = store.getState();
    return config.tenantId === 'all' && config.userId && tenantId ? tenantId : config.tenantId!;
}

export function getActionURLID({ store, urlId }: GetActionURLIDProps): string {
    const { config } = store.getState();
    return config.tenantId === 'all' && config.userId && urlId ? urlId : config.urlId!;
}
