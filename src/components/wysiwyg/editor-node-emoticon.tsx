import {EditorNodeProps} from "./editor-node";
import {Image} from "react-native";

export function EditorNodeEmoticon({nodeState}: EditorNodeProps) {
    return <Image source={{uri: nodeState.content.get()}} style={{width: 22, height: 22, marginLeft: 1, marginRight: 1}}/>;
}
