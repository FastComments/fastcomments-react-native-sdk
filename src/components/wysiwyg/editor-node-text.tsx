import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, TextInputSelectionChangeEventData, TextStyle} from "react-native";
import {MutableRefObject, useRef, useState} from "react";
import {useHookstateEffect} from "@hookstate/core";
import {getNextNodeId} from "./node-id";

export function createTextNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT,
        isFocused: false
    }
}

export interface EditorNodeTextProps extends EditorNodeProps {
    style?: TextStyle
}

export function EditorNodeText({node, onBlur, onFocus, onDelete, style}: EditorNodeTextProps) {
    const [selection, setSelection] = useState<{
        start: number;
        end: number;
    }>();

    useHookstateEffect(() => {
        // TODO use onContentSizeChange
    }, [node.content]);

    const ref = useRef<TextInput>();
    if (node.isFocused.get()) {
        console.log('Focusing node', node.id.get(), !!ref.current)
        ref.current?.focus();
    }
    useHookstateEffect(() => {
        if (node.isFocused.get()) {
            console.log('Focusing node', node.id.get())
            ref.current?.focus();
        }
    }, [node.isFocused.get()]);

    const handleKeyUp = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        console.log('???', e.nativeEvent.key);
        switch (e.nativeEvent.key) {
            case 'Enter': // TODO maybe onSubmitEditing?
                // TODO add a newline node
                break;
            case 'Backspace':
                if (selection?.start === 0) {
                    // delete this node
                    onDelete && onDelete();
                }
                break;
        }
    }

    const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        setSelection(e.nativeEvent.selection);
    }

    // TODO if not multiline, set returnKeyType to "go"
    return <TextInput
        value={node.content.get()}
        onChangeText={(newValue: string) => (node.content.set(newValue))}
        onSelectionChange={onSelectionChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyPress={handleKeyUp}
        ref={ref as MutableRefObject<TextInput>}
        style={[style, {padding: 0, borderWidth: 0}]}
    />;
}
