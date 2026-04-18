import type { StateCreator } from 'zustand';
import type { ConfigSlice, FastCommentsStoreState } from '../types';
import type { FastCommentsRNConfig } from '../../types/react-native-config';
import type { FastCommentsSessionUser } from '../../types/user';
import type { ImageAssetConfig } from '../../types/image-asset';
import type { SubscriberInstance } from '../../services/subscribe-to-changes';

export interface ConfigSliceInitial {
    apiHost: string;
    wsHost: string;
    config: FastCommentsRNConfig;
    currentUser: FastCommentsSessionUser;
    imageAssets: ImageAssetConfig;
    isDemo: boolean;
    instanceId: string;
    translations?: Record<string, string>;
}

export const createConfigSlice =
    (initial: ConfigSliceInitial): StateCreator<FastCommentsStoreState, [], [], ConfigSlice> =>
    (set) => ({
        PAGE_SIZE: 30,
        apiHost: initial.apiHost,
        wsHost: initial.wsHost,
        config: initial.config,
        currentUser: initial.currentUser,
        translations: initial.translations ?? {},
        imageAssets: initial.imageAssets,
        isDemo: initial.isDemo,
        isSiteAdmin: false,
        instanceId: initial.instanceId,
        moderatingTenantIds: undefined,
        hasBillingIssue: false,
        blockingErrorMessage: undefined,
        urlIdWS: undefined,
        tenantIdWS: undefined,
        userIdWS: undefined,
        lastSubscriberInstance: undefined,
        ssoConfigString: undefined,

        setConfig: (config) => set({ config }),
        mergeConfig: (partial) =>
            set((state) => ({ config: { ...state.config, ...partial } })),
        setCurrentUser: (user) => set({ currentUser: user }),
        setTranslations: (translations) => set({ translations }),
        setIsSiteAdmin: (is) => set({ isSiteAdmin: is }),
        setHasBillingIssue: (has) => set({ hasBillingIssue: has }),
        setBlockingErrorMessage: (msg) => set({ blockingErrorMessage: msg }),
        setModeratingTenantIds: (ids) => set({ moderatingTenantIds: ids }),
        setWSIds: (urlIdWS, tenantIdWS, userIdWS) =>
            set({ urlIdWS, tenantIdWS, userIdWS }),
        setLastSubscriberInstance: (instance: SubscriberInstance | undefined) =>
            set({ lastSubscriberInstance: instance }),
        setSSOConfigString: (s) => set({ ssoConfigString: s }),
    });
