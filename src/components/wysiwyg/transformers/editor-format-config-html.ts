import {defaultTokenizer, EditorFormatConfiguration, SupportedNodesTokenizerConfig, toTextTrimmed} from "../editor-node-transform";
import {EditorNodeNewLine, EditorNodeType, EditorNodeWithoutChildren} from "../node-types";
import {ImmutableObject} from "@hookstate/core";

const SupportedNodes: SupportedNodesTokenizerConfig = {
    // text is implicit
    '\n': {
        start: '\n',
        type: EditorNodeType.NEWLINE,
        lookaheadIgnore: null
    },
    // TODO this is the fastcomments format. replace with standard markdown and allow this to be customizable before launching standalone WYSIWYG library.
    '[img]': {
        start: '[img]',
        end: '[/img]',
        type: EditorNodeType.IMAGE,
        lookaheadIgnore: null,
    },
    '<img src="': {
        start: '<img src="',
        end: '" class="react" />',
        type: EditorNodeType.EMOTICON,
        lookaheadIgnore: null,
    },
    '**': {
        start: '**',
        end: '**',
        type: EditorNodeType.TEXT_BOLD,
        lookaheadIgnore: null,
    },
    '<i>': {
        start: '<i>',
        end: '</i>',
        type: EditorNodeType.TEXT_ITALIC,
        lookaheadIgnore: null,
    },
    '<strike>': {
        start: '<strike>',
        end: '</strike>',
        type: EditorNodeType.TEXT_STRIKETHROUGH,
        lookaheadIgnore: null,
    },
    '<u>': {
        start: '<u>',
        end: '</u>',
        type: EditorNodeType.TEXT_UNDERLINE,
        lookaheadIgnore: null,
    },
};

export const EditorFormatConfigurationHTML: EditorFormatConfiguration = {
    tokenize: (input: string) => defaultTokenizer(input, SupportedNodes),
    formatters: {
        [EditorNodeType.NEWLINE]: (_node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, _trimToLength?: number) => {
            return '\n';
        },
        [EditorNodeType.TEXT]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            return toTextTrimmed(node, null, null, trimToLength);
        },
        [EditorNodeType.TEXT_BOLD]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            return toTextTrimmed(node, '**', '**', trimToLength);
        },
        [EditorNodeType.EMOTICON]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, _trimToLength?: number) => {
            if (!('content' in node)) {
                return '';
            }
            // images should not be trimmed
            return `<img src="${node.content}" class="react" />`;
        },
        [EditorNodeType.IMAGE]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, _trimToLength?: number) => {
            if (!('content' in node)) {
                return '';
            }
            // images should not be trimmed
            return `[img]${node.content}[/img]`; // when we pull the WYSIWYG library out of this library, this format will change.
        },
        [EditorNodeType.TEXT_ITALIC]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            return toTextTrimmed(node, '<i>', '</i>', trimToLength);
        },
        [EditorNodeType.TEXT_STRIKETHROUGH]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            return toTextTrimmed(node, '<strike>', '</strike>', trimToLength);
        },
        [EditorNodeType.TEXT_UNDERLINE]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            // if you don't support underline then disable it in the toolbar.
            return toTextTrimmed(node, '<u>', '</u>', trimToLength);
        },
    }
};
