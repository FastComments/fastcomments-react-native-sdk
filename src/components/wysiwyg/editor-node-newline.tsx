import {EditorNodeDefinition, EditorNodeType} from "./editor-node";
import {getNextNodeId} from "./node-id";

export function createNewlineNode(): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: '',
        type: EditorNodeType.NEWLINE,
        isFocused: false
    }
}

// export function EditorNodeNewline(_props: EditorNodeProps) {
//     return <View style={{height: 0, flexDirection: 'row', flexGrow: 1, flexShrink: 0, alignSelf: 'flex-start'}}/>
// }
