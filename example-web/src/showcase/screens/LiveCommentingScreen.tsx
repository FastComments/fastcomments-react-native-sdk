import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import {
    FastCommentsLiveCommenting,
    FastCommentsLiveCommentingService,
    GifBrowser,
    getDarkTheme,
    getDefaultFastCommentsStyles,
    getDefaultImageAssets,
    getLightTheme,
} from '../sdk';
import type { FastCommentsCallbacks, FastCommentsStore } from '../sdk';
import { DemoChrome } from '../chrome/DemoChrome';
import { buildConfig, SHOWCASE_URL_ID } from '../demo-config';
import type { ScreenProps } from '../types';

const CODE = `import {
  FastCommentsLiveCommenting,
  GifBrowser,
  getDefaultImageAssets,
  getDefaultFastCommentsStyles,
} from 'fastcomments-react-native-sdk';

const config = {
  tenantId: 'demo',
  urlId: 'your-page-id',
  // Simple SSO: no server signing - just a user object. The composer posts as
  // this identity and the notification bell appears for the signed-in user.
  simpleSSO: {
    username: 'Demo User',
    email: 'demo-user@fctest.com',
    avatar: 'https://i.pravatar.cc/200?u=fastcomments0',
  },
};

// Optional media pickers. pickGIF can use the built-in GifBrowser overlay.
const callbacks = {
  pickImage: async () => 'https://example.com/photo.jpg',
  pickGIF: () => new Promise((resolve) => openGifBrowser(resolve)),
};

<FastCommentsLiveCommenting config={config} callbacks={callbacks} />;`;

export function LiveCommentingScreen({ mode, shell, panelHeight }: ScreenProps) {
    const theme = mode === 'dark' ? getDarkTheme() : getLightTheme();
    const config = useMemo(() => buildConfig(SHOWCASE_URL_ID), []);

    // The GifBrowser overlay runs its own search SDK, so it needs a store. Build
    // one on demand when the user taps the GIF toolbar button.
    const [gifResolve, setGifResolve] = useState<((picked: string | false) => void) | null>(null);
    const gifStoreRef = useRef<FastCommentsStore | null>(null);

    const callbacks: FastCommentsCallbacks = useMemo(
        () => ({
            pickImage: async () => 'https://staticm.fastcomments.com/1663891248769-IMG_20200419_092549.jpg',
            pickGIF: () =>
                new Promise<string | false>((resolve) => {
                    gifStoreRef.current = FastCommentsLiveCommentingService.createStoreFromConfig(config, getDefaultImageAssets());
                    setGifResolve(() => resolve);
                }),
        }),
        [config],
    );

    const closeGif = (picked: string | false) => {
        gifResolve?.(picked);
        setGifResolve(null);
        gifStoreRef.current = null;
    };

    return (
        <DemoChrome
            shell={shell}
            breadcrumb="Widgets / Live Commenting"
            title="Live Commenting"
            subtitle="Threaded comments with realtime updates and a rich-text composer. This demo wires up GIF + image attachments and the signed-in notification bell - all authenticated with Simple SSO."
            tags={[{ label: 'demo tenant' }, { label: 'simple sso', brand: true }, { label: 'gifs · notifications' }]}
            panelHeight={panelHeight}
            code={CODE}
            codeLabel="LiveCommentingScreen.tsx"
        >
            <View style={{ flex: 1 }}>
                <FastCommentsLiveCommenting key={mode} config={config} theme={theme} callbacks={callbacks} />
                {gifResolve && gifStoreRef.current ? (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000088' }}>
                        <GifBrowser
                            cancelled={() => closeGif(false)}
                            pickedGIF={(path) => closeGif(path)}
                            config={config}
                            store={gifStoreRef.current}
                            imageAssets={getDefaultImageAssets()}
                            styles={getDefaultFastCommentsStyles(theme)}
                        />
                    </View>
                ) : null}
            </View>
        </DemoChrome>
    );
}
