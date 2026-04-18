import {parseHtml} from '../html-parser';
import {toHtml} from '../html-serializer';
import {INLINE_IMAGE_PLACEHOLDER} from '../types';

describe('parseHtml', () => {
    it('returns empty document for empty string', () => {
        const doc = parseHtml('');
        expect(doc.spans).toEqual([{text: ''}]);
        expect(doc.images).toEqual([]);
    });

    it('returns empty document for <p></p>', () => {
        const doc = parseHtml('<p></p>');
        expect(doc.spans).toEqual([{text: ''}]);
    });

    it('parses plain text without tags', () => {
        const doc = parseHtml('Hello world');
        expect(doc.spans).toEqual([{text: 'Hello world'}]);
    });

    it('parses a single paragraph', () => {
        const doc = parseHtml('<p>Hello world</p>');
        expect(doc.spans.length).toBe(1);
        expect(doc.spans[0].text).toBe('Hello world');
    });

    it('parses bold text with <strong>', () => {
        const doc = parseHtml('<p>Hello <strong>bold</strong> world</p>');
        expect(doc.spans.length).toBe(3);
        expect(doc.spans[0]).toEqual({text: 'Hello '});
        expect(doc.spans[1]).toEqual({text: 'bold', bold: true});
        expect(doc.spans[2]).toEqual({text: ' world'});
    });

    it('parses bold text with <b>', () => {
        const doc = parseHtml('<p>Hello <b>bold</b> world</p>');
        expect(doc.spans[1]).toEqual({text: 'bold', bold: true});
    });

    it('parses italic text with <em>', () => {
        const doc = parseHtml('<p><em>italic</em></p>');
        expect(doc.spans[0]).toEqual({text: 'italic', italic: true});
    });

    it('parses italic text with <i>', () => {
        const doc = parseHtml('<p><i>italic</i></p>');
        expect(doc.spans[0]).toEqual({text: 'italic', italic: true});
    });

    it('parses underline', () => {
        const doc = parseHtml('<p><u>underlined</u></p>');
        expect(doc.spans[0]).toEqual({text: 'underlined', underline: true});
    });

    it('parses strikethrough with <s>', () => {
        const doc = parseHtml('<p><s>struck</s></p>');
        expect(doc.spans[0]).toEqual({text: 'struck', strikethrough: true});
    });

    it('parses strikethrough with <del>', () => {
        const doc = parseHtml('<p><del>deleted</del></p>');
        expect(doc.spans[0]).toEqual({text: 'deleted', strikethrough: true});
    });

    it('parses code', () => {
        const doc = parseHtml('<p><code>code</code></p>');
        expect(doc.spans[0]).toEqual({text: 'code', code: true});
    });

    it('parses nested formatting', () => {
        const doc = parseHtml('<p><strong><em>bold italic</em></strong></p>');
        expect(doc.spans[0]).toEqual({text: 'bold italic', bold: true, italic: true});
    });

    it('parses multiple paragraphs', () => {
        const doc = parseHtml('<p>First</p><p>Second</p>');
        const text = doc.spans.map(s => s.text).join('');
        expect(text).toContain('First');
        expect(text).toContain('Second');
        expect(text).toContain('\n');
    });

    it('parses <br> as newline', () => {
        const doc = parseHtml('<p>Line 1<br>Line 2</p>');
        const text = doc.spans.map(s => s.text).join('');
        expect(text).toBe('Line 1\nLine 2');
    });

    it('parses self-closing <br/>', () => {
        const doc = parseHtml('<p>Line 1<br/>Line 2</p>');
        const text = doc.spans.map(s => s.text).join('');
        expect(text).toBe('Line 1\nLine 2');
    });

    it('decodes HTML entities', () => {
        const doc = parseHtml('<p>&amp; &lt; &gt; &quot; &#39;</p>');
        expect(doc.spans[0].text).toBe('& < > " \'');
    });

    it('decodes numeric HTML entities', () => {
        const doc = parseHtml('<p>&#65; &#x41;</p>');
        expect(doc.spans[0].text).toBe('A A');
    });

    it('decodes &nbsp;', () => {
        const doc = parseHtml('<p>hello&nbsp;world</p>');
        expect(doc.spans[0].text).toBe('hello\u00A0world');
    });

    it('extracts block-level images', () => {
        const doc = parseHtml('<img src="https://example.com/photo.jpg">');
        expect(doc.images).toEqual(['https://example.com/photo.jpg']);
    });

    it('extracts inline images as inlineImages with placeholder', () => {
        const doc = parseHtml('<p>Hello <img src="https://example.com/emoji.png"> world</p>');
        const text = doc.spans.map(s => s.text).join('');
        expect(text).toContain(INLINE_IMAGE_PLACEHOLDER);
        expect(doc.inlineImages.size).toBe(1);
        const [, url] = [...doc.inlineImages.entries()][0];
        expect(url).toBe('https://example.com/emoji.png');
    });

    it('handles img with single quotes in src', () => {
        const doc = parseHtml("<img src='https://example.com/img.png'>");
        expect(doc.images).toEqual(['https://example.com/img.png']);
    });

    it('ignores unknown tags but preserves content', () => {
        const doc = parseHtml('<p><span>text in span</span></p>');
        expect(doc.spans[0].text).toBe('text in span');
    });

    it('handles tags with attributes', () => {
        const doc = parseHtml('<p><strong class="foo" data-bar="baz">bold</strong></p>');
        expect(doc.spans[0]).toEqual({text: 'bold', bold: true});
    });

    it('parses markdown **bold** pattern', () => {
        const doc = parseHtml('**@username** ');
        expect(doc.spans.length).toBe(2);
        expect(doc.spans[0]).toEqual({text: '@username', bold: true});
        expect(doc.spans[1]).toEqual({text: ' '});
    });

    it('handles malformed nesting gracefully', () => {
        // <b><i></b></i> — we pop by tag type, so this still works
        const doc = parseHtml('<p><b><i>text</b></i></p>');
        const text = doc.spans.map(s => s.text).join('');
        expect(text).toBe('text');
    });
});

