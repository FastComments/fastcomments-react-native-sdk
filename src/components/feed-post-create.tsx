import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ImageURISource, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { FastCommentsStore } from '../store/types';
import type { IFastCommentsStyles, FastCommentsCallbacks, ImageAssetConfig } from '../types';
import type { FastCommentsRNConfig } from '../types/react-native-config';
import type { FastCommentsThemeOverrides } from '../types/fastcomments-theme';
import type { CreateFeedPostParams, FeedPost, FeedPostLink, FeedPostMediaItem } from '../types/feed-post';
import type { FastCommentsSessionUser } from '../types/user';
import { FastCommentsLiveCommentingService } from '../services/fastcomments-live-commenting';
import { resolveStyles } from '../resources/resolve-styles';
import { isDarkColor, resolveTheme } from '../resources/themes';
import { useStoreValue } from '../store/hooks';
import { CommentTextArea, type ValueObserver } from './comment-text-area';
import { editorHtmlToServerHtml } from '../services/editor/editor-html-to-server-html';
import { FeedPostMediaAttach, type AttachedMediaPending } from './feed-post-media-attach';
import { createFeedPost, setupFeedTranslations, uploadFeedMediaItem } from '../services/feed';
import { getDefaultAvatarSrc } from '../services/default-avatar';

const MAX_ITEMS = 10;

/** API handed to a custom composer toolbar button (e.g. a sticker/GIF source). */
export interface FeedComposerToolbarApi {
    /** Attach media: an http(s) url is kept as a remote item; anything else is uploaded on submit. */
    addMedia: (uriOrUrl: string) => void;
    store: FastCommentsStore;
}

/** A host-supplied button in the composer's action row (mirrors Android's custom toolbar buttons). */
export interface FeedComposerToolbarButton {
    id: string;
    label?: string;
    icon?: ImageURISource;
    onPress: (api: FeedComposerToolbarApi) => void | Promise<void>;
}

interface FeedPostCreateCommonProps extends Pick<FastCommentsCallbacks, 'pickImage' | 'pickGIF' | 'onError'> {
    /** Raw style overrides (merged on a themed tree when `theme` is also given). **/
    styles?: IFastCommentsStyles;
    /** Semantic design tokens. **/
    theme?: FastCommentsThemeOverrides;
    onPostCreated?: (post: FeedPost) => void;
    onPostCreateError?: (message: string) => void;
    onCancel?: () => void;
    /** Show a Cancel button that resets the form and calls onCancel. **/
    showCancel?: boolean;
    /** Show the optional title field above the editor. Default true. **/
    showTitle?: boolean;
    /** Host-supplied composer buttons (e.g. a GIF/sticker source). **/
    toolbarButtons?: FeedComposerToolbarButton[];
    /** Resolve tags at submit time from the current user (Android's TagSupplier). **/
    tagSupplier?: (currentUser: FastCommentsSessionUser | undefined) => string[];
}

/**
 * Either share the feed's live store (recommended - new posts appear instantly),
 * or pass a config and the composer manages its own store.
 */
export type FastCommentsFeedPostCreateProps = FeedPostCreateCommonProps &
    ({ store: FastCommentsStore; config?: undefined; assets?: undefined } | { store?: undefined; config: FastCommentsRNConfig; assets?: ImageAssetConfig });

