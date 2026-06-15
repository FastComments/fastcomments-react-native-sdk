import type { FastCommentsStore } from '../store/types';

export interface PageReactsState {
    /** Total count per react id. **/
    counts: Record<string, number>;
    /** React ids the current user has selected. **/
    reactedIds: string[];
}

/** Load the page-level react counts + the current user's selections. */
export async function loadPageReacts(store: FastCommentsStore): Promise<PageReactsState | null> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    const urlId = state.config.urlId;
    if (!tenantId || !urlId) return null;
    const response = await state.sdk.publicApi.getV2PageReacts({
        tenantId,
        urlId,
    });
    if (response.status !== 'success') return null;
    return {
        counts: response.counts ?? {},
        reactedIds: response.reactedIds ?? [],
    };
}

/** Add or remove the user's page react. Returns false on failure. */
export async function setPageReact(store: FastCommentsStore, reactId: string, isSelected: boolean): Promise<boolean> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    const urlId = state.config.urlId;
    if (!tenantId || !urlId) return false;
    const response = isSelected
        ? await state.sdk.publicApi.createV2PageReact({
              tenantId,
              urlId,
              id: reactId,
              title: state.config.pageTitle,
          })
        : await state.sdk.publicApi.deleteV2PageReact({
              tenantId,
              urlId,
              id: reactId,
          });
    return response.status === 'success';
}

/** Names of the users who selected a react (pageReactConfig.showUsers). */
export async function getPageReactUserNames(store: FastCommentsStore, reactId: string): Promise<string[] | null> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    const urlId = state.config.urlId;
    if (!tenantId || !urlId) return null;
    const response = await state.sdk.publicApi.getV2PageReactUsers({
        tenantId,
        urlId,
        id: reactId,
    });
    if (response.status !== 'success') return null;
    return response.userNames ?? [];
}
