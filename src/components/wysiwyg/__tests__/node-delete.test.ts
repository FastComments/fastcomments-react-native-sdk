import {createBoldNode, createEmoticonNode, createImageNode, createTextNode} from "../editor-nodes";
import {focusNode} from "../node-focus";
import {deleteNodeRetainFocus} from "../node-delete";
import {EditorNodeDefinition} from "../node-types";
import {createNewlineNode} from "../node-create";

describe('node-delete', () => {

    it('should merge two text nodes when deleting an empty one before a node with content, resulting in one node', () => {
        const nodes: EditorNodeDefinition[] = [
            createTextNode('@some-user-name'),
            createTextNode('')
        ]
        focusNode(nodes[1]);
        const toDelete = nodes[1];
        const expectedResult: EditorNodeDefinition[] = [
            {
                ...nodes[1],
                content: nodes[0].content
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should clear all nodes between two text nodes when deleting a text node, merging the starting and ending text nodes', () => {
        const lastNode = createTextNode('');
        const nodes: EditorNodeDefinition[] = [
            createTextNode('Text before image'),
            createNewlineNode(),
            createImageNode('some-image-src'),
            createNewlineNode(),
            lastNode
        ]
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeDefinition[] = [
            {
                ...lastNode,
                content: nodes[0].content
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should clear all nodes between two text nodes when deleting a text node, merging the starting and ending text nodes (multiple images/text)', () => {
        const lastNode = createTextNode('');
        const nodes: EditorNodeDefinition[] = [
            createTextNode('text-0'),
            createNewlineNode(),
            createImageNode('some-image-src-0'),
            createNewlineNode(),
            createTextNode('text-1'),
            createNewlineNode(),
            createImageNode('some-image-src-1'),
            createNewlineNode(),
            lastNode
        ]
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeDefinition[] = [
            nodes[0],
            nodes[1],
            nodes[2],
            nodes[3],
            {
                ...lastNode,
                content: nodes[4].content
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should remove an emoticon and merge surrounding text nodes', () => {
        const nodes: EditorNodeDefinition[] = [
            createTextNode('Text before emoticon'),
            createEmoticonNode('some-emoticon-src'),
            createTextNode(''),
        ]
        const lastNode = nodes[nodes.length - 1];
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeDefinition[] = [
            {
                ...lastNode,
                content: nodes[0].content
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should remove a newline and merge surrounding text nodes', () => {
        const nodes: EditorNodeDefinition[] = [
            createTextNode('Text before newline'),
            createNewlineNode(),
            createTextNode(''),
        ]
        const lastNode = nodes[nodes.length - 1];
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeDefinition[] = [
            {
                ...lastNode,
                content: nodes[0].content
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should only remove one consecutive newline, retaining the focused text node', () => {
        const nodes: EditorNodeDefinition[] = [
            createTextNode('Text before newline'),
            createNewlineNode(),
            createNewlineNode(),
            createTextNode(''),
        ]
        const lastNode = nodes[nodes.length - 1];
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeDefinition[] = [
            nodes[0],
            nodes[1],
            lastNode
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

    it('should retain the type of the source node on merging (backspacing BOLD into TEXT)', () => {
        const nodes: EditorNodeDefinition[] = [
            createBoldNode('test-0'),
            createTextNode('test-1'),
            createBoldNode('')
        ]
        const lastNode = nodes[2];
        focusNode(lastNode);
        const toDelete = lastNode;
        const expectedResult: EditorNodeDefinition[] = [
            nodes[0],
            {
                // we expect the last node to remain
                ...nodes[2],
                // with the content of the node before it
                content: nodes[1].content,
                // and with the type of node before it, since it's a type of text node
                type: nodes[1].type
            }
        ];
        deleteNodeRetainFocus(nodes, toDelete);
        expect(nodes).toEqual(expectedResult);
    });

});
