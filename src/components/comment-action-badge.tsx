import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHtml, { MixedStyleDeclaration, MixedStyleRecord } from 'react-native-render-html';
import type { FastCommentsBadge } from 'fastcomments-typescript';
import type { CommentUserBadgeInfo } from 'fastcomments-sdk';
import { FastCommentsImageAsset, IFastCommentsStyles, RNComment } from '../types';
import { showError } from '../services/show-error';
import { newBroadcastId } from '../services/broadcast-id';
import { getActionTenantId } from '../services/tenants';
import { useStoreValue } from '../store/hooks';
import type { FastCommentsStore } from '../store/types';

export interface CommentActionBadgeProps {
    close: (safe?: boolean) => void;
    comment: RNComment;
    mode: 'give' | 'remove';
    onError?: (title: string, message: string) => void;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

// A pickable badge row, normalized across the give (tenant badge) and remove
// (user badge) shapes.
interface BadgeChoice {
    badgeId: string;
    displayLabel: string;
    displaySrc?: string | null;
}

// The award/remove responses return the user's updated badges in the comment
// shape; map them onto the comment so the rendered badges update immediately.
function toWidgetBadges(badges?: CommentUserBadgeInfo[] | null): FastCommentsBadge[] {
    return (badges ?? []).map((b) => ({
        id: b.id,
        type: b.type,
        description: b.description,
        displayLabel: b.displayLabel ?? '',
        displaySrc: b.displaySrc ?? '',
        backgroundColor: b.backgroundColor ?? '',
        borderColor: b.borderColor ?? '',
        textColor: b.textColor ?? '',
        cssClass: b.cssClass ?? '',
    }));
}

export function CommentActionBadge({ comment, mode, store, styles, onError, close }: CommentActionBadgeProps) {
    const translations = useStoreValue(store, (s) => s.translations);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const modalStyles = styles.commentModerationModal;
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [choices, setChoices] = useState<BadgeChoice[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const state = store.getState();
            const sdk = state.sdk;
            const sso = state.ssoConfigString;
            const tenantId = getActionTenantId({ store, tenantId: comment.tenantId });
            try {
                if (mode === 'give') {
                    const response = await sdk.moderationApi.getManualBadges({ tenantId, sso });
                    if (cancelled) return;
                    setChoices(
                        response.badges.map((b) => ({ badgeId: b.id, displayLabel: b.displayLabel, displaySrc: b.displaySrc }))
                    );
                } else {
                    const response = await sdk.moderationApi.getManualBadgesForUser({
                        tenantId,
                        badgesUserId: comment.userId,
                        commentId: comment._id,
                        sso,
                    });
                    if (cancelled) return;
                    setChoices(
                        response.badges.map((b) => ({ badgeId: b.badgeId, displayLabel: b.displayLabel, displaySrc: b.displaySrc }))
                    );
                }
            } catch (e) {
                // Non-fatal: an empty list renders the "no badges" message.
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [comment._id, comment.userId, mode, store]);

    const pick = async (badgeId: string) => {
        if (saving) return;
        setSaving(true);
        const state = store.getState();
        const broadcastId = newBroadcastId(store);
        const sso = state.ssoConfigString;
        const tenantId = getActionTenantId({ store, tenantId: comment.tenantId });
        try {
            const response =
                mode === 'give'
                    ? await state.sdk.moderationApi.putAwardBadge({ tenantId, badgeId, userId: comment.userId, commentId: comment._id, broadcastId, sso })
                    : await state.sdk.moderationApi.putRemoveBadge({ tenantId, badgeId, userId: comment.userId, commentId: comment._id, broadcastId, sso });
            setSaving(false);
            if (response.status === 'success') {
                store.getState().mergeCommentFields(comment._id, { badges: toWidgetBadges(response.badges) });
                close(true);
            } else {
                showError(':(', mode === 'give' ? translations.GIVE_BADGE_FAILURE : translations.REMOVE_BADGE_FAILURE, translations.DISMISS, onError);
            }
        } catch (e) {
            setSaving(false);
            showError(':(', mode === 'give' ? translations.GIVE_BADGE_FAILURE : translations.REMOVE_BADGE_FAILURE, translations.DISMISS, onError);
        }
    };

    return (
        <View style={modalStyles?.centeredView}>
            <View style={modalStyles?.modalView}>
                <TouchableOpacity style={modalStyles?.modalCancel} onPress={() => close(false)}>
                    <Image
                        source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                        style={{ width: 16, height: 16 }}
                    />
                </TouchableOpacity>
                <Text style={modalStyles?.title}>
                    {mode === 'give' ? translations.PICK_BADGE_TO_GIVE : translations.PICK_BADGE_TO_REMOVE}
                </Text>
                {loading ? (
                    <View style={modalStyles?.loadingView}>
                        <ActivityIndicator />
                    </View>
                ) : choices.length === 0 ? (
                    // The "no badges" copy is an HTML string (link + <br>), so render
                    // it as HTML instead of raw text.
                    <RenderHtml
                        source={{ html: mode === 'give' ? translations.MODERATION_GIVE_BADGE_NONE : translations.MODERATION_REMOVE_BADGE_NONE }}
                        contentWidth={Math.max(200, Math.min(width - 80, 360))}
                        baseStyle={modalStyles?.emptyText as MixedStyleDeclaration | undefined}
                        tagsStyles={{ a: modalStyles?.link } as MixedStyleRecord}
                        renderersProps={{ a: { onPress: (_e, href) => { if (href) void Linking.openURL(href); } } }}
                    />
                ) : (
                    <ScrollView style={modalStyles?.scroll}>
                        {choices.map((choice) => (
                            <TouchableOpacity
                                key={choice.badgeId}
                                style={modalStyles?.listItem}
                                disabled={saving}
                                onPress={() => pick(choice.badgeId)}
                            >
                                {!!choice.displaySrc && <Image source={{ uri: choice.displaySrc }} style={modalStyles?.badgeImage} />}
                                <Text style={modalStyles?.listItemTitle}>{choice.displayLabel}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
