import { editorHtmlToServerHtml, isEditorHtmlEffectivelyEmpty } from '../editor-html-to-server-html';

describe('editorHtmlToServerHtml', () => {
    it('returns empty input unchanged', () => {
        expect(editorHtmlToServerHtml('')).toBe('');
    });

    it('unwraps a single paragraph', () => {
        expect(editorHtmlToServerHtml('<p>hello</p>')).toBe('hello');
    });

    it('joins paragraphs with <br>', () => {
        expect(editorHtmlToServerHtml('<p>first</p><p>second</p>')).toBe('first<br>second');
    });

    it('keeps inline formatting inside paragraphs', () => {
        expect(editorHtmlToServerHtml('<p>a <b>bold</b> word</p><p><i>italic</i></p>'))
            .toBe('a <b>bold</b> word<br><i>italic</i>');
    });

    it('preserves explicit <br> empty lines between paragraphs', () => {
        expect(editorHtmlToServerHtml('<p>first</p><br><p>second</p>')).toBe('first<br>second');
    });

    it('strips the <html> wrapper the editor emits on setValue round-trips', () => {
        expect(editorHtmlToServerHtml('<html><p>hello</p></html>')).toBe('hello');
    });

    it('handles paragraph tags with attributes', () => {
        expect(editorHtmlToServerHtml('<p data-x="1">first</p><p class="y">second</p>'))
            .toBe('first<br>second');
    });

    it('leaves already-flat content alone', () => {
        expect(editorHtmlToServerHtml('plain text<br>next line')).toBe('plain text<br>next line');
    });
});

describe('isEditorHtmlEffectivelyEmpty', () => {
    it('treats every empty-editor shape as empty', () => {
        expect(isEditorHtmlEffectivelyEmpty('')).toBe(true);
        expect(isEditorHtmlEffectivelyEmpty('<p></p>')).toBe(true);
        expect(isEditorHtmlEffectivelyEmpty('<p><br></p>')).toBe(true);
        expect(isEditorHtmlEffectivelyEmpty('<p> </p>')).toBe(true);
        expect(isEditorHtmlEffectivelyEmpty('<p>&nbsp;</p>')).toBe(true);
        expect(isEditorHtmlEffectivelyEmpty('<p><br></p><p><br></p>')).toBe(true);
    });

    it('treats text and image-only content as non-empty', () => {
        expect(isEditorHtmlEffectivelyEmpty('<p>hi</p>')).toBe(false);
        expect(isEditorHtmlEffectivelyEmpty('<p><img src="https://example.com/a.png" /></p>')).toBe(false);
    });
});
