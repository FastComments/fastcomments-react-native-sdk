import { FastCommentsRNConfig } from '../../../src/types/react-native-config';
import { TestTenant } from '../api/tenant';

export interface BuildConfigParams {
    tenant: TestTenant;
    urlId: string;
    ssoToken?: string;
    overrides?: Partial<FastCommentsRNConfig>;
}

/**
 * Build a FastCommentsRNConfig wired to a test tenant. The SDK accepts the
 * SSO payload as either a JSON string in `config.sso` (parsed) or via
 * `simpleSSO`. We prefer the secure SSO path since the Android tests do.
 */
export function buildSDKConfig(params: BuildConfigParams): FastCommentsRNConfig {
    const { tenant, urlId, ssoToken, overrides } = params;
    const cfg: FastCommentsRNConfig = {
        tenantId: tenant.tenantId,
        urlId,
        ...(overrides || {}),
    } as FastCommentsRNConfig;
    if (ssoToken) {
        // The SDK calls JSON.stringify on config.sso when building the wire-format
        // SSO param. So we need to pass the parsed object, not the JSON string.
        (cfg as any).sso = JSON.parse(ssoToken);
    }
    return cfg;
}
