import {EditorNodeProps} from "./editor-node";
import {Image} from "react-native";

export function EditorNodeEmoticon({node}: EditorNodeProps) {
    return <Image source={{uri: node.content.get()}} style={{width: 22, height: 22, marginLeft: 1, marginRight: 1}}/>;
}
