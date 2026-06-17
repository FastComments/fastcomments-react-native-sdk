/**
 * Web-lane render tests for the feed post row + standalone composer. Mounts
 * through react-native-web with a real store (posts/auth would normally come
 * from the feed APIs / SSO).
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { FeedPostRow } from '../../src/components/feed-post-row';
import { FastCommentsFeedPostCreate } from '../../src/components/feed-post-create';
import { FastCommentsLiveCommentingService } from '../../src/services/fastcomments-live-commenting';
import { getDefaultFastCommentsStyles } from '../../src/resources/styles';
import type { FeedPost } from '../../src/types/feed-post';

afterEach(cleanup);

const styles = getDefaultFastCommentsStyles();

function makeStore() {
    return FastCommentsLiveCommentingService.createStoreFromConfig({
        tenantId: 'demo',
        urlId: 'feed-test',
        apiHost: 'https://fastcomments.com',
    });
}

const post: FeedPost = {
    id: 'p1',
    tenantId: 'demo',
    fromUserId: 'u1',
    fromUserDisplayName: 'Author',
    fromUserAvatar: 'https://i.pravatar.cc/100?img=3',
    title: 'Hello',
    contentHTML: '<p>Body <b>bold</b></p>',
    createdAt: Date.now(),
    commentCount: 3,
};

describe('FeedPostRow', () => {
    it('renders the row with a comment button (count) and a share button', () => {
        const store = makeStore();
        const { getByTestId } = render(
            <FeedPostRow post={post} translations={{ JUST_NOW: "just now" }} styles={styles} store={store} followStateRevision={0} />
        );
        expect(getByTestId('feedPostRow-p1')).toBeTruthy();
        expect(getByTestId('feedPostCommentButton-p1').textContent).toContain('(3)');
        expect(getByTestId('feedPostShareButton-p1')).toBeTruthy();
    });

    it('shows the delete menu only on the viewer\'s own posts', () => {
        const store = makeStore();
        const { queryByTestId, rerender } = render(
            <FeedPostRow post={post} translations={{ JUST_NOW: "just now" }} styles={styles} store={store} followStateRevision={0} currentUser={{ id: 'other' } as never} />
        );
        expect(queryByTestId('feedPostMenu-p1')).toBeNull();
        rerender(
            <FeedPostRow post={post} translations={{ JUST_NOW: "just now" }} styles={styles} store={store} followStateRevision={0} currentUser={{ id: 'u1' } as never} />
        );
        expect(queryByTestId('feedPostMenu-p1')).toBeTruthy();
    });
});

describe('FastCommentsFeedPostCreate', () => {
    it('renders the author header, title field, and submit button', () => {
        const store = makeStore();
        const { getByTestId } = render(<FastCommentsFeedPostCreate store={store} styles={styles} />);
        expect(getByTestId('feedPostCreate')).toBeTruthy();
        expect(getByTestId('postTitleEditText')).toBeTruthy();
        expect(getByTestId('submitPostButton')).toBeTruthy();
    });
});
