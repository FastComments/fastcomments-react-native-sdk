import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {Text, Image} from "react-native";
import {Editor} from "./wysiwyg/wysiwyg-editor";
import {useEffect, useState} from "react";
import {EditorToolbar, EditorToolbarConfig} from "./wysiwyg/editor-toolbar";
import {FastCommentsImageAsset} from "../types/image-asset";
import {enforceMaxLength, nodesToString, stringToNodes} from "./wysiwyg/editor-node-transform";
import {EditorFormatConfigurationHTML} from "./wysiwyg/transformers";
import {EditorNodeDefinition} from "./wysiwyg/editor-node";
import {EmoticonBar, EmoticonBarConfig} from "./wysiwyg/emoticon-bar";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface ValueObserver {
    getValue?: () => string
}

export interface CommentTextAreaProps {
    state: FastCommentsState
    styles: IFastCommentsStyles
    value?: string
    output: ValueObserver
    onFocus?: () => void
}

export function CommentTextArea({state, styles, value, output, onFocus: _onFocus}: CommentTextAreaProps) {
    // console.log('opening text area', value);
    // TODO toolbar supports inline reacts - support for extension customizing toolbar?
    // TODO gif selector
    const maxLength = state.config.maxCommentCharacterLength || 2000;
    const hasDarkBackground = state.config.hasDarkBackground;
    const [isFocused, setFocused] = useState(false);
    const [isEmpty, setIsEmpty] = useState(!!value);
    const [editorInputNodes, setEditorInputNodes] = useState<EditorNodeDefinition[]>([]);
    const [nodeState, setNodeState] = useState<State<EditorNodeDefinition[]> | null>(null);
    useEffect(() => {
        setEditorInputNodes(stringToNodes(EditorFormatConfigurationHTML, value || ''));
    }, [value]);

    const placeholder = <Text style={styles.commentTextArea?.placeholder}>{state.translations.ENTER_COMMENT_HERE}</Text>
    // TODO not enabled by default, move to extensions. This is just for testing.
    const emoticonBarConfig: EmoticonBarConfig = {
        emoticons: [
            ['https://cdn.fastcomments.com/images/fireworks.png', <Image source={{uri: 'https://cdn.fastcomments.com/images/fireworks.png'}} style={styles.commentTextArea?.toolbarButton} />],
            ['https://cdn.fastcomments.com/images/party-popper.png', <Image source={{uri: 'https://cdn.fastcomments.com/images/party-popper.png'}} style={styles.commentTextArea?.toolbarButton} />],
            ['https://cdn.fastcomments.com/images/star-64-filled.png', <Image source={{uri: 'https://cdn.fastcomments.com/images/star-64-filled.png'}} style={styles.commentTextArea?.toolbarButton} />],
        ]
    }
    // TODO not live responding to dark background config change
    const toolbarConfig: EditorToolbarConfig = {
        boldButton: <Image source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BOLD_WHITE : FastCommentsImageAsset.ICON_BOLD]} style={styles.commentTextArea?.toolbarButton}/>,
        italicButton: <Image source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_ITALIC_WHITE : FastCommentsImageAsset.ICON_ITALIC]} style={styles.commentTextArea?.toolbarButton}/>,
        underlineButton: <Image source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_UNDERLINE_WHITE : FastCommentsImageAsset.ICON_UNDERLINE]} style={styles.commentTextArea?.toolbarButton}/>,
        strikethroughButton: <Image source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_STRIKETHROUGH_WHITE : FastCommentsImageAsset.ICON_STRIKETHROUGH]} style={styles.commentTextArea?.toolbarButton}/>,
        imageButton: <Image source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_IMAGE_UPLOAD_WHITE : FastCommentsImageAsset.ICON_IMAGE_UPLOAD]} style={[styles.commentTextArea?.toolbarButton]}/>,
        uploadImage: async (_node, photoData) => {
            const formData = new FormData();
            formData.append('file', photoData);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', state.apiHost + '/upload-image/' + state.config.tenantId);
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

    function onChange(nodes: State<EditorNodeDefinition[]>) {
        const isEmpty = enforceMaxLength(nodes, EditorFormatConfigurationHTML, maxLength);
        setIsEmpty(isEmpty);
        setNodeState(nodes);
    }

    output.getValue = () => {
        return nodesToString(nodeState, EditorFormatConfigurationHTML, maxLength);
    }

    return <Editor
        nodes={editorInputNodes}
        onChange={onChange}
        style={styles.commentTextArea?.textarea}
        textStyle={styles.commentTextArea?.text}
        placeholder={!isFocused && isEmpty && placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        toolbar={(config) => <EditorToolbar config={config}/>}
        toolbarConfig={toolbarConfig}
        emoticonBar={(config) => <EmoticonBar config={config}/>}
        emoticonBarConfig={emoticonBarConfig}
    />
}