function nextKey(): string {
    return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function userField<T = string>(user: FastCommentsSessionUser | undefined, field: string): T | undefined {
    if (user && typeof user === 'object' && field in user) {
        const v = (user as Record<string, unknown>)[field];
        if (v != null) return v as T;
    }
    return undefined;
}

/**
 * Standalone feed post composer at parity with the Android SDK's
 * `FeedPostCreateView`: author header, a rich text editor (reuses the comments
 * enriched editor), separate media attachments (≤10, local + remote/GIF), link
 * attachments, tags, custom toolbar buttons, and cancel/loading/error. Place it
 * anywhere; share the feed's store (via `onStoreReady`) so posts appear at once.
 */
export function FastCommentsFeedPostCreate(props: FastCommentsFeedPostCreateProps) {
    const { styles: stylesProp, theme, onPostCreated, onPostCreateError, onCancel, showCancel, showTitle = true, toolbarButtons, tagSupplier, pickImage, pickGIF } = props;
    const effectiveStyles = useMemo(() => resolveStyles(stylesProp, theme), [stylesProp, theme]);

    // Use the shared store, or create + init one (self-managed mode).
    const storeRef = useRef<FastCommentsStore | null>(null);
    const selfManagedRef = useRef(false);
    if (storeRef.current === null) {
        if (props.store) {
            storeRef.current = props.store;
        } else {
            const cfg = props.config;
            const hasDarkBackground = cfg.hasDarkBackground ?? (theme ? isDarkColor(resolveTheme(theme).colors.background) : undefined);
            storeRef.current = FastCommentsLiveCommentingService.createStoreFromConfig({ ...cfg, hasDarkBackground }, props.assets);
            selfManagedRef.current = true;
        }
    }
    const store = storeRef.current!;

    useEffect(() => {
        // Self-managed mode has no feed to load translations; do it here.
        if (selfManagedRef.current) {
            void setupFeedTranslations(store, store.getState().config.locale);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const translations = useStoreValue(store, (s) => s.translations);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const currentUser = useStoreValue(store, (s) => s.currentUser);

    const [title, setTitle] = useState('');
    const [attached, setAttached] = useState<AttachedMediaPending[]>([]);
    const [links, setLinks] = useState<FeedPostLink[]>([]);
    const [linkDraft, setLinkDraft] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const [hasText, setHasText] = useState(false);

    // Stable observer for reading/clearing the editor HTML imperatively.
    const output = useMemo<ValueObserver>(() => ({}), []);

    const authorName = userField<string>(currentUser, 'username') || translations.FEED_COMPOSER_ANONYMOUS || 'Anonymous';
    const authorAvatar = userField<string>(currentUser, 'avatarSrc');

    const canSubmit = !busy && (hasText || attached.length > 0 || links.length > 0 || title.trim().length > 0);

    const addMedia = (uriOrUrl: string) => {
        setAttached((prev) => {
            if (prev.length >= MAX_ITEMS) return prev;
            if (uriOrUrl.startsWith('http')) {
                return [...prev, { key: nextKey(), previewUri: uriOrUrl, remoteItem: { sizes: [{ src: uriOrUrl, w: 400, h: 300 }] } }];
            }
            return [...prev, { key: nextKey(), previewUri: uriOrUrl, sourceForUpload: uriOrUrl }];
        });
    };

    const onPick = async () => {
        if (!pickImage || busy || attached.length >= MAX_ITEMS) return;
        try {
            const photoData = await pickImage();
            if (!photoData) return;
            if (typeof photoData === 'string') {
                addMedia(photoData);
                return;
            }
            const uri = photoData.uri || photoData.base64;
            if (uri) addMedia(uri);
        } catch {
            setError(translations.FEED_MEDIA_UPLOAD_FAILED);
        }
    };

    const onAddLink = () => {
        const url = linkDraft.trim();
        if (!url) return;
        setLinks((prev) => [...prev, { url }]);
        setLinkDraft('');
        setShowLinkInput(false);
    };

    const resetForm = () => {
        setTitle('');
        setAttached([]);
        setLinks([]);
        setLinkDraft('');
        setShowLinkInput(false);
        setHasText(false);
        setError(undefined);
        output.reset?.();
    };

    const onSubmit = async () => {
        if (!canSubmit) return;
        setBusy(true);
        setError(undefined);
        try {
            // Upload pending local media; keep remote items as-is.
            const media: FeedPostMediaItem[] = [];
            for (const item of attached) {
                if (item.remoteItem) {
                    media.push(item.remoteItem);
                    continue;
                }
                if (!item.sourceForUpload) continue;
                setAttached((prev) => prev.map((m) => (m.key === item.key ? { ...m, progress: 0 } : m)));
                const result = await uploadFeedMediaItem(store, item.sourceForUpload, (loaded, total) => {
                    const ratio = total > 0 ? loaded / total : 0;
                    setAttached((prev) => prev.map((m) => (m.key === item.key ? { ...m, progress: ratio } : m)));
                });
                if ('error' in result) {
                    setAttached((prev) => prev.map((m) => (m.key === item.key ? { ...m, progress: undefined, errorKey: 'FEED_MEDIA_UPLOAD_FAILED' } : m)));
                    setError(translations.FEED_MEDIA_UPLOAD_FAILED);
                    return;
                }
                media.push(result.item);
            }

            const serverHtml = editorHtmlToServerHtml(output.getValue?.() ?? '');
            const contentHasText = serverHtml.replace(/<[^>]*>/g, '').trim().length > 0;
            const tags = tagSupplier ? tagSupplier(currentUser) : undefined;
            const params: CreateFeedPostParams = {
                title: title.trim() ? title.trim() : undefined,
                contentHTML: contentHasText ? serverHtml : undefined,
                media: media.length > 0 ? media : undefined,
                links: links.length > 0 ? links : undefined,
                tags: tags && tags.length > 0 ? tags : undefined,
                fromUserId: userField<string>(currentUser, 'id'),
                fromUserDisplayName: userField<string>(currentUser, 'username'),
            };

            const res = await createFeedPost(store, params);
            if ('error' in res) {
                setError(translations.FEED_LOAD_FAILED || res.error);
                onPostCreateError?.(res.error);
                return;
            }
            resetForm();
            onPostCreated?.(res.post);
        } finally {
            setBusy(false);
        }
    };

    const f = effectiveStyles.feed;
    return (
        <View style={f?.composer} testID="feedPostCreate" accessibilityLabel="feedPostCreate">
            <View style={f?.composerHeader}>
                <Image
                    style={f?.composerAvatar}
                    source={authorAvatar ? { uri: authorAvatar } : getDefaultAvatarSrc(imageAssets)}
                />
                <Text style={f?.composerAuthorName} numberOfLines={1}>{authorName}</Text>
            </View>

            {showTitle && (
                <TextInput
                    testID="postTitleEditText"
                    accessibilityLabel="postTitleEditText"
                    style={f?.composerInputTitle}
                    placeholder={translations.FEED_COMPOSER_TITLE_PLACEHOLDER}
                    value={title}
                    onChangeText={setTitle}
                    editable={!busy}
                />
            )}

            <CommentTextArea
                store={store}
                styles={effectiveStyles}
                output={output}
                onChange={(html) => setHasText(html.replace(/<[^>]*>/g, '').trim().length > 0)}
                onSubmit={onSubmit}
                saving={busy}
                // Media lives in the separate attachment list (Android-style), so
                // the editor handles text/formatting only - no inline image/GIF.
                toolbarButtons={{ bold: true, italic: true, underline: true, strikethrough: true, code: false, image: false, gif: false }}
            />

            {pickImage && (
                <FeedPostMediaAttach
                    translations={translations}
                    styles={effectiveStyles}
                    items={attached}
                    disabled={busy}
                    onPick={onPick}
                    onRemove={(key) => setAttached((prev) => prev.filter((m) => m.key !== key))}
                />
            )}

            {links.length > 0 && (
                <View style={f?.composerLinkList}>
                    {links.map((link, i) => (
                        <View key={`${link.url}-${i}`} style={f?.composerLinkPreview}>
                            <Text style={f?.composerLinkPreviewText} numberOfLines={1}>{link.title || link.url}</Text>
                            <TouchableOpacity onPress={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}>
                                <Text style={f?.composerLinkRemove}>{translations.FEED_COMPOSER_REMOVE_LINK || '✕'}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {showLinkInput ? (
                <View style={f?.composerLinkRow}>
                    <TextInput
                        testID="feedComposerLinkInput"
                        accessibilityLabel="feedComposerLinkInput"
                        style={f?.composerLinkInput}
                        placeholder={translations.FEED_COMPOSER_LINK_PLACEHOLDER || 'https://…'}
                        value={linkDraft}
                        onChangeText={setLinkDraft}
                        autoCapitalize="none"
                        editable={!busy}
                        onSubmitEditing={onAddLink}
                    />
                    <TouchableOpacity style={f?.composerLinkAddButton} onPress={onAddLink}>
                        <Text style={f?.composerLinkAddButtonText}>{translations.FEED_COMPOSER_ADD_LINK || 'Add'}</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {(toolbarButtons?.length || !showLinkInput) ? (
                <View style={f?.composerToolbar}>
                    {!showLinkInput && (
                        <TouchableOpacity
                            testID="feedComposerAddLinkButton"
                            accessibilityLabel="feedComposerAddLinkButton"
                            style={f?.composerToolbarButton}
                            onPress={() => setShowLinkInput(true)}
                            disabled={busy}
                        >
                            <Text style={f?.composerToolbarButtonLabel}>{translations.FEED_COMPOSER_LINK_BUTTON || '🔗'}</Text>
                        </TouchableOpacity>
                    )}
                    {(toolbarButtons ?? []).map((btn) => (
                        <TouchableOpacity
                            key={btn.id}
                            testID={`feedComposerButton-${btn.id}`}
                            accessibilityLabel={`feedComposerButton-${btn.id}`}
                            style={f?.composerToolbarButton}
                            disabled={busy}
                            onPress={() => btn.onPress({ addMedia, store })}
                        >
                            {btn.icon ? <Image source={btn.icon} style={f?.composerToolbarButtonIcon} /> : null}
                            {btn.label ? <Text style={f?.composerToolbarButtonLabel}>{btn.label}</Text> : null}
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}

            {error && (
                <Text testID="feedComposerError" accessibilityLabel="feedComposerError" style={f?.composerMediaPreviewError}>
                    {error}
                </Text>
            )}

            <View style={f?.composerActions}>
                {showCancel && (
                    <TouchableOpacity
                        testID="feedComposerCancel"
                        accessibilityLabel="feedComposerCancel"
                        style={f?.composerCancel}
                        disabled={busy}
                        onPress={() => {
                            resetForm();
                            onCancel?.();
                        }}
                    >
                        <Text style={f?.composerCancelText}>{translations.FEED_COMPOSER_CANCEL || 'Cancel'}</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    testID="submitPostButton"
                    accessibilityLabel="submitPostButton"
                    style={[f?.composerSubmit, !canSubmit ? f?.composerSubmitDisabled : null]}
                    onPress={onSubmit}
                    disabled={!canSubmit}
                >
                    <Text style={f?.composerSubmitText}>{translations.FEED_SUBMIT_POST}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
