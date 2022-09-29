import {createBoldNode, createEmoticonNode, createImageNode, createTextNode} from "../node-create";
import {focusNode} from "../node-focus";
import {deleteNodeRetainFocus} from "../node-delete";
import {EditorNodeNewLine} from "../node-types";
import {createNewlineNode} from "../node-create";

describe('node-delete', () => {

    it('should merge two text nodes when deleting an empty one before a node with content, resulting in one node', () => {
        const firstNode = createTextNode('@some-user-name');
        const lastNode = createTextNode('');
        const nodes: EditorNodeNewLine[] = [
            createNewlineNode([firstNode]),
            createNewlineNode([lastNode])
        ]
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeNewLine[] = [
            {
                ...nodes[1],
                children: [
                    {
                        ...lastNode,
                        content: firstNode.content
                    }
                ]
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should clear all nodes between two text nodes when deleting a text node, merging the starting and ending text nodes', () => {
        const firstNode = createTextNode('Text before image');
        const lastNode = createTextNode('');
        const nodes: EditorNodeNewLine[] = [
            createNewlineNode([firstNode]),
            createNewlineNode([createImageNode('some-image-src')]),
            createNewlineNode([lastNode]),
        ]
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeNewLine[] = [
            {
                ...nodes[2],
                children: [
                    {
                        ...lastNode,
                        content: firstNode.content
                    }
                ]
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should clear all nodes between two text nodes when deleting a text node, merging the starting and ending text nodes (multiple images/text)', () => {
        const lastNode = createTextNode('');
        const textNodeBeforeImage = createTextNode('text-1');
        const nodes: EditorNodeNewLine[] = [
            createNewlineNode([createTextNode('text-0')]),
            createNewlineNode([createImageNode('some-image-src-0')]),
            createNewlineNode([textNodeBeforeImage]),
            createNewlineNode([createImageNode('some-image-src-1')]),
            createNewlineNode([lastNode]),
        ]
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeNewLine[] = [
            nodes[0],
            nodes[1],
            {
                ...nodes[4],
                children: [
                    {
                        ...lastNode,
                        content: textNodeBeforeImage.content
                    }
                ]
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should remove an emoticon and merge surrounding text nodes', () => {
        const textNodeBeforeEmoticon = createTextNode('Text before emoticon');
        const emoticonNode = createEmoticonNode('some-emoticon-src');
        const lastNode = createTextNode('');
        const newline = createNewlineNode([
            textNodeBeforeEmoticon,
            emoticonNode,
            lastNode,
        ]);
        const nodes: EditorNodeNewLine[] = [newline];
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeNewLine[] = [
            {
                ...newline,
                children: [
                    {
                        ...lastNode,
                        content: textNodeBeforeEmoticon.content
                    }
                ]
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should remove a newline and merge surrounding text nodes', () => {
        const firstText = createTextNode('Text before newline');
        const textAfterNewline = createTextNode('');
        const firstTextNewline = createNewlineNode([firstText]);
        const secondTextNewline = createNewlineNode([textAfterNewline]);
        const nodes: EditorNodeNewLine[] = [
            firstTextNewline,
            secondTextNewline,
        ]
        focusNode(textAfterNewline);
        const toDelete = textAfterNewline;
        const expectedResult: EditorNodeNewLine[] = [
            {
                ...secondTextNewline,
                children: [
                    {
                        ...textAfterNewline,
                        content: firstText.content
                    }
                ]
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should only remove one consecutive newline, retaining the focused text node', () => {
        const firstText = createTextNode('Text before newline');
        const secondText = createTextNode('');
        const thirdText = createTextNode('');
        const lastText = createTextNode('');
        const firstNewline = createNewlineNode([firstText]);
        const secondNewline = createNewlineNode([secondText]);
        const thirdNewline = createNewlineNode([thirdText]);
        const lastNewline = createNewlineNode([lastText]);
        const nodes: EditorNodeNewLine[] = [
            firstNewline,
            secondNewline,
            thirdNewline,
            lastNewline,
        ]
        focusNode(lastText);
        const toDelete = lastText;
        const expectedResult: EditorNodeNewLine[] = [
            firstNewline,
            secondNewline,
            lastNewline,
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should retain the type of the source node on merging (backspacing BOLD into TEXT)', () => {
        const boldNode = createBoldNode('test-0');
        const textNode = createTextNode('test-1');
        const lastEmptyBoldNode = createBoldNode('');
        const newline = createNewlineNode([
            boldNode,
            textNode,
            lastEmptyBoldNode
        ])
        const nodes: EditorNodeNewLine[] = [newline];
        focusNode(lastEmptyBoldNode);
        const toDelete = lastEmptyBoldNode;
        const expectedResult: EditorNodeNewLine[] = [
            {
                // we expect to have the same container
                ...newline,
                children: [
                    // we expect the first node to remain
                    boldNode,
                    {
                        // we will retain the last node and merge it
                        ...lastEmptyBoldNode,
                        // with the content of the node before it
                        content: textNode.content,
                        // and with the type of node before it, since it's a type of text node
                        type: textNode.type
                    }
                ]
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

});
