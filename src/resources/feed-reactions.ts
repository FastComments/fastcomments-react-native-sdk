/**
 * Canonical feed reaction set. The SDK does not ship reaction icon images,
 * so we render glyphs as Unicode codepoints. The resources file is the only
 * place codepoint literals are allowed - consumer code (components, services)
 * goes through `getDefaultFeedReactions()`.
 *
 * `key` is the wire `reactType` sent to `reactFeedPostPublic`. The default
 * "like" key keeps the existing `'l'` short-string the rest of the platform
 * (web frontend, Android, server stats) already uses; the others use a
 * single-letter convention for parity with the comment vote storage which
 * stays compact in MongoDB documents.
 */
export interface FeedReactionDescriptor {
    /** Wire reactType. */
    key: string;
    /** Unicode glyph rendered as `<Text>`. */
    glyph: string;
    /** Translation key for accessibility / picker label. */
    translationKey:
        | 'FEED_REACTION_THUMBS_UP'
        | 'FEED_REACTION_HEART'
        | 'FEED_REACTION_LAUGH'
        | 'FEED_REACTION_WOW'
        | 'FEED_REACTION_SAD'
        | 'FEED_REACTION_ANGRY';
}

export function getDefaultFeedReactions(): FeedReactionDescriptor[] {
    return [
        { key: 'l', glyph: '\u{1F44D}', translationKey: 'FEED_REACTION_THUMBS_UP' },
        { key: 'h', glyph: '\u{2764}\u{FE0F}', translationKey: 'FEED_REACTION_HEART' },
        { key: 'f', glyph: '\u{1F602}', translationKey: 'FEED_REACTION_LAUGH' },
        { key: 'w', glyph: '\u{1F62E}', translationKey: 'FEED_REACTION_WOW' },
        { key: 's', glyph: '\u{1F622}', translationKey: 'FEED_REACTION_SAD' },
        { key: 'a', glyph: '\u{1F621}', translationKey: 'FEED_REACTION_ANGRY' },
    ];
}
