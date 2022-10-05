// @ts-ignore - TODO REMOVE
import * as React from 'react';
import {useState} from 'react';

import {FastCommentsCallbacks, FastCommentsLiveCommenting, getDefaultFastCommentsStyles, getDefaultImageAssets} from '../../index';
import {FastCommentsCommentWidgetConfig} from 'fastcomments-typescript';
import {GifBrowser, GifBrowserProps} from "../../src/components/gif-browser";
import {View} from "react-native";

/**
 * @description
 * Demonstrates the image and gif picker (separate features).
 * For picking images, use whatever component/library you want.
 * For picking GIFs, you can use whatever component/library you want or the provided FastComments GifPicker as shown.
 */
export default function AppCommentingImageSelection() {
    const myTenantId = 'demo'; // Your tenant id. Can be fetched from https://fastcomments.com/auth/my-account/api-secret
    const myAppPageId = 'test'; // the ID or URL of the comment thread in your app.

    const [config] = useState<FastCommentsCommentWidgetConfig>({
        tenantId: myTenantId,
        urlId: myAppPageId,
        showLiveRightAway: true,
        countAll: true,
    });

    const [gifPickerConfig, setGifPickerConfig] = useState<GifBrowserProps | null>(null);

    const callbacks: FastCommentsCallbacks = {
        pickImage: async () => {
            // you can also return a FastCommentsFromDiskAsset, which maps to most popular react-native image picker libraries.
            return 'https://staticm.fastcomments.com/1663891248769-IMG_20200419_092549.jpg';
        },
        pickGIF: async () => {
            // only a public path is allowed to be returned from this.
            return new Promise<string | false>((resolve) => {
                setGifPickerConfig({
                    cancelled: () => {
                        setGifPickerConfig(null);
                        resolve(false);
                    },
                    config,
                    imageAssets: getDefaultImageAssets(),
                    pickedGIF: (gifPath) => {
                        resolve(gifPath);
                        setGifPickerConfig(null);
                    },
                    styles: getDefaultFastCommentsStyles()
                });
            });
        }
    };

    return (
        <View style={{flex: 1}}>
            <FastCommentsLiveCommenting config={config} callbacks={callbacks}/>
            {gifPickerConfig ? <GifBrowser
                cancelled={gifPickerConfig.cancelled}
                config={config}
                pickedGIF={gifPickerConfig.pickedGIF}
                imageAssets={gifPickerConfig.imageAssets}
                styles={gifPickerConfig.styles}
            /> : null}
        </View>
    );
}
