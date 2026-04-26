/**
 * Jest mock for the native `react-native-enriched` editor. The real component
 * uses native iOS/Android views and cannot run in a pure Node test process.
 *
 * The mock renders a plain RN <TextInput>, exposes a small ref API matching
 * what the SDK uses (`focus`, `blur`, `setValue`, `setImage`, `toggleBold`,
 * `toggleItalic`, `toggleUnderline`, `toggleStrikeThrough`), and emits
 * `onChangeHtml({ value })` events that mirror what the native version produces.
 *
 * The `testID="commentInput"` makes the input addressable from tests via
 * `getByTestId('commentInput')` -> `fireEvent.changeText(node, '...')`.
 */
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { TextInput } from 'react-native';

export type EnrichedTextInputInstance = {
    focus: () => void;
    blur: () => void;
    setValue: (value: string) => void;
    setImage: (url: string, x: number, y: number) => void;
    toggleBold: () => void;
    toggleItalic: () => void;
    toggleUnderline: () => void;
    toggleStrikeThrough: () => void;
};

export type OnChangeStateEvent = {
    bold?: { isActive?: boolean };
    italic?: { isActive?: boolean };
    underline?: { isActive?: boolean };
    strikeThrough?: { isActive?: boolean };
};

export interface EnrichedTextInputProps {
    defaultValue?: string;
    onChangeHtml?: (e: { nativeEvent: { value: string } }) => void;
    onChangeState?: (e: { nativeEvent: OnChangeStateEvent }) => void;
    onFocus?: () => void;
    style?: unknown;
    testID?: string;
}

export const EnrichedTextInput = forwardRef<EnrichedTextInputInstance, EnrichedTextInputProps>(
    function EnrichedTextInput(props, ref) {
        const [value, setValue] = useState<string>(props.defaultValue || '');

        useImperativeHandle(ref, () => ({
            focus: () => {},
            blur: () => {},
            setValue: (v: string) => {
                setValue(v);
                props.onChangeHtml && props.onChangeHtml({ nativeEvent: { value: v } });
            },
            setImage: (url: string) => {
                const next = (value || '') + `<img src="${url}" />`;
                setValue(next);
                props.onChangeHtml && props.onChangeHtml({ nativeEvent: { value: next } });
            },
            toggleBold: () => {},
            toggleItalic: () => {},
            toggleUnderline: () => {},
            toggleStrikeThrough: () => {},
        }));

        return (
            <TextInput
                testID={props.testID || 'commentInput'}
                value={value}
                onChangeText={(text) => {
                    setValue(text);
                    props.onChangeHtml && props.onChangeHtml({ nativeEvent: { value: text } });
                }}
                onFocus={props.onFocus}
                multiline
            />
        );
    }
);

export default { EnrichedTextInput };