describe('toHtml', () => {
    it('serializes empty document', () => {
        expect(toHtml({spans: [{text: ''}], images: [], inlineImages: new Map()})).toBe('<p></p>');
    });

    it('serializes plain text', () => {
        expect(toHtml({spans: [{text: 'Hello'}], images: [], inlineImages: new Map()})).toBe('<p>Hello</p>');
    });

    it('serializes bold text', () => {
        const html = toHtml({
            spans: [{text: 'Hello '}, {text: 'bold', bold: true}, {text: ' world'}],
            images: [],
            inlineImages: new Map(),
        });
        expect(html).toBe('<p>Hello <strong>bold</strong> world</p>');
    });

    it('serializes italic text', () => {
        const html = toHtml({
            spans: [{text: 'italic', italic: true}],
            images: [],
            inlineImages: new Map(),
        });
        expect(html).toBe('<p><em>italic</em></p>');
    });

    it('serializes nested formatting', () => {
        const html = toHtml({
            spans: [{text: 'both', bold: true, italic: true}],
            images: [],
            inlineImages: new Map(),
        });
        expect(html).toBe('<p><strong><em>both</em></strong></p>');
    });

    it('serializes multiple paragraphs via \\n', () => {
        const html = toHtml({
            spans: [{text: 'First\nSecond'}],
            images: [],
            inlineImages: new Map(),
        });
        expect(html).toBe('<p>First</p><p>Second</p>');
    });

    it('encodes special characters', () => {
        const html = toHtml({
            spans: [{text: '< & >'}],
            images: [],
            inlineImages: new Map(),
        });
        expect(html).toBe('<p>&lt; &amp; &gt;</p>');
    });

    it('serializes block-level images', () => {
        const html = toHtml({
            spans: [{text: 'Hello'}],
            images: ['https://example.com/photo.jpg'],
            inlineImages: new Map(),
        });
        expect(html).toBe('<p>Hello</p><img src="https://example.com/photo.jpg">');
    });

    it('serializes inline images', () => {
        const inlineImages = new Map<number, string>();
        inlineImages.set(6, 'https://example.com/emoji.png');
        const html = toHtml({
            spans: [{text: 'Hello ' + INLINE_IMAGE_PLACEHOLDER + ' world'}],
            images: [],
            inlineImages,
        });
        expect(html).toContain('Hello');
        expect(html).toContain('<img src="https://example.com/emoji.png">');
        expect(html).toContain('world');
    });
});

describe('round-trip', () => {
    it('preserves plain text', () => {
        const original = '<p>Hello world</p>';
        const doc = parseHtml(original);
        const result = toHtml(doc);
        expect(result).toBe(original);
    });

    it('preserves bold text', () => {
        const original = '<p>Hello <strong>bold</strong> world</p>';
        const doc = parseHtml(original);
        const result = toHtml(doc);
        expect(result).toBe(original);
    });

    it('preserves multiple paragraphs', () => {
        const original = '<p>First</p><p>Second</p>';
        const doc = parseHtml(original);
        const result = toHtml(doc);
        expect(result).toBe(original);
    });

    it('preserves nested formatting', () => {
        const original = '<p><strong><em>bold italic</em></strong></p>';
        const doc = parseHtml(original);
        const result = toHtml(doc);
        expect(result).toBe(original);
    });

    it('preserves block images', () => {
        const original = '<p>Text</p><img src="https://example.com/photo.jpg">';
        const doc = parseHtml(original);
        const result = toHtml(doc);
        expect(result).toBe(original);
    });
});
