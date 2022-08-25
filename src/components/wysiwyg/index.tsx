import {Pressable, StyleSheet, TextInput} from "react-native";
import {useRef} from "react";
import {EditorNode, EditorNodeDefinition, EditorNodeType} from "./editor-node";
import {State, useHookstate} from "@hookstate/core";

export interface EditorProps {
    value: string
}

function createNode(startingValue: string, type: EditorNodeType): EditorNodeDefinition {
    const ref = useRef<TextInput>();
    // TODO separate modules for creating each node
    return {
        previous: null,
        next: null,
        content: startingValue,
        type,
        ref,
        isSelected: false
    }
}

export function Editor(props: EditorProps) {
    // TODO support rendering existing content
    // TODO support updating props.value based on edits
    const nodes = useHookstate<EditorNodeDefinition[]>([createNode(props.value, EditorNodeType.TEXT)]);
    let lastSelectedNode: EditorNodeDefinition | null;

    function select(node?: State<EditorNodeDefinition>) {
        if (!node) {
            if (nodes.length === 0) {
                nodes.set([createNode('', EditorNodeType.TEXT)]);
            }
            return;
        }
        if (node.isSelected.get()) {
            return;
        }
        node.isSelected.set(true);
        if (lastSelectedNode) {
            node.isSelected.set(false);
        }
    }

    // TODO create ids and use as key
    return <Pressable
        style={styles.root}
        onPress={() => select(nodes[0])}
    >
        {nodes.map((node) => <EditorNode node={node}/>)}
    </Pressable>
}

const styles = StyleSheet.create({
    root: {}
})
