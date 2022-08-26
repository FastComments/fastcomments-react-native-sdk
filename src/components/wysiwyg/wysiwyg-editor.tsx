import {Pressable, StyleSheet, ViewStyle} from "react-native";
import {EditorNode, EditorNodeDefinition, EditorNodeType} from "./editor-node";
import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {ReactNode, useState} from "react";
import {createTextNode} from "./editor-node-text";
import {getContentTrimmed} from "./node-trim";
import {EditorToolbarConfig} from "./editor-toolbar";
import {Asset} from 'react-native-image-picker';
import * as ImagePicker from 'react-native-image-picker';
import {createImageNode} from "./editor-node-image";

export interface EditorProps {
    value: string
    placeholder?: ReactNode // so you can style it etc
    onBlur?: () => void
    onFocus?: () => void
    onChangeText: (value: string) => void
    style?: ViewStyle
    maxLength?: number
    toolbarConfig?: EditorToolbarConfig
    // you can pass in the default toolbar or make your own, and call the config methods to add bold text etc.
    toolbar?: (config: EditorToolbarConfig) => ReactNode
}

export function Editor(props: EditorProps) {
    // TODO images
    // TODO backspace on the start of an element should trigger "delete" on element before
    // TODO "delete" on end of an element, should trigger "delete" on next element
    // TODO support rendering existing content
    //  Should take "entity configuration" to map node types to syntax (could provide markdown and HTML default)
    // TODO multiline (newline element)
    // TODO wysiwyg link button
    // TODO wysiwyg gif button
    // TODO support both inline reacts and big images
    const nodes = useHookstate<EditorNodeDefinition[]>([createTextNode(props.value)]);
    const [lastSelectedNode, setLastSelectedNode] = useState<State<EditorNodeDefinition> | null>(null);
    if (props.toolbarConfig) {
        if (!props.toolbarConfig.getCurrentNode) {
            // @ts-ignore - TODO better way to do this or useHookstate<EditorNodeDefinition | null>(null); ?
            props.toolbarConfig.getCurrentNode = () => {
                return lastSelectedNode;
            }
        }
        if (props.toolbarConfig.boldButton && !props.toolbarConfig.toggleBold) {
            props.toolbarConfig.toggleBold = (node: State<EditorNodeDefinition> | null) => {
                if (node && node.get()) {
                    // TODO only bold selected content
                    // TODO if none selected, add new node and set it as bold
                    const nodeType = node.type.get();
                    if (nodeType === EditorNodeType.TEXT) {
                        // replace with bold node - easy!
                        node.type.set(EditorNodeType.TEXT_BOLD);
                    } else if (nodeType === EditorNodeType.TEXT_BOLD) {
                        node.type.set(EditorNodeType.TEXT);
                    }
                    // TODO it'd be cool if we could get the keyboard to not go away
                    node.isFocused.set(true);
                } else {
                    // TODO toggle bold
                }
            }
        }
        if (props.toolbarConfig.underlineButton && !props.toolbarConfig.toggleUnderline) {
            props.toolbarConfig.toggleUnderline = (node: State<EditorNodeDefinition> | null) => {
                if (node && node.get()) {
                    // TODO only underline selected content
                    // TODO if none selected, add new node and set it as underline
                    const nodeType = node.type.get();
                    if (nodeType === EditorNodeType.TEXT) {
                        // replace with underline node - easy!
                        node.type.set(EditorNodeType.TEXT_UNDERLINE);
                    } else if (nodeType === EditorNodeType.TEXT_UNDERLINE) {
                        node.type.set(EditorNodeType.TEXT);
                    }
                    // TODO it'd be cool if we could get the keyboard to not go away
                    node.isFocused.set(true);
                } else {
                    // TODO toggle underline
                }
            }
        }
        if (props.toolbarConfig.strikethroughButton && !props.toolbarConfig.toggleStrikethrough) {
            props.toolbarConfig.toggleStrikethrough = (node: State<EditorNodeDefinition> | null) => {
                if (node && node.get()) {
                    // TODO only strikethrough selected content
                    // TODO if none selected, add new node and set it as strikethrough
                    const nodeType = node.type.get();
                    if (nodeType === EditorNodeType.TEXT) {
                        // replace with strikethrough node - easy!
                        node.type.set(EditorNodeType.TEXT_STRIKETHROUGH);
                    } else if (nodeType === EditorNodeType.TEXT_STRIKETHROUGH) {
                        node.type.set(EditorNodeType.TEXT);
                    }
                    // TODO it'd be cool if we could get the keyboard to not go away
                    node.isFocused.set(true);
                } else {
                    // TODO toggle strikethrough
                }
            }
        }
        if (props.toolbarConfig.imageButton) {
            if (!props.toolbarConfig.uploadImage) {
                throw new Error('Toolbar config uploadImage() must be defined if image uploads are allowed!'); // could enforce via types?
            }
            if (!props.toolbarConfig.selectImage) {
                props.toolbarConfig.selectImage = async (node: State<EditorNodeDefinition> | null) => {
                    const res = await new Promise<Asset>((resolve, reject) => {
                        ImagePicker.launchImageLibrary({
                            mediaType: 'photo'
                        }, (response) => {
                            if (response.errorCode || response.didCancel) {
                                reject(response);
                            } else {
                                resolve(response.assets![0]);
                            }
                        });
                    });
                    const uploadedHTTPPath = await props.toolbarConfig!.uploadImage!(node, res);
                    const newImageNode = createImageNode(uploadedHTTPPath);
                    if (node && node.get()) {
                        // before: current node <-> next
                        // after: current node <-> new image <-> next
                        newImageNode.previous = node.get();
                        newImageNode.next = node.next.get();
                        node.next.set(newImageNode);
                    } else {
                        nodes.set((nodes) => {
                            nodes.push(newImageNode);
                            return nodes;
                        });
                    }
                }
            }
        }
    }

    // TODO OPTIMIZE (?) on value change of each node, call back to top with "onChange" method that contains converted result and recalculate props.value.
    useHookstateEffect(() => {
        let content = '';
        for (const node of nodes) {
            content += node.content.get();
        }
        // OPTIMIZATION - we only do this *after* creating the content as it's a less common scenario than just typing within limits
        if (props.maxLength && content.length > props.maxLength) {
            // recalculate content
            content = '';
            for (const node of nodes) {
                const nodeContent = node.content.get();
                // if adding this node would exceed the max length - add what we can and break.
                if (content.length + nodeContent.length > props.maxLength) {
                    const remainingLength = props.maxLength - content.length;
                    const nodeRaw = node.get();
                    const trimmed = getContentTrimmed(nodeRaw.type, nodeRaw.content, remainingLength);
                    if (trimmed) {
                        node.content.set(trimmed);
                        content += trimmed;
                    } else {
                        node.content.set(''); // TODO remove node? example: empty image node does not make sense
                    }
                    break;
                } else {
                    content += node.content.get();
                }
            }
        }
        props.onChangeText(content);
    }, [nodes]);

    function select(node?: State<EditorNodeDefinition> | null) {
        props.onFocus && props.onFocus();
        if (!node) {
            if (nodes.length === 0) {
                const newNode = createTextNode('');
                newNode.isFocused = true;
                nodes.set([newNode]);
            }
            return;
        }
        node.isFocused.set(true);
        if (lastSelectedNode !== null && lastSelectedNode.id.get() == node.id.get()) {
            lastSelectedNode.isFocused.set(false);
        }
        setLastSelectedNode(node);
    }

    function deselect(node: State<EditorNodeDefinition>) {
        if (node.isFocused.get()) {
            node.isFocused.set(false);
            props.onBlur && props.onBlur();
        }
    }

    // TODO create ids and use as key
    return <Pressable
        style={[styles.root, props.style]}
        onPress={() => select(nodes[0])}
    >
        {props.placeholder}
        {nodes.map((node) => {
            return <EditorNode key={node.id.get()} node={node} onBlur={() => deselect(node)} onFocus={() => select(node)}/>
        })}
        {props.toolbar && props.toolbarConfig && props.toolbar(props.toolbarConfig)}
    </Pressable>
}

const styles = StyleSheet.create({
    root: {}
})
