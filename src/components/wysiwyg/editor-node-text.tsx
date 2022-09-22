import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {
    InteractionManager,
    NativeSyntheticEvent,
    TextInput,
    TextInputKeyPressEventData,
    TextInputSelectionChangeEventData,
    TextInputSubmitEditingEventData,
    TextStyle
} from "react-native";
import {MutableRefObject, useEffect, useRef, useState} from "react";
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
    textStyle?: TextStyle
    isMultiLine?: boolean
}

export function EditorNodeText(props: EditorNodeTextProps) {
    const {node, onBlur, onDelete, onTryNewline, textStyle, isMultiLine} = props;
    const [value, setValue] = useState(node.content.get());
    const [selection, setSelection] = useState<{
        start: number;
        end: number;
    }>();

    // useHookstateEffect(() => {
    //     // TODO use onContentSizeChange
    // }, [node.content]);

    const [ignoreNextBlur, setIgnoreNextBlur] = useState(false);

    function handleOnBlur() {
        if (ignoreNextBlur) {
            return;
        }
        onBlur && onBlur();
    }

    const ref = useRef<TextInput>();
    useEffect(() => {
        let timeout: number;
        if (node.isFocused.get()) {
            console.log('Focusing node (A)', node.id.get());
            setIgnoreNextBlur(true);
            timeout = setTimeout(() => {
                function doFocus() {
                    timeout = setTimeout(function () {
                        InteractionManager.runAfterInteractions(() => {
                            ref.current?.focus();
                            timeout = setTimeout(function () {
                                setIgnoreNextBlur(false);
                            }, 0);
                        });
                    }, 0);
                }

                if (ref.current?.isFocused()) {
                    ref.current?.blur();
                    doFocus();
                } else {
                    doFocus();
                }
            }, 0);
        }
        return () => {
            timeout && clearTimeout(timeout)
        };
    }, [node.lastFocusTime.get()]);

    const handleKeyUp = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        switch (e.nativeEvent.key) {
            case 'Enter':
                if (isMultiLine) {
                    onTryNewline && onTryNewline();
                }
                break;
            case 'Backspace':
                if ((!selection?.start) || node.deleteOnBackspace.get()) {
                    try {
                        /*
                            TODO why is delete before newline triggering delete when only one char left but not other scenarios? Example
                                abc
                                <newline>
                                x|
                                ---trigger backspace - ends up with:---
                                abcx|
                         */
                        // console.log('TRIGGERING DELETE', selection?.start, node.content.get());
                        // delete this node
                        onDelete && onDelete();
                    } catch (e) {
                        console.error('wtf', e); // TODO remove
                    }
                } else {
                    console.log('selection was', selection.start);
                }
                break;
        }
    }

    const onSubmit = (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
        onTryNewline && onTryNewline();
    }

    const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        setSelection(e.nativeEvent.selection);
    }

    return <TextInput
        value={value}
        onChangeText={(newValue: string) => {
            // update ui value right away (why is this faster than defaultValue???
            setValue(newValue);
            // timeout here helps fix UI reflow lag
            setTimeout(() => node && node.content && node.content.set(newValue), 0)
        }
        }
        onSelectionChange={onSelectionChange}
        onBlur={handleOnBlur}
        onKeyPress={handleKeyUp}
        blurOnSubmit={false}
        onSubmitEditing={onSubmit}
        ref={ref as MutableRefObject<TextInput>}
        returnKeyType={isMultiLine ? 'default' : 'send'}
        style={[textStyle, {padding: 0, borderWidth: 0, position: 'relative', left: 0, minWidth: 0}]}
    />;
}
