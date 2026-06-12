import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { getPageReactUserNames, loadPageReacts, setPageReact } from '../services/page-reacts';

export interface PageReactsBarProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

/**
 * Page-level reacts (config.pageReactConfig): a row of image buttons with
 * counts above the composer, like the web widget's page-reacts extension.
 * Tapping toggles the react; with showUsers, tapping the count reveals who
 * reacted.
 */
export function PageReactsBar({ store, styles }: PageReactsBarProps) {
    const pageReactConfig = useStoreValue(store, (s) => s.config.pageReactConfig);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [reactedIds, setReactedIds] = useState<string[]>([]);
    const [userNamesByReactId, setUserNamesByReactId] = useState<Record<string, string[]>>({});

    useEffect(() => {
        let isMounted = true;
        void (async () => {
            try {
                const state = await loadPageReacts(store);
                if (state && isMounted) {
                    setCounts(state.counts);
                    setReactedIds(state.reactedIds);
                }
            } catch (e) {
                console.error('Failed to load page reacts', e);
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    if (!pageReactConfig || !pageReactConfig.reacts || pageReactConfig.reacts.length === 0) return null;

    const toggle = (reactId: string) => {
        const isSelected = !reactedIds.includes(reactId);
        // Optimistic: mirror the web extension, revert only on failure.
        setReactedIds((prev) => (isSelected ? [...prev, reactId] : prev.filter((id) => id !== reactId)));
        setCounts((prev) => ({ ...prev, [reactId]: Math.max(0, (prev[reactId] ?? 0) + (isSelected ? 1 : -1)) }));
        void (async () => {
            try {
                const ok = await setPageReact(store, reactId, isSelected);
                if (!ok) throw new Error('page react rejected');
            } catch (e) {
                console.error('Failed to save page react', e);
                setReactedIds((prev) => (isSelected ? prev.filter((id) => id !== reactId) : [...prev, reactId]));
                setCounts((prev) => ({ ...prev, [reactId]: Math.max(0, (prev[reactId] ?? 0) + (isSelected ? -1 : 1)) }));
            }
        })();
    };

    const showUsers = (reactId: string) => {
        if (!pageReactConfig.showUsers) return;
        if (userNamesByReactId[reactId]) {
            setUserNamesByReactId((prev) => {
                const next = { ...prev };
                delete next[reactId];
                return next;
            });
            return;
        }
        void (async () => {
            try {
                const names = await getPageReactUserNames(store, reactId);
                if (names) setUserNamesByReactId((prev) => ({ ...prev, [reactId]: names }));
            } catch (e) {
                console.error('Failed to load page react users', e);
            }
        })();
    };

    return (
        <View style={styles.pageReacts?.root} testID="pageReactsBar" accessibilityLabel="pageReactsBar">
            <View style={styles.pageReacts?.row}>
                {pageReactConfig.reacts.map((react) => {
                    const isSelected = reactedIds.includes(react.id);
                    const count = counts[react.id] ?? 0;
                    return (
                        <View key={react.id} style={styles.pageReacts?.react}>
                            <TouchableOpacity
                                testID={`pageReactCount-${react.id}`}
                                accessibilityLabel={`pageReactCount-${react.id}`}
                                hitSlop={{ top: 10, bottom: 10, left: 6, right: 4 }}
                                onPress={() => showUsers(react.id)}
                            >
                                <Text style={[styles.pageReacts?.countText, count === 0 && styles.commentVote?.votesZeroText]}>
                                    {count.toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                testID={`pageReact-${react.id}`}
                                accessibilityLabel={`pageReact-${react.id}`}
                                style={styles.pageReacts?.reactButton}
                                hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
                                onPress={() => toggle(react.id)}
                            >
                                <Image
                                    source={{ uri: isSelected && react.selectedSrc ? react.selectedSrc : react.src }}
                                    style={styles.pageReacts?.reactImage}
                                />
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
            {Object.entries(userNamesByReactId).map(([reactId, names]) => (
                <Text
                    key={reactId}
                    testID={`pageReactUsers-${reactId}`}
                    accessibilityLabel={`pageReactUsers-${reactId}`}
                    style={styles.pageReacts?.usersText}
                >
                    {names.join(', ')}
                </Text>
            ))}
        </View>
    );
}
