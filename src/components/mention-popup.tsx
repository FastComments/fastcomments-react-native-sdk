import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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

/**
 * Imperative handle so the editor can drive the popup from the keyboard
 * (arrow keys to move the highlight, Enter/Tab to select). `handleKey` returns
 * true when it consumed the key, so the caller knows to preventDefault.
 */
export interface MentionPopupHandle {
    isOpen: () => boolean;
    handleKey: (key: string) => boolean;
}

export const MentionPopup = forwardRef<MentionPopupHandle, MentionPopupProps>(function MentionPopup(
    { store, styles, query, onSelect },
    ref
) {
    const tenantId = useStoreValue(store, (s) => s.config.tenantId);
    const urlId = useStoreValue(store, (s) => s.config.urlId);
    const ssoConfigString = useStoreValue(store, (s) => s.ssoConfigString);
    const translations = useStoreValue(store, (s) => s.translations);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);

    const [users, setUsers] = useState<MentionUser[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
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
                    store,
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
    }, [query, store, tenantId, urlId, ssoConfigString]);

    // Highlight the first result whenever the result set changes.
    useEffect(() => {
        setSelectedIndex(0);
    }, [users]);

    useImperativeHandle(ref, () => ({
        isOpen: () => query !== undefined && users.length > 0,
        handleKey: (key: string): boolean => {
            if (query === undefined || users.length === 0) return false;
            if (key === 'ArrowDown') {
                setSelectedIndex((i) => (i + 1) % users.length);
                return true;
            }
            if (key === 'ArrowUp') {
                setSelectedIndex((i) => (i - 1 + users.length) % users.length);
                return true;
            }
            if (key === 'Enter' || key === 'Tab') {
                const user = users[selectedIndex] || users[0];
                if (user) onSelect(user);
                return true;
            }
            return false;
        },
    }), [query, users, selectedIndex, onSelect]);

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
                    {users.map((user, index) => {
                        const label = user.displayName || user.name;
                        const isSelected = index === selectedIndex;
                        return (
                            <TouchableOpacity
                                key={user.id}
                                testID={`mentionItem-${user.id}`}
                                accessibilityLabel={`mentionItem-${user.id}`}
                                onPress={() => onSelect(user)}
                                onPressIn={() => setSelectedIndex(index)}
                                style={[
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                    },
                                    styles.mentionPopup?.item,
                                    isSelected && { backgroundColor: hasDarkBackground ? '#3a3a3a' : '#eef2ff' },
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
});
