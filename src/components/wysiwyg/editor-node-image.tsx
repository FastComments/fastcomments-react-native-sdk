import {EditorNodeProps} from "./editor-node";
import {Image} from "react-native";

export function EditorNodeImage({nodeState}: EditorNodeProps) {
    // TODO "remove" button in top left
    return <Image source={{uri: nodeState.content.get()}} style={{
        width: '100%',
        aspectRatio: 1,
        resizeMode: 'contain',
        marginTop: 10,
        marginBottom: 10,
    }}/>;
}
