import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {TextInput} from "react-native";
import {MutableRefObject, useRef} from "react";
import {useHookstateEffect} from "@hookstate/core";
import {getNextNodeId} from "./node-id";

export function createStrikethroughNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        previous: null,
        next: null,
        content: startingValue,
        type: EditorNodeType.TEXT_STRIKETHROUGH,
        isFocused: false
    }
}

export function EditorNodeStrikethrough({node, onBlur, onFocus}: EditorNodeProps) {
    useHookstateEffect(() => {
        // TODO how to detect if text goes beyond one line?
    }, [node.content]);

    const ref = useRef<TextInput>();
    useHookstateEffect(() => {
        if (node.isFocused.get()) {
            ref.current?.focus();
        }
    }, [node.isFocused]);

    return <TextInput
        value={node.content.get()}
        onChangeText={(newValue: string) => (node.content.set(newValue))}
        onBlur={() => {
            onBlur && onBlur();
        }
        }
        onFocus={() => {
            onFocus && onFocus();
        }
        }
        ref={ref as MutableRefObject<TextInput>}
        style={{textDecorationLine: 'line-through'}}
    />;
}
