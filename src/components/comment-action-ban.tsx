import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FastCommentsImageAsset, IFastCommentsStyles, RNComment } from '../types';
import { showError } from '../services/show-error';
import { newBroadcastId } from '../services/broadcast-id';
import { getActionTenantId } from '../services/tenants';
import { useStoreValue } from '../store/hooks';
import type { FastCommentsStore } from '../store/types';

export interface CommentActionBanProps {
    close: (safe?: boolean) => void;
    comment: RNComment;
    onError?: (title: string, message: string) => void;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

// The server interprets these duration keys; `bannedUntil` is the key string,
// not a date (matches the web moderation extension's <select> values).
const BAN_DURATIONS: { key: string; labelKey: string }[] = [
    { key: 'forever', labelKey: 'MODERATION_BAN_DURATION_FOREVER' },
    { key: 'one-hour', labelKey: 'MODERATION_BAN_DURATION_ONE_HOUR' },
    { key: 'one-day', labelKey: 'MODERATION_BAN_DURATION_ONE_DAY' },
    { key: 'one-week', labelKey: 'MODERATION_BAN_DURATION_ONE_WEEK' },
    { key: 'one-month', labelKey: 'MODERATION_BAN_DURATION_ONE_MONTH' },
    { key: 'six-months', labelKey: 'MODERATION_BAN_DURATION_SIX_MONTHS' },
    { key: 'one-year', labelKey: 'MODERATION_BAN_DURATION_ONE_YEAR' },
];

export function CommentActionBan({ comment, store, styles, onError, close }: CommentActionBanProps) {
    const translations = useStoreValue(store, (s) => s.translations);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const modalStyles = styles.commentModerationModal;

    const [loadingOptions, setLoadingOptions] = useState(true);
    const [saving, setSaving] = useState(false);
    const [emailDomain, setEmailDomain] = useState<string | null>(null);
    const [canIPBan, setCanIPBan] = useState(false);

    const [isShadowBan, setIsShadowBan] = useState(false);
    const [banEmail, setBanEmail] = useState(false);
    const [banEmailDomain, setBanEmailDomain] = useState(false);
    const [banIP, setBanIP] = useState(false);
    const [duration, setDuration] = useState('one-day');
    const [reason, setReason] = useState('');
    const [deleteAllComments, setDeleteAllComments] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const state = store.getState();
            const sdk = state.sdk;
            const sso = state.ssoConfigString;
            const tenantId = getActionTenantId({ store, tenantId: comment.tenantId });
            try {
                const [status, preference] = await Promise.all([
                    sdk.moderationApi.getCommentBanStatus({ tenantId, commentId: comment._id, sso }),
                    sdk.moderationApi.getUserBanPreference({ tenantId, sso }),
                ]);
                if (cancelled) return;
                const domain = status.emailDomain ?? null;
                const ipBannable = status.canIPBan === true;
                setEmailDomain(domain);
                setCanIPBan(ipBannable);
                const prefs = preference.preferences;
                // Seed the form from the moderator's last-used ban preferences.
                setBanEmail(!!domain && (!prefs || prefs.shouldBanEmail));
                setBanIP(ipBannable && (!prefs || prefs.shouldBanByIP));
                if (prefs?.lastBanDuration) setDuration(prefs.lastBanDuration);
                // The server stores the shadow-ban preference as 'perma-shadow'
                // ('perma' for a normal ban); the web maps it the same way.
                if (prefs?.lastBanType === 'perma-shadow') setIsShadowBan(true);
            } catch (e) {
                // Non-fatal: the form still opens; the moderator picks options manually.
            } finally {
                if (!cancelled) setLoadingOptions(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [comment._id, store]);

    const closeIcon = (
        <TouchableOpacity style={modalStyles?.modalCancel} onPress={() => close(false)}>
            <Image
                source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                style={{ width: 16, height: 16 }}
            />
        </TouchableOpacity>
    );

    const hasBanOptions = !!emailDomain || canIPBan;

    const submit = async () => {
        if (!banEmail && !banEmailDomain && !banIP) {
            showError(':(', translations.BAN_FAILURE, translations.DISMISS, onError);
            return;
        }
        setSaving(true);
        const state = store.getState();
        try {
            const response = await state.sdk.moderationApi.postBanUserFromComment({
                tenantId: getActionTenantId({ store, tenantId: comment.tenantId }),
                commentId: comment._id,
                banEmail,
                banEmailDomain,
                banIP,
                deleteAllUsersComments: deleteAllComments,
                bannedUntil: duration,
                isShadowBan,
                banReason: reason.trim() ? reason.trim() : undefined,
                updateId: newBroadcastId(store),
                sso: state.ssoConfigString,
            });
            setSaving(false);
            if (response.status === 'success') {
                close(true);
            } else {
                showError(':(', translations.BAN_FAILURE, translations.DISMISS, onError);
            }
        } catch (e) {
            setSaving(false);
            showError(':(', translations.BAN_FAILURE, translations.DISMISS, onError);
        }
    };

    // A render helper (not a nested component) so the option rows don't remount
    // on every keystroke/toggle.
    const renderToggle = (on: boolean, onPress: () => void, label: string) => (
        <View style={modalStyles?.optionRow}>
            <Text style={modalStyles?.optionLabel}>{label}</Text>
            <TouchableOpacity style={on ? modalStyles?.toggleActive : modalStyles?.toggle} onPress={onPress}>
                <Text style={on ? modalStyles?.toggleTextActive : modalStyles?.toggleText}>{on ? '✓' : '○'}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={modalStyles?.centeredView}>
            <View style={modalStyles?.modalView}>
                {closeIcon}
                <Text style={modalStyles?.title}>{translations.COMMENT_MENU_BAN}</Text>
                {loadingOptions ? (
                    <View style={modalStyles?.loadingView}>
                        <ActivityIndicator />
                    </View>
                ) : (
                    <ScrollView style={modalStyles?.scroll}>
                        <Text style={modalStyles?.message}>{translations.BAN_CONFIRMATION_MESSAGE}</Text>

                        {/* Ban type */}
                        <View style={modalStyles?.section}>
                            <View style={modalStyles?.choiceRow}>
                                <TouchableOpacity
                                    style={!isShadowBan ? modalStyles?.choiceActive : modalStyles?.choice}
                                    onPress={() => setIsShadowBan(false)}
                                >
                                    <Text style={!isShadowBan ? modalStyles?.choiceTextActive : modalStyles?.choiceText}>
                                        {translations.MODERATION_BAN_TYPE_BAN}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={isShadowBan ? modalStyles?.choiceActive : modalStyles?.choice}
                                    onPress={() => setIsShadowBan(true)}
                                >
                                    <Text style={isShadowBan ? modalStyles?.choiceTextActive : modalStyles?.choiceText}>
                                        {translations.MODERATION_BAN_TYPE_SHADOW_BAN}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Ban via options */}
                        {hasBanOptions ? (
                            <View style={modalStyles?.section}>
                                {!!emailDomain && renderToggle(banEmail, () => setBanEmail(!banEmail), translations.MODERATION_OPTION_BAN_VIA_EMAIL)}
                                {!!emailDomain &&
                                    renderToggle(
                                        banEmailDomain,
                                        () => setBanEmailDomain(!banEmailDomain),
                                        translations.MODERATION_BAN_ALL_EMAIL_DOMAIN.replace('[domain]', emailDomain)
                                    )}
                                {canIPBan && renderToggle(banIP, () => setBanIP(!banIP), translations.MODERATION_OPTION_BAN_VIA_IP)}
                            </View>
                        ) : (
                            <Text style={modalStyles?.message}>{translations.MODERATION_NO_EMAIL}</Text>
                        )}

                        {/* Duration */}
                        <View style={modalStyles?.section}>
                            <Text style={modalStyles?.optionLabel}>{translations.MODERATION_BAN_DURATION}</Text>
                            <View style={modalStyles?.choiceRow}>
                                {BAN_DURATIONS.map((d) => (
                                    <TouchableOpacity
                                        key={d.key}
                                        style={duration === d.key ? modalStyles?.choiceActive : modalStyles?.choice}
                                        onPress={() => setDuration(d.key)}
                                    >
                                        <Text style={duration === d.key ? modalStyles?.choiceTextActive : modalStyles?.choiceText}>
                                            {translations[d.labelKey]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Reason */}
                        <View style={modalStyles?.section}>
                            <Text style={modalStyles?.optionLabel}>{translations.MODERATION_BAN_REASON}</Text>
                            <TextInput
                                style={modalStyles?.input}
                                value={reason}
                                onChangeText={setReason}
                                placeholder={translations.MODERATION_BAN_REASON_PLACEHOLDER}
                            />
                        </View>

                        {/* Delete all comments */}
                        <View style={modalStyles?.section}>
                            {renderToggle(
                                deleteAllComments,
                                () => setDeleteAllComments(!deleteAllComments),
                                translations.MODERATION_BAN_DELETES_COMMENT_NOTE
                            )}
                        </View>

                        <TouchableOpacity
                            style={modalStyles?.dangerButton}
                            disabled={saving || !hasBanOptions}
                            onPress={submit}
                        >
                            <Text style={modalStyles?.dangerButtonText}>{saving ? translations.BAN_SAVING : translations.BAN_CONFIRM}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
