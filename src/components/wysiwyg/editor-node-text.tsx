import {EditorNodeProps} from "./editor-node";
import {TextInput} from "react-native";
import {MutableRefObject, useEffect, useState} from "react";

export function EditorNodeText({node}: EditorNodeProps) {
    const [value, setValue] = useState(node.content.get());
    useEffect(() => {
        // TODO how to detect if text goes beyond one line?
    }, [value]);
    useEffect(() => {
        if (node.isSelected.get()) {
            node.ref.get()?.current?.focus();
        }
    }, [node.isSelected.get()]);
    return <TextInput
        value={value}
        onChangeText={(newValue: string) => (setValue(newValue))}
        ref={node.ref.get() as MutableRefObject<TextInput>}
    />;
}
