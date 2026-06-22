/**
 * Feed reaction picker (pure render, no network). The post action row shows a
 * single Like button (conventional mobile pattern): tapping it toggles the
 * default 'l' reaction (parity with Android/web/server), and long-pressing it
 * opens the reaction picker so the user can fire any of the other reactions.
 * The non-like reactions still render as count chips.
 *
 * The reaction service is mocked so nothing hits the network.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockReactToFeedPost = jest.fn((..._args: unknown[]) =>
    Promise.resolve({ ok: true, isUndo: false })
);
jest.mock('../../src/services/feed-reactions', () => ({
    reactToFeedPost: (...args: unknown[]) => mockReactToFeedPost(...args),
}));

import { FeedPostReactions } from '../../src/components/feed-post-reactions';
import { getDefaultFastCommentsStyles } from '../../src/resources/styles';
import type { FeedPost } from '../../src/types/feed-post';
import type { FastCommentsStore } from '../../src/store/types';

const translations: Record<string, string> = {
    FEED_REACTION_PICK: 'React',
    FEED_REACTION_THUMBS_UP: 'Thumbs up',
    FEED_REACTION_HEART: 'Heart',
    FEED_REACTION_LAUGH: 'Laugh',
    FEED_REACTION_WOW: 'Wow',
    FEED_REACTION_SAD: 'Sad',
    FEED_REACTION_ANGRY: 'Angry',
    FEED_REACTION_FAILED: 'Could not save reaction. Please try again.',
};

const styles = getDefaultFastCommentsStyles();
const store = { getState: () => ({}) } as unknown as FastCommentsStore;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
    return { id: 'post1', tenantId: 'demo', createdAt: 0, ...overrides };
}

beforeEach(() => mockReactToFeedPost.mockClear());

describe('FeedPostReactions: Like button + long-press picker', () => {
    it('renders a single Like button and no standalone Pick button', () => {
        const { getByTestId, queryByTestId } = render(
            <FeedPostReactions post={makePost()} store={store} translations={translations} styles={styles} />
        );
        expect(getByTestId('feedReactionLikeButton-post1')).toBeTruthy();
        expect(queryByTestId('feedReactionPickerButton-post1')).toBeNull();
    });

    it('tapping Like fires the default like reaction (l, add)', () => {
        const { getByTestId } = render(
            <FeedPostReactions post={makePost()} store={store} translations={translations} styles={styles} />
        );
        fireEvent.press(getByTestId('feedReactionLikeButton-post1'));
        expect(mockReactToFeedPost).toHaveBeenCalledTimes(1);
        expect(mockReactToFeedPost).toHaveBeenCalledWith(store, 'post1', 'l', false);
    });

    it('tapping Like when already liked toggles it off (l, undo)', () => {
        const { getByTestId } = render(
            <FeedPostReactions
                post={makePost({ myReacts: { l: true }, reacts: { l: 1 } })}
                store={store}
                translations={translations}
                styles={styles}
            />
        );
        fireEvent.press(getByTestId('feedReactionLikeButton-post1'));
        expect(mockReactToFeedPost).toHaveBeenCalledWith(store, 'post1', 'l', true);
    });

    it('long-pressing Like opens the picker; choosing heart fires h', () => {
        const { getByTestId, queryByTestId } = render(
            <FeedPostReactions post={makePost()} store={store} translations={translations} styles={styles} />
        );
        // Picker is closed until the long-press.
        expect(queryByTestId('feedReactionPickerItem-h')).toBeNull();
        fireEvent(getByTestId('feedReactionLikeButton-post1'), 'longPress');
        expect(getByTestId('feedReactionPickerItem-h')).toBeTruthy();
        fireEvent.press(getByTestId('feedReactionPickerItem-h'));
        expect(mockReactToFeedPost).toHaveBeenCalledWith(store, 'post1', 'h', false);
        // Choosing closes the picker.
        expect(queryByTestId('feedReactionPickerItem-h')).toBeNull();
    });

    it('shows count chips for non-like reactions but not for like', () => {
        const { queryByTestId } = render(
            <FeedPostReactions
                post={makePost({ reacts: { l: 3, h: 2 } })}
                store={store}
                translations={translations}
                styles={styles}
            />
        );
        // The like count lives on the Like button, not a chip.
        expect(queryByTestId('feedReactionChip-post1-l')).toBeNull();
        expect(queryByTestId('feedReactionChip-post1-h')).toBeTruthy();
    });
});
