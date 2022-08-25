import {Pressable, StyleSheet, ViewStyle} from "react-native";
import {EditorNode, EditorNodeDefinition, EditorNodeType} from "./editor-node";
import {hookstate, useHookstate, State, useHookstateEffect} from "@hookstate/core";
import {ReactNode, useState} from "react";

export interface EditorProps {
    value: string
    placeholder?: ReactNode // so you can style it etc
    onBlur?: () => void
    onFocus?: () => void
    onChangeText: (value: string) => void
    style?: ViewStyle
}

const nodeCount = hookstate<number>(0);

function createNode(startingValue: string, type: EditorNodeType): EditorNodeDefinition {
    // TODO separate modules for creating each node
    const newCount = nodeCount.get() + 1;
    nodeCount.set(newCount);
    return {
        id: newCount,
        previous: null,
        next: null,
        content: startingValue,
        type,
        isFocused: false
    }
}

export function Editor(props: EditorProps) {
    // TODO maxLength
    // TODO images
    // TODO backspace on the start of an element should trigger "delete" on element before
    // TODO "delete" on end of an element, should trigger "delete" on next element
    // TODO support rendering existing content
        // Should take "entity configuration" to map node types to syntax (could provide markdown and HTML default)
    // TODO multiline (newline element)
    const nodes = useHookstate<EditorNodeDefinition[]>([createNode(props.value, EditorNodeType.TEXT)]);
    const lastSelectedNodeDefinition = useHookstate<EditorNodeDefinition | null>(null);

    // TODO OPTIMIZE (?) on value change of each node, call back to top with "onChange" method that contains converted result and recalculate props.value.
    useHookstateEffect(() => {
        let content = '';
        for (const node of nodes) {
            content += node.content.get();
        }
        // TODO if new value is too long (maxLength), reset it to last value (easiest way) and don't call onChangeText.
        props.onChangeText(content);
    }, [nodes]);

    function select(node?: State<EditorNodeDefinition> | null) {
        props.onFocus && props.onFocus();
        if (!node) {
            if (nodes.length === 0) {
                const newNode = createNode('', EditorNodeType.TEXT);
                newNode.isFocused = true;
                nodes.set([newNode]);
            }
            return;
        }
        node.isFocused.set(true);
        if (lastSelectedNodeDefinition !== null && 'id' in lastSelectedNodeDefinition && lastSelectedNodeDefinition.id.get()== node.id.get()) {
            lastSelectedNodeDefinition.isFocused.set(false);
        }
    }

    function deselect(node: State<EditorNodeDefinition>) {
        if (node.isFocused.get()) {
            node.isFocused.set(false);
            props.onBlur && props.onBlur();
        }
    }

    // TODO create ids and use as key
    return <Pressable
        style={[styles.root, props.style]}
        onPress={() => select(nodes[0])}
    >
        {props.placeholder}
        {nodes.map((node) => {
            return <EditorNode key={node.id.get()} node={node} onBlur={() => deselect(node)} onFocus={() => select(node)}/>
        })}
    </Pressable>
}

const styles = StyleSheet.create({
    root: {}
})
