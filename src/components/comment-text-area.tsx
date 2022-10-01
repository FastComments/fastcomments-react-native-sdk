import {FastCommentsState, FastCommentsImageAsset, IFastCommentsStyles, FastCommentsCallbacks} from "../types";
import {State} from "@hookstate/core";
import {Text, Image} from "react-native";
import {Editor, UpdateNodesObserver} from "./wysiwyg/wysiwyg-editor";
import {useEffect, useRef, useState} from "react";
import {EditorToolbar, EditorToolbarConfig} from "./wysiwyg/editor-toolbar";
import {graphToString, hasContent, stringToNodes} from "./wysiwyg/editor-node-transform";
import {EditorFormatConfigurationHTML} from "./wysiwyg/transformers";
import {EmoticonBarConfig} from "./wysiwyg/emoticon-bar";
import {EditorNodeNewLine} from "./wysiwyg/node-types";
import {getLast, getLastFocused} from "./wysiwyg/node-navigate";
import {focusNode} from "./wysiwyg/node-focus";

export interface ValueObserver {
    getValue?: () => string
}

export interface FocusObserver {
    setFocused?: (focused: boolean) => void
}

export interface CommentTextAreaProps extends Pick<FastCommentsCallbacks, 'pickImage'> {
    emoticonBarConfig?: EmoticonBarConfig
    focusObserver?: FocusObserver
    state: FastCommentsState
    styles: IFastCommentsStyles
    output: ValueObserver
    onFocus?: () => void
    value?: string
}

export function CommentTextArea({
    emoticonBarConfig,
    focusObserver,
    state,
    styles,
    output,
    onFocus: _onFocus,
    pickImage,
    value,
}: CommentTextAreaProps) {
    // console.log('opening text area', value);
    // TODO toolbar supports inline reacts - support for extension customizing toolbar?
    // TODO gif selector
    const maxLength = state.config.maxCommentCharacterLength || 2000;
    const hasDarkBackground = state.config.hasDarkBackground;
    const [isFocused, setFocused] = useState(false);
    const [isEmpty, setIsEmpty] = useState(!!value);
    const editorInputNodesRef = useRef<EditorNodeNewLine[]>([]);
    const editorCurrentNodesRef = useRef<State<EditorNodeNewLine[]> | null>(null);
    const updateNodesObserver: UpdateNodesObserver = {};

    useEffect(() => {
        const newNodes = stringToNodes(EditorFormatConfigurationHTML, value || '');
        editorInputNodesRef.current = newNodes;
        updateNodesObserver.updateNodes!(newNodes);
    }, [value]);

    const placeholder = <Text style={styles.commentTextArea?.placeholder}>{state.translations.ENTER_COMMENT_HERE}</Text>

    // TODO not live responding to dark background config change
    const toolbarConfig: EditorToolbarConfig | undefined = state.config.disableToolbar ? undefined : {
        boldButton: <Image source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BOLD_WHITE : FastCommentsImageAsset.ICON_BOLD]}
                           style={styles.commentTextArea?.toolbarButton}/>,
        italicButton: <Image
            source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_ITALIC_WHITE : FastCommentsImageAsset.ICON_ITALIC]}
            style={styles.commentTextArea?.toolbarButton}/>,
        underlineButton: <Image
            source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_UNDERLINE_WHITE : FastCommentsImageAsset.ICON_UNDERLINE]}
            style={styles.commentTextArea?.toolbarButton}/>,
        strikethroughButton: <Image
            source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_STRIKETHROUGH_WHITE : FastCommentsImageAsset.ICON_STRIKETHROUGH]}
            style={styles.commentTextArea?.toolbarButton}/>,
        imageButton: pickImage ? <Image
            source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_IMAGE_UPLOAD_WHITE : FastCommentsImageAsset.ICON_IMAGE_UPLOAD]}
            style={[styles.commentTextArea?.toolbarButton]}/> : null,
        pickImage,
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

    const stealth = {stealth: true, noproxy: true};
    function onChange(nodes: State<EditorNodeNewLine[]>) {
        // we could automatically trim content here, via updating the graph in-place.
        // but it causes lag so probably better to just tell the user to shorten their text
        // is better UX anyway vs losing keystrokes.
        const newIsEmpty = !hasContent(nodes.get(stealth));
        if (isEmpty !== newIsEmpty) {
            setIsEmpty(isEmpty);
        }
        editorCurrentNodesRef.current = nodes;
    }

    output.getValue = () => {
        return graphToString(editorCurrentNodesRef.current ? editorCurrentNodesRef.current.get() : null, EditorFormatConfigurationHTML, maxLength);
    }

    if (focusObserver) {
        focusObserver.setFocused = (isFocused) => {
            if (isFocused) {
                const lastFocused = getLastFocused(editorInputNodesRef.current);
                lastFocused.isFocused = false;
                focusNode(getLast(editorInputNodesRef.current));
            } else {
                const lastFocused = getLastFocused(editorInputNodesRef.current);
                lastFocused.isFocused = false;
            }
            updateNodesObserver.updateNodes!(editorInputNodesRef.current);
        }
    }

    return <Editor
        graph={editorInputNodesRef.current}
        updateNodesObserver={updateNodesObserver}
        isMultiLine={!state.config.useSingleLineCommentInput}
        onChange={onChange}
        style={styles.commentTextArea?.textarea}
        textStyle={styles.commentTextArea?.text}
        placeholder={!isFocused && isEmpty && placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        toolbar={(config) => <EditorToolbar config={config}/>}
        toolbarConfig={toolbarConfig}
        emoticonBarConfig={emoticonBarConfig}
    />
}
