import {stringToNodes} from "../editor-node-transform";
import {EditorFormatConfigurationHTML} from "../transformers";
import {EditorNodeType} from "../node-types";

describe('editor-node-transform', () => {

    it('should support plain text', () => {
        const input = `text`;
        const result = stringToNodes(EditorFormatConfigurationHTML, input);

        expect(result[0].type).toEqual(EditorNodeType.NEWLINE);
        expect(result[0].children?.length).toEqual(1);
        if (result[0].children && result[0].children.length > 0) {
            expect(result[0].children[0].type).toEqual(EditorNodeType.TEXT);
            expect(result[0].children[0].content).toEqual('text');
        }
    });

    it('should support plain text with newlines', () => {
        const input = `first line
second line`;
        const result = stringToNodes(EditorFormatConfigurationHTML, input);

        expect(result[0].type).toEqual(EditorNodeType.NEWLINE);
        expect(result[0].children?.length).toEqual(1);
        if (result[0].children && result[0].children.length > 0) {
            expect(result[0].children[0].type).toEqual(EditorNodeType.TEXT);
            expect(result[0].children[0].content).toEqual('first line');
        }

        expect(result[1].type).toEqual(EditorNodeType.NEWLINE);
        expect(result[1].children?.length).toEqual(1);
        if (result[1].children && result[1].children.length > 0) {
            expect(result[1].children[0].type).toEqual(EditorNodeType.TEXT);
            expect(result[1].children[0].content).toEqual('second line');
        }
    });

    it('should support text with images', () => {
        const input = `text before
[img]https://staticm.fastcomments.com/1663891248769-IMG_20200419_092549.jpg[/img]
text after
`;
        const result = stringToNodes(EditorFormatConfigurationHTML, input);

        expect(result[0].type).toEqual(EditorNodeType.NEWLINE);
        expect(result[0].children?.length).toEqual(1);
        if (result[0].children && result[0].children.length > 0) {
            expect(result[0].children[0].type).toEqual(EditorNodeType.TEXT);
            expect(result[0].children[0].content).toEqual('text before');
        }
        expect(result[1].type).toEqual(EditorNodeType.NEWLINE);
        expect(result[1].children?.length).toEqual(1);
        if (result[1].children && result[1].children.length > 0) {
            expect(result[1].children[0].type).toEqual(EditorNodeType.IMAGE);
            expect(result[1].children[0].content).toEqual('https://staticm.fastcomments.com/1663891248769-IMG_20200419_092549.jpg');
        }
        expect(result[2].type).toEqual(EditorNodeType.NEWLINE);
        expect(result[2].children?.length).toEqual(1);
        if (result[2].children && result[2].children.length > 0) {
            expect(result[2].children[0].type).toEqual(EditorNodeType.TEXT);
            expect(result[2].children[0].content).toEqual('text after');
        }
    });

    it('should support emoticons', () => {
        // TODO. Will be HTML image with class of react.
    });

});
