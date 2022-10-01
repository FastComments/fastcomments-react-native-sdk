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
    const {nodeState, onBlur, doDelete, doDeleteNodeBefore, onTryNewline, textStyle, isMultiLine} = props;
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

    const ref = useRef<TextInput>();
    // console.log('RE-RENDER', node.id, node.lastFocusTime);
    useEffect(() => {
        let timeout: number;
        if (nodeState.isFocused.get()) {
            const lastFocusTime = nodeState.lastFocusTime.get();
            // if (lastFocusTime === lastLastFocusTime) {
            //     return;
            // }
            console.log('Focusing node (A)', nodeState.id.get(), lastFocusTime);
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
    }, [nodeState.isFocused.get()]);

    const handleKeyUp = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        switch (e.nativeEvent.key) {
            case 'Enter':
                if (isMultiLine) {
                    onTryNewline && onTryNewline();
                }
                break;
            case 'Backspace':
                if ((!selection?.start) || nodeState.deleteOnBackspace.get()) {
                    try {
                        /*
                            TODO why is delete before newline triggering delete when only one char left but not other scenarios? Example
                                abc
                                <newline>
                                x|
                                ---trigger backspace - ends up with:---
                                abcx|
                         */
                        if (nodeState.content.get()) {
                            console.log('TRIGGERING DELETE NODE BEFORE', selection?.start, nodeState.content.get());
                            doDeleteNodeBefore && doDeleteNodeBefore(); // user is backspacing at start of node
                        } else {
                            console.log('TRIGGERING DELETE CURRENT NODE', selection?.start, nodeState.content.get());
                            // delete this node
                            doDelete && doDelete();
                        }
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
        value={nodeState.content.get()}
        onChangeText={(newValue: string) => {
            nodeState.content.set(newValue);
        }
        }
        onSelectionChange={onSelectionChange}
        onBlur={handleOnBlur}
        onKeyPress={handleKeyUp}
        blurOnSubmit={false}
        onSubmitEditing={onSubmit}
        ref={ref as MutableRefObject<TextInput>}
        returnKeyType={isMultiLine ? 'default' : 'send'}
        style={[StylesByNodeType[nodeState.type.get()], textStyle]}
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
