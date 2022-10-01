import {defaultTokenizer, EditorFormatConfiguration, SupportedNodesTokenizerConfig, toTextTrimmed} from "../editor-node-transform";
import {EditorNodeNewLine, EditorNodeType, EditorNodeWithoutChildren} from "../node-types";

const SupportedNodes: SupportedNodesTokenizerConfig = {
    // text is implicit
    '\n': {
        start: '\n',
        type: EditorNodeType.NEWLINE,
        lookaheadIgnore: null
    },
    // TODO this is the fastcomments format. replace with standard markdown and allow this to be customizable before launching library.
    '[img]': {
        start: '[img]',
        end: '[/img]',
        type: EditorNodeType.IMAGE,
        lookaheadIgnore: null,
    },
    // TODO parse emoticons? (raw html images today)
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
        [EditorNodeType.NEWLINE]: (_node: EditorNodeNewLine, _trimToLength?: number) => {
            return '\n';
        },
        [EditorNodeType.TEXT]: (node: EditorNodeWithoutChildren, trimToLength?: number) => {
            return toTextTrimmed(node, null, null, trimToLength);
        },
        [EditorNodeType.TEXT_BOLD]: (node: EditorNodeWithoutChildren, trimToLength?: number) => {
            return toTextTrimmed(node, '**', '**', trimToLength);
        },
        [EditorNodeType.EMOTICON]: (node: EditorNodeWithoutChildren, _trimToLength?: number) => {
            // images should not be trimmed
            return `![](${node.content})`;
        },
        [EditorNodeType.IMAGE]: (node: EditorNodeWithoutChildren, _trimToLength?: number) => {
            // images should not be trimmed
            return `![](${node.content})`;
        },
        [EditorNodeType.TEXT_ITALIC]: (node: EditorNodeWithoutChildren, trimToLength?: number) => {
            return toTextTrimmed(node, '<i>', '</i>', trimToLength);
        },
        [EditorNodeType.TEXT_STRIKETHROUGH]: (node: EditorNodeWithoutChildren, trimToLength?: number) => {
            return toTextTrimmed(node, '<strike>', '</strike>', trimToLength);
        },
        [EditorNodeType.TEXT_UNDERLINE]: (node: EditorNodeWithoutChildren, trimToLength?: number) => {
            // if you don't support underline then disable it in the toolbar.
            return toTextTrimmed(node, '<u>', '</u>', trimToLength);
        },
    }
};
