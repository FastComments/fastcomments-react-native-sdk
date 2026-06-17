import { getFeedPostType } from '../feed-post-type';
import type { FeedPost } from '../../types/feed-post';

const base = { id: 'p', tenantId: 't', createdAt: 0 } as FeedPost;
const img = { sizes: [{ src: 'x', w: 10, h: 10 }] };

describe('getFeedPostType', () => {
    it('TEXT_ONLY when there is no media and no links', () => {
        expect(getFeedPostType({ ...base })).toBe('TEXT_ONLY');
    });

    it('SINGLE_IMAGE for exactly one media item', () => {
        expect(getFeedPostType({ ...base, media: [img] })).toBe('SINGLE_IMAGE');
    });

    it('MULTI_IMAGE for more than one media item', () => {
        expect(getFeedPostType({ ...base, media: [img, img] })).toBe('MULTI_IMAGE');
    });

    it('TASK for a links-only post', () => {
        expect(getFeedPostType({ ...base, links: [{ url: 'https://x' }] })).toBe('TASK');
    });

    it('media wins over links when both are present (image layout)', () => {
        expect(getFeedPostType({ ...base, media: [img], links: [{ url: 'https://x' }] })).toBe('SINGLE_IMAGE');
    });
});
