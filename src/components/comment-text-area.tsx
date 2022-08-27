import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {Text, StyleSheet, Image} from "react-native";
import {Editor} from "./wysiwyg/wysiwyg-editor";
import {useEffect, useState} from "react";
import {EditorToolbar, EditorToolbarConfig} from "./wysiwyg/editor-toolbar";
import {FastCommentsImageAsset} from "../types/image-asset";
import {nodesToString, stringToNodes} from "./wysiwyg/editor-node-transform";
import {EditorFormatConfigurationHTML} from "./wysiwyg/transformers";
import {EditorNodeDefinition} from "./wysiwyg/editor-node";

export interface CommentTextAreaProps {
    state: State<FastCommentsState>
    value?: string
    onChangeText: (value: string) => void
    onFocus?: () => void
}

export function CommentTextArea({state, value, onChangeText, onFocus: _onFocus}: CommentTextAreaProps) {
    // TODO toolbar supports inline reacts - support for extension customizing toolbar?
    // TODO gif selector
    const [isFocused, setFocused] = useState(false);
    const placeholder = <Text style={styles.placeholder}>{state.translations.ENTER_COMMENT_HERE.get()}</Text>
    const toolbarConfig: EditorToolbarConfig = {
        boldButton: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_BOLD].get()} style={styles.toolbarButton}/>,
        italicButton: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_ITALIC].get()} style={styles.toolbarButton}/>,
        underlineButton: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_UNDERLINE].get()} style={styles.toolbarButton}/>,
        strikethroughButton: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_STRIKETHROUGH].get()} style={styles.toolbarButton}/>,
        imageButton: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_IMAGE_UPLOAD].get()} style={styles.toolbarButton}/>,
        uploadImage: async (_node, photoData) => {
            const formData = new FormData();
            formData.append('file', photoData);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', state.apiHost.get() + '/upload-image/' + state.config.tenantId.get());
            xhr.onprogress = function () {
                // TODO show progress
                console.log('uploading image', xhr.status);
            }
            return new Promise((resolve, reject) => {
                xhr.onload = function () {
                    // TODO show progress done
                    console.log('done uploading image', xhr.status);
                    if (xhr.status === 200) {
                        const url = JSON.parse(xhr.response).url;
                        resolve(url);
                    } else {
                        reject(xhr.response);
                    }
                }
                xhr.send(formData);
            });
        }
    }
    const maxLength = state.config.maxCommentCharacterLength.get() || 2000;
    const [editorNodes, setEditorNodes] = useState(stringToNodes(EditorFormatConfigurationHTML, value || ''));
    const [isEmpty, setIsEmpty] = useState(!!value);
    useEffect(() => {
        if (!value) { // normally, let the widget handle updating the nodes itself. However, if we clear the value, then we want to clear the nodes.
            setEditorNodes(stringToNodes(EditorFormatConfigurationHTML, value || ''));
        }
    }, [value]);

    function onChange(nodes: State<EditorNodeDefinition[]>) {
        const newText = nodesToString(nodes, EditorFormatConfigurationHTML, maxLength);
        setIsEmpty(!newText);
        onChangeText(newText);
    }

    return <Editor
        nodes={editorNodes}
        onChange={onChange}
        style={styles.textarea}
        placeholder={!isFocused && isEmpty && placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        toolbar={(config) => <EditorToolbar config={config}/>}
        toolbarConfig={toolbarConfig}
    />
}

const styles = StyleSheet.create({
    textarea: {
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: 'black',
        borderRadius: 11
    },
    placeholder: {
        position: 'absolute',
        padding: 8,
        color: '#000' // TODO don't use #000
    },
    toolbarButton: {
        height: '100%',
        aspectRatio: 1,
        resizeMode: 'stretch'
    }
})
