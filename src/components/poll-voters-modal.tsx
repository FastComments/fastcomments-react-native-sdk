import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { GetPollVoterNamesSuccessResponse } from 'fastcomments-sdk';
import type { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { fetchPollVoters, getPollVotersCountText, POLL_VOTER_SEARCH_DEBOUNCE_MS, pollTextToPlain } from '../services/polls';

export interface PollVotersModalProps {
    commentId: string;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
    onClose: () => void;
}

type VotersState = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; response: GetPollVoterNamesSuccessResponse };

/** Who voted for what, a page at a time, with a name search. Mirrors the web widget's voter list dialog. */
export function PollVotersModal({ commentId, store, styles, translations, onClose }: PollVotersModalProps) {
    const s = styles.polls;
    const locale = useStoreValue(store, (state) => state.config.locale);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [voters, setVoters] = useState<VotersState>({ status: 'loading' });
    // Every fetch claims an id so a slow earlier page cannot overwrite a newer one when it lands.
    const requestId = useRef(0);

    useEffect(() => {
        const id = ++requestId.current;
        setVoters({ status: 'loading' });
        fetchPollVoters(store, commentId, page, search).then(
            (response) => {
                if (id === requestId.current) {
                    setVoters({ status: 'loaded', response });
                }
            },
            () => {
                if (id === requestId.current) {
                    setVoters({ status: 'failed' });
                }
            }
        );
    }, [store, commentId, page, search]);

    useEffect(() => {
        if (searchInput === search) {
            return;
        }
        const timer = setTimeout(() => {
            setSearch(searchInput);
            // A new search starts over rather than landing on a page that may not exist.
            setPage(0);
        }, POLL_VOTER_SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [searchInput, search]);

    let body;
    if (voters.status === 'loading') {
        body = <Text style={s?.votersStatus}>{translations.POLL_VOTERS_LOADING}</Text>;
    } else if (voters.status === 'failed') {
        body = (
            <Text testID="pollVotersFailed" style={s?.votersStatus}>
                {translations.POLL_VOTERS_FAILED}
            </Text>
        );
    } else if (!voters.response.voters.length) {
        body = <Text style={s?.votersStatus}>{translations.POLL_VOTERS_NONE}</Text>;
    } else {
        const rows = voters.response.voters;
        body = rows.map((voter, index) => (
            <View
                key={index}
                testID={`pollVoterRow-${index}`}
                style={[s?.votersRow, index === rows.length - 1 && s?.votersRowLast]}
            >
                {/* Names are stored escaped, like the poll text. */}
                <Text style={s?.votersName}>{pollTextToPlain(voter.name)}</Text>
                <Text style={s?.votersChoice}>{pollTextToPlain(voter.optionLabel)}</Text>
            </View>
        ));
    }

    const loaded = voters.status === 'loaded' ? voters.response : null;
    const canGoBack = page > 0;
    const canGoForward = !!loaded && loaded.hasMore;

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <View style={s?.votersScrim}>
                <Pressable testID="pollVotersScrim" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} />
                <View testID="pollVotersDialog" aria-modal style={s?.votersDialog}>
                    <View style={s?.votersHeader}>
                        <Text role="heading" style={s?.votersTitle}>
                            {translations.POLL_VOTERS_TITLE}
                        </Text>
                        <TouchableOpacity testID="pollVotersClose" aria-label={translations.POLL_VOTERS_CLOSE} hitSlop={10} style={s?.votersClose} onPress={onClose}>
                            <Text style={s?.votersCloseText}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        testID="pollVotersSearch"
                        style={s?.votersSearch}
                        placeholder={translations.POLL_VOTERS_SEARCH_PLACEHOLDER}
                        placeholderTextColor={s?.builderPlaceholderColor}
                        aria-label={translations.POLL_VOTERS_SEARCH_PLACEHOLDER}
                        value={searchInput}
                        onChangeText={setSearchInput}
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={() => {
                            setSearch(searchInput);
                            setPage(0);
                        }}
                    />
                    <ScrollView style={s?.votersBody}>{body}</ScrollView>
                    {loaded && loaded.voters.length > 0 && (
                        <View style={s?.votersPager}>
                            <TouchableOpacity testID="pollVotersPrev" disabled={!canGoBack} hitSlop={8} onPress={() => setPage(page - 1)}>
                                <Text style={[s?.link, !canGoBack && s?.linkDisabled]}>{translations.POLL_VOTERS_PREV}</Text>
                            </TouchableOpacity>
                            <Text testID="pollVotersCount" style={s?.votersCount}>
                                {getPollVotersCountText(translations, locale, loaded.total)}
                            </Text>
                            <TouchableOpacity testID="pollVotersNext" disabled={!canGoForward} hitSlop={8} onPress={() => setPage(page + 1)}>
                                <Text style={[s?.link, !canGoForward && s?.linkDisabled]}>{translations.POLL_VOTERS_NEXT}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
