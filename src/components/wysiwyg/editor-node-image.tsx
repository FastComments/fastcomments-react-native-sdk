import {EditorNodeProps} from "./editor-node";
import {Image} from "react-native";

export function EditorNodeImage({node}: EditorNodeProps) {
    return <Image source={{uri: node.content.get()}} style={{
        flexGrow: 1,
        aspectRatio: 1,
        resizeMode: 'contain',
        marginTop: 10,
        marginBottom: 10
    }}/>;
}
