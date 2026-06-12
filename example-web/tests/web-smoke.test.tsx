/**
 * Web-lane smoke tests: mount the SDK exactly like a browser app does, through
 * react-native-web and the real react-native-enriched web (tiptap) editor.
 *
 * These exist because the node tests-ui suite resolves the native platform and
 * mocks the editor, so .web.tsx files, react-native-web rendering, and the web
 * editor integration are otherwise never executed by any test.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { FastCommentsLiveCommenting } from '../../index';
import type { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';

afterEach(cleanup);

function demoConfig(overrides?: Partial<FastCommentsCommentWidgetConfig>): FastCommentsCommentWidgetConfig {
    const config: FastCommentsCommentWidgetConfig = {
        tenantId: 'demo',
        urlId: 'web-lane-smoke',
        apiHost: 'https://fastcomments.com',
        // Live behavior is covered by the node tests-ui lane; in jsdom the
        // undici WebSocket rejects jsdom's Event class and crashes the run.
        disableLiveCommenting: true,
    };
    return { ...config, ...overrides };
}

describe('web smoke', () => {
    it('mounts via react-native-web and reaches the loaded state against the real backend', async () => {
        const { container, queryByTestId } = render(<FastCommentsLiveCommenting config={demoConfig()} />);
        expect(container.firstChild).toBeTruthy();
        await waitFor(() => {
            if (!queryByTestId('recyclerViewComments') && !queryByTestId('emptyStateView')) {
                throw new Error('comment list not loaded yet');
            }
        }, { timeout: 20000 });
    });

    it('mounts the real web editor (tiptap) and injects the editor fill styles', async () => {
        render(<FastCommentsLiveCommenting config={demoConfig()} />);
        // The web build does not forward testID to the DOM; assert on the
        // editor's own markers instead.
        await waitFor(() => {
            if (!document.querySelector('.eti-editor [contenteditable].ProseMirror, .eti-editor .ProseMirror[contenteditable="true"]')
                && !document.querySelector('.ProseMirror')) {
                throw new Error('editor not mounted yet');
            }
        }, { timeout: 20000 });
        // The web-only style rule that makes the contenteditable fill its box;
        // regression guard for the dead-unclickable-editor bug.
        expect(document.getElementById('fastcomments-enriched-web-fill')).toBeTruthy();
    });

    it('editor text is themed (dark theme must not type black-on-black) and shows a placeholder', async () => {
        render(
            <FastCommentsLiveCommenting
                config={demoConfig()}
                theme={{ colors: { textPrimary: '#F4F4F5', background: '#121316', inputBackground: '#1C1E23' } }}
            />
        );
        await waitFor(() => {
            if (!document.querySelector('.ProseMirror')) throw new Error('editor not mounted yet');
        }, { timeout: 20000 });
        const editorNode = document.querySelector('.ProseMirror');
        if (!(editorNode instanceof HTMLElement)) throw new Error('editor not an element');
        const color = window.getComputedStyle(editorNode).color;
        expect(color).toBe('rgb(244, 244, 245)');
        // The editor must hint what it is for.
        const placeholderHost = document.querySelector('[data-placeholder]');
        if (!(placeholderHost instanceof HTMLElement)) throw new Error('no placeholder host');
        expect((placeholderHost.getAttribute('data-placeholder') || '').length).toBeGreaterThan(0);
    });

    it('image and gif toolbar buttons render by default on web (no host callbacks)', async () => {
        const { queryByTestId } = render(<FastCommentsLiveCommenting config={demoConfig()} />);
        await waitFor(() => {
            if (!queryByTestId('toolbarGifButton')) throw new Error('gif button not rendered yet');
        }, { timeout: 20000 });
        // Web falls back to a DOM file input, so the image button needs no callback.
        expect(queryByTestId('toolbarImageButton')).toBeTruthy();
    });

    it('selecting a GIF on web attaches it to the comment (the web editor cannot embed inline)', async () => {
        const { queryByTestId, getByTestId, queryAllByTestId } = render(
            <FastCommentsLiveCommenting config={demoConfig()} />
        );
        await waitFor(() => {
            if (!queryByTestId('toolbarGifButton')) throw new Error('gif button not rendered yet');
        }, { timeout: 20000 });
        fireEvent.click(getByTestId('toolbarGifButton'));
        await waitFor(() => {
            if (queryAllByTestId(/^gifResult-/).length === 0 && !document.querySelector('[data-testid="gifResult-0"]')) {
                throw new Error('trending gifs not loaded yet');
            }
        }, { timeout: 25000 });
        const firstGif = document.querySelector('[data-testid="gifResult-0"]');
        if (!(firstGif instanceof HTMLElement)) throw new Error('gif result not an element');
        fireEvent.click(firstGif);
        // The selection must be VISIBLE to the user: web attaches it as a
        // pending-image chip (the editor schema strips inline <img>).
        await waitFor(() => {
            if (!document.querySelector('[data-testid="pendingImage-0"]')) {
                throw new Error('pending image chip not rendered');
            }
        }, { timeout: 15000 });
    });

    it('renders the loading state in normal flow so it cannot collapse to 0 height', () => {
        // Regression guard for the spinner-clipped-offscreen bug: the loading
        // overlay must participate in layout (flex + minHeight floor), not be
        // absolutely positioned inside a collapsed 0-height container.
        const { getByTestId } = render(<FastCommentsLiveCommenting config={demoConfig()} />);
        const overlay = getByTestId('loadingOverlay');
        const style = window.getComputedStyle(overlay);
        expect(style.position).not.toBe('absolute');
        expect(parseInt(style.minHeight || '0', 10)).toBeGreaterThan(0);
    });
});
