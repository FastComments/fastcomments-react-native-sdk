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
    '**': {
        start: '**',
        end: '**',
        type: EditorNodeType.TEXT_BOLD,
        lookaheadIgnore: null,
    },
    '*': {
        start: '*',
        end: '*',
        type: EditorNodeType.TEXT_ITALIC,
        lookaheadIgnore: null,
    },
    '~~': {
        start: '~~',
        end: '~~',
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

export const EditorFormatConfigurationMarkdown: EditorFormatConfiguration = {
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
            return `![](${node.content})`;
        },
        [EditorNodeType.IMAGE]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, _trimToLength?: number) => {
            if (!('content' in node)) {
                return '';
            }
            // images should not be trimmed
            return `![](${node.content})`;
        },
        [EditorNodeType.TEXT_ITALIC]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            return toTextTrimmed(node, '*', '*', trimToLength);
        },
        [EditorNodeType.TEXT_STRIKETHROUGH]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            return toTextTrimmed(node, '~~', '~~', trimToLength);
        },
        [EditorNodeType.TEXT_UNDERLINE]: (node: ImmutableObject<EditorNodeNewLine | EditorNodeWithoutChildren>, trimToLength?: number) => {
            // if you don't support underline then disable it in the toolbar.
            return toTextTrimmed(node, '<u>', '</u>', trimToLength);
        },
    }
};
