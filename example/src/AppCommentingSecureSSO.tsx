// @ts-ignore - TODO REMOVE
import * as React from 'react';
import {FastCommentsLiveCommenting, getDefaultImageAssets} from '../../index';
import {useState} from 'react';
import {ActivityIndicator} from "react-native";
import {getDefaultFastCommentsStyles} from "../../src/resources";
import {FastCommentsRNConfig} from "../../src/types/react-native-config";

// So you can connect to the Secure SSO service example running on your machine from the emulator or phone on local LAN/WIFI.
const MY_LOCAL_IP = 'xxx.xxx.xxx.xxx';

/**
 * @description Chat-style example (scrollable comments list first with chat at bottom), with the dark theme, using Secure SSO.
 */
export default function AppSecureSSODarkChat() {
    const myTenantId = 'demo'; // Your tenant id. Can be fetched from https://fastcomments.com/auth/my-account/api-secret
    const myAppPageId = 'native-test'; // the ID or URL of the comment thread in your app.

    const [isLoaded, setLoaded] = useState(false);
    const [config, setConfig] = useState<FastCommentsRNConfig>({
        tenantId: myTenantId,
        urlId: myAppPageId,
        sso: {}
    });

    const styles = getDefaultFastCommentsStyles();
    const assets = getDefaultImageAssets();
    const callbacks = {};

    const getUserInfo = async () => {
        if (isLoaded) {
            return;
        }
        // run the nodejs sso example in fastcomments-code-examples
        const userResponse = await fetch(`http://${MY_LOCAL_IP}:3003/sso-user-info`);
        const ssoJSON = await userResponse.json();

        setConfig({
            ...config,
            tenantId: myTenantId,
            urlId: myAppPageId,
            showLiveRightAway: true,
            countAll: true,
            sso: {
                verificationHash: ssoJSON.verificationHash,
                userDataJSONBase64: ssoJSON.userDataJSONBase64,
                timestamp: ssoJSON.timestamp,
            }
        });
        setLoaded(true);
    };
    // noinspection JSIgnoredPromiseFromCall
    getUserInfo();

    return (
        isLoaded ? <FastCommentsLiveCommenting config={config} styles={styles} callbacks={callbacks} assets={assets}/> : <ActivityIndicator size="large"/>
    );
}
