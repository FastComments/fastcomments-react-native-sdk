import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { IFastCommentsStyles } from '../types';
import { getDefaultAvatarSrc } from '../services/default-avatar';
import { MentionUser, searchMentionUsers } from '../services/mentions';

const SEARCH_DEBOUNCE_MS = 150;

export interface MentionPopupProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    /** Active query (text after the `@`). When undefined, popup is hidden. */
    query?: string;
    onSelect: (user: MentionUser) => void;
}

export function MentionPopup({ store, styles, query, onSelect }: MentionPopupProps) {
    const apiHost = useStoreValue(store, (s) => s.apiHost);
    const tenantId = useStoreValue(store, (s) => s.config.tenantId);
    const urlId = useStoreValue(store, (s) => s.config.urlId);
    const ssoConfigString = useStoreValue(store, (s) => s.ssoConfigString);
    const translations = useStoreValue(store, (s) => s.translations);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);

    const [users, setUsers] = useState<MentionUser[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const requestSeqRef = useRef<number>(0);

    useEffect(() => {
        if (query === undefined) {
            setUsers([]);
            setLoading(false);
            return;
        }
        if (!query.trim() || !tenantId || !urlId) {
            setUsers([]);
            setLoading(false);
            return;
        }
        const seq = ++requestSeqRef.current;
        setLoading(true);
        const handle = setTimeout(async () => {
            try {
                const results = await searchMentionUsers({
                    apiHost,
                    tenantId,
                    urlId,
                    usernameStartsWith: query,
                    sso: ssoConfigString,
                });
                if (requestSeqRef.current === seq) {
                    setUsers(results);
                    setLoading(false);
                }
            } catch (e) {
                if (requestSeqRef.current === seq) {
                    setUsers([]);
                    setLoading(false);
                }
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [query, apiHost, tenantId, urlId, ssoConfigString]);

    const popupStyle = useMemo(() => ({
        backgroundColor: hasDarkBackground ? '#2c2c2c' : 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: hasDarkBackground ? '#444' : '#ddd',
        maxHeight: 220,
        ...styles.mentionPopup?.root,
    }), [hasDarkBackground, styles.mentionPopup?.root]);

    if (query === undefined) return null;
    if (!loading && users.length === 0 && !query.trim()) return null;

    const itemTextColor = hasDarkBackground ? '#fff' : '#222';

    return (
        <View
            testID="mentionPopup"
            accessibilityLabel="mentionPopup"
            style={popupStyle}
        >
            {loading && users.length === 0 && (
                <View style={[{ padding: 12, flexDirection: 'row', alignItems: 'center' }, styles.mentionPopup?.loadingRow]}>
                    <ActivityIndicator size="small" />
                    <Text style={[{ marginLeft: 8, color: itemTextColor }, styles.mentionPopup?.loadingText]}>
                        {translations.MENTION_SEARCHING}
                    </Text>
                </View>
            )}
            {!loading && users.length === 0 && query.trim().length > 0 && (
                <View style={[{ padding: 12 }, styles.mentionPopup?.emptyRow]}>
                    <Text style={[{ color: itemTextColor }, styles.mentionPopup?.emptyText]}>
                        {translations.MENTION_NO_MATCHES}
                    </Text>
                </View>
            )}
            {users.length > 0 && (
                <ScrollView keyboardShouldPersistTaps="always">
                    {users.map((user) => {
                        const label = user.displayName || user.name;
                        return (
                            <TouchableOpacity
                                key={user.id}
                                testID={`mentionItem-${user.id}`}
                                accessibilityLabel={`mentionItem-${user.id}`}
                                onPress={() => onSelect(user)}
                                style={[
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                    },
                                    styles.mentionPopup?.item,
                                ]}
                            >
                                <Image
                                    source={user.avatarSrc ? { uri: user.avatarSrc } : getDefaultAvatarSrc(imageAssets)}
                                    style={[
                                        { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
                                        styles.mentionPopup?.avatar,
                                    ]}
                                />
                                <Text style={[{ color: itemTextColor }, styles.mentionPopup?.itemText]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
