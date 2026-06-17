import { buildPostCommentsConfig } from '../feed';
import type { FastCommentsRNConfig } from '../../types/react-native-config';

const feedConfig = {
    tenantId: 'demo',
    urlId: 'my-feed',
    sso: 'sso-token',
    region: 'us',
} as unknown as FastCommentsRNConfig;

describe('buildPostCommentsConfig', () => {
    it('namespaces the urlId as post:<id> (matches the Android SDK)', () => {
        const cfg = buildPostCommentsConfig({ id: 'abc123', title: 'Hi' }, feedConfig);
        expect(cfg.urlId).toBe('post:abc123');
    });

    it('carries tenant + sso from the feed config', () => {
        const cfg = buildPostCommentsConfig({ id: 'p1' }, feedConfig);
        expect(cfg.tenantId).toBe('demo');
        expect((cfg as { sso?: string }).sso).toBe('sso-token');
        expect((cfg as { region?: string }).region).toBe('us');
    });

    it('uses the post title as the page title when present', () => {
        const cfg = buildPostCommentsConfig({ id: 'p1', title: 'My Title' }, feedConfig);
        expect(cfg.pageTitle).toBe('My Title');
    });

    it('falls back to a stripped, truncated content preview when there is no title', () => {
        const long = '<p>' + 'word '.repeat(60).trim() + '</p>';
        const cfg = buildPostCommentsConfig({ id: 'p1', contentHTML: long }, feedConfig);
        expect(cfg.pageTitle).toBeDefined();
        expect(cfg.pageTitle!.length).toBeLessThanOrEqual(100);
        expect(cfg.pageTitle!.endsWith('…')).toBe(true);
        expect(cfg.pageTitle).not.toContain('<');
    });

    it('leaves pageTitle undefined when there is no title or content', () => {
        const cfg = buildPostCommentsConfig({ id: 'p1' }, feedConfig);
        expect(cfg.pageTitle).toBeUndefined();
    });
});
