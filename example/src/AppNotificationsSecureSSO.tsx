// @ts-ignore - TODO REMOVE
import * as React from 'react';
import {useEffect} from "react";
import {getNotificationDisplayHTML, getNotificationTranslations, getUserNotifications} from "../../src/services/notifications";

// So you can connect to the Secure SSO service example running on your machine from the emulator or phone on local LAN/WIFI.
const MY_LOCAL_IP = 'xxx.xxx.xxx.xxx';

/**
 * @description Periodically check the user's notifications using Secure SSO.
 */
export default function AppNotificationsSecureSSO() {
    const myTenantId = 'demo'; // Your tenant id. Can be fetched from https://fastcomments.com/auth/my-account/api-secret
    const myAppPageId = 'native-test'; // the ID or URL of the comment thread in your app.

    const fastCommentsConfig = {
        tenantId: myTenantId,
        urlId: myAppPageId,
        pageTitle: 'Some Page' // this will auto-create pages, which makes notifications nicer. You can name pages in your app.
    }

    const getConfigWithAuth = async () => {
        // run the nodejs sso example in fastcomments-code-examples. In production you'd call your own backend API!
        const userResponse = await fetch(`http://${MY_LOCAL_IP}:3003/sso-user-info`);
        const ssoJSON = await userResponse.json();

        return {
            ...fastCommentsConfig,
            tenantId: myTenantId,
            urlId: myAppPageId,
            sso: {
                verificationHash: ssoJSON.verificationHash,
                userDataJSONBase64: ssoJSON.userDataJSONBase64,
                timestamp: ssoJSON.timestamp,
            }
        }
    };

    useEffect(() => {
        let timeout: number;

        (async function () {
            const config = await getConfigWithAuth();
            const notificationTranslationsResponse = await getNotificationTranslations(config); // config will contain locale
            if (notificationTranslationsResponse.status !== 'success') {
                console.warn('Could not get translations for notifications?');
            }
            const notificationTranslations = notificationTranslationsResponse.translations!;
            async function getAndLogNotifications() {
                const notificationsResponse = await getUserNotifications({
                    config,
                    unreadOnly: true,
                    afterId: undefined // you can paginate if desired
                });
                console.log('Got notifications!', notificationsResponse); // do something with this
                const lastNotification = notificationsResponse?.notifications[0];
                if (lastNotification) {
                    console.log('Last notification HTML was', getNotificationDisplayHTML(lastNotification, notificationTranslations));
                }
            }
            await getAndLogNotifications();

            async function getNotificationsIn30Minutes() {
                timeout = setTimeout(async () => {
                    await getAndLogNotifications();
                    // noinspection ES6MissingAwait
                    getNotificationsIn30Minutes();
                }, 60_000 * 30);
            }

            // noinspection ES6MissingAwait
            getNotificationsIn30Minutes();
        })();

        return () => clearTimeout(timeout);
    });

    return null
}
