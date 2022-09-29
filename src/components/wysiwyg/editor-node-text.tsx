import {EditorNodeProps} from "./editor-node";
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
import {EditorNodeTextType, EditorNodeType} from "./node-types";

export interface EditorNodeTextProps extends EditorNodeProps {
    textStyle?: TextStyle
    isMultiLine?: boolean
}

export function EditorNodeText(props: EditorNodeTextProps) {
    const {node, onChangeContent, onBlur, onDelete, onTryNewline, textStyle, isMultiLine} = props;
    // const [value, setValue] = useState(node.content);
    const [selection, setSelection] = useState<{
        start: number;
        end: number;
    }>();

    const [ignoreNextBlur, setIgnoreNextBlur] = useState(false);

    function handleOnBlur() {
        if (ignoreNextBlur) {
            return;
        }
        onBlur && onBlur();
    }

    const valueRef = useRef(node.content);
    const ref = useRef<TextInput>();
    // console.log('RE-RENDER', node.id, node.lastFocusTime);
    useEffect(() => {
        let timeout: number;
        if (node.isFocused) {
            const lastFocusTime = node.lastFocusTime;
            // if (lastFocusTime === lastLastFocusTime) {
            //     return;
            // }
            console.log('Focusing node (A)', node.id, lastFocusTime);
            setIgnoreNextBlur(true);
            // @ts-ignore
            timeout = setTimeout(() => {
                function doFocus() {
                    // @ts-ignore
                    timeout = setTimeout(function () {
                        InteractionManager.runAfterInteractions(() => {
                            ref.current?.focus();
                            // @ts-ignore
                            timeout = setTimeout(function () {
                                setIgnoreNextBlur(false);
                                // setLastLastFocusTime(lastFocusTime);
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
    }, [node.isFocused]);

    useEffect(() => {
        valueRef.current = node.content;
    }, [node.content]);

    const handleKeyUp = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        switch (e.nativeEvent.key) {
            case 'Enter':
                if (isMultiLine) {
                    onTryNewline && onTryNewline();
                }
                break;
            case 'Backspace':
                if ((!selection?.start) || node.deleteOnBackspace) {
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
        value={valueRef.current}
        onChangeText={(newValue: string) => {
            // update ui value right away (why is this faster than defaultValue???
            // setValue(newValue);
            valueRef.current = newValue;
            // timeout here helps fix UI reflow lag
            onChangeContent!(newValue);
        }
        }
        onSelectionChange={onSelectionChange}
        onBlur={handleOnBlur}
        onKeyPress={handleKeyUp}
        blurOnSubmit={false}
        onSubmitEditing={onSubmit}
        ref={ref as MutableRefObject<TextInput>}
        returnKeyType={isMultiLine ? 'default' : 'send'}
        style={[StylesByNodeType[node.type], textStyle]}
    />;
}

const BaseTextStyles: TextStyle = {padding: 0, borderWidth: 0, position: 'relative', left: 0, minWidth: 0};
const StylesByNodeType: Record<EditorNodeTextType, TextStyle> = {
    [EditorNodeType.TEXT_BOLD]: {fontWeight: 'bold', ...BaseTextStyles},
    [EditorNodeType.TEXT_ITALIC]: {fontStyle: 'italic', ...BaseTextStyles},
    [EditorNodeType.TEXT_STRIKETHROUGH]: {textDecorationLine: 'line-through', ...BaseTextStyles},
    [EditorNodeType.TEXT]: BaseTextStyles,
    [EditorNodeType.TEXT_UNDERLINE]: {textDecorationLine: 'underline', ...BaseTextStyles},
}
