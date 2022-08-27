import {Pressable, StyleSheet, View, ViewStyle} from "react-native";
import {EditorNode, EditorNodeDefinition, EditorNodeType} from "./editor-node";
import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {ReactNode, useEffect} from "react";
import {createTextNode} from "./editor-node-text";
import {EditorToolbarConfig} from "./editor-toolbar";
import * as ImagePicker from 'react-native-image-picker';
import {Asset} from 'react-native-image-picker';
import {createImageNode} from "./editor-node-image";
import {deleteNode} from "./editor-node-transform";
import {createBoldNode, createStrikethroughNode, createUnderlineNode} from "./editor-nodes";

export interface EditorProps {
    /** This library takes an input of nodes, which can be generated from a string via editor-node-transformer. This is so the input format is flexible (markdown, html, etc). **/
    nodes: EditorNodeDefinition[]
    onChange: (nodes: State<EditorNodeDefinition[]>) => void
    placeholder?: ReactNode // so you can style it etc
    onBlur?: () => void
    onFocus?: () => void
    style?: ViewStyle
    maxLength?: number
    toolbarConfig?: EditorToolbarConfig
    // you can pass in the default toolbar or make your own, and call the config methods to add bold text etc.
    toolbar?: (config: EditorToolbarConfig) => ReactNode
}

export function Editor(props: EditorProps) {
    // TODO backspace on the start of an element should trigger "delete" on element before
    // TODO why does content move sometimes while typing?
    // TODO multiline (newline element)
    // TODO wysiwyg link button
    // TODO wysiwyg gif button
    // TODO image uploads work (weird runtime issue in library?)
    const nodes = useHookstate<EditorNodeDefinition[]>(props.nodes);

    useEffect(() => {
        // for example, if the consumer wants to clear everything.
        nodes.set(props.nodes);
    }, [props.nodes]);

    if (props.toolbarConfig) {
        if (!props.toolbarConfig.getCurrentNode) {
            // @ts-ignore - TODO better way to do this or useHookstate<EditorNodeDefinition | null>(null); ?
            props.toolbarConfig.getCurrentNode = () => {
                // TODO OPTIMIZE: we had a ton of problems with keeping track of the last selected node with storing references to a raw js object or State<>
                //  due to hookstatejs (or maybe not using it correctly). Maybe a React expert can help us :)
                //  UPDATE: Probably way to do it is editorState = { lastNode?: Node } - this way optionals are supported via usehookstate

                const hasBeenFocused = nodes.filter((node) => node.lastFocusTime);
                if (hasBeenFocused.length === 0) {
                    return null;
                }
                hasBeenFocused.sort((a, b) => {
                    return b.lastFocusTime.get()! - a.lastFocusTime.get()!;
                });
                return hasBeenFocused[0];
            }
        }

        function toggleElementType(node: State<EditorNodeDefinition> | null, type: EditorNodeType, createFn: (startingValue: string) => EditorNodeDefinition) {
            if (node && node.get()) {
                // TODO only bold selected content
                // TODO if none selected, add new node and set it as bold
                const nodeType = node.type.get();
                if (nodeType !== type) {
                    nodes.set((nodes) => {
                        // add a node after this one that is bold, and focus it.
                        const newNode = createFn('');
                        newNode.prev = node.get();
                        newNode.next = node.next.get();
                        newNode.isFocused = true; // TODO it'd be cool if we could get the keyboard to not go away
                        node.next.set(newNode);
                        node.isFocused.set(false);
                        const currentId = node.id.get();
                        const currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === currentId);
                        nodes.splice(currentIndex + 1, 0, newNode);
                        return nodes;
                    });
                } else if (nodeType === type) {
                    if (!node.content.get() && node.get().prev) {
                        console.log('node has no content, and has previous node, removing.', node.id.get());
                        const toFocus = node.prev;
                        deleteNode(nodes, node.id.get());
                        // prev is now the current node.
                        // toFocus.set((toFocus) => {
                        //     if (toFocus) {
                        //         toFocus.isFocused = true;
                        //     }
                        //     return toFocus;
                        // });
                        console.log('no content, removed node. new focused node: ', toFocus);
                    } else {
                        // we COULD toggle bold here, but it might be weird.
                    }
                }
            } else {
                // TODO toggle
            }
        }

        if (props.toolbarConfig.boldButton && !props.toolbarConfig.toggleBold) {
            props.toolbarConfig.toggleBold = (node: State<EditorNodeDefinition> | null) => {
                toggleElementType(node, EditorNodeType.TEXT_BOLD, createBoldNode);
            }
        }
        if (props.toolbarConfig.underlineButton && !props.toolbarConfig.toggleUnderline) {
            props.toolbarConfig.toggleUnderline = (node: State<EditorNodeDefinition> | null) => {
                toggleElementType(node, EditorNodeType.TEXT_UNDERLINE, createUnderlineNode);
            }
        }
        if (props.toolbarConfig.strikethroughButton && !props.toolbarConfig.toggleStrikethrough) {
            props.toolbarConfig.toggleStrikethrough = (node: State<EditorNodeDefinition> | null) => {
                toggleElementType(node, EditorNodeType.TEXT_STRIKETHROUGH, createStrikethroughNode);
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
                        newImageNode.prev = node.get();
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

    useHookstateEffect(() => {
        props.onChange(nodes);
    }, [nodes]);

    function select(node?: State<EditorNodeDefinition> | null) {
        console.log('trying to select', node ? node.isFocused.get() : null);
        try {
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
            node.lastFocusTime.set(Date.now());
        } catch (e) {
            console.error(e);
        }
    }

    function deselect(node: State<EditorNodeDefinition>) {
        console.log('deselecting', node.id.get());
        if (node.isFocused.get()) {
            node.isFocused.set(false);
            props.onBlur && props.onBlur();
        }
    }

    function doDelete(node: State<EditorNodeDefinition>) {
        console.log('deleting', node.id.get());
        const prevId = node.prev.get()?.id;
        deleteNode(nodes, node.id.get());
        if (prevId !== undefined && prevId !== null) {
            // TODO OPTIMIZE
            nodes.find((searchingNode) => searchingNode.id.get() === prevId)?.isFocused.set(true);
        }
    }

    return <View style={props.style}>
        <Pressable onPress={() => select(nodes[nodes.length - 1])} style={styles.inputArea}>
            {props.placeholder}
            {nodes.map((node) => {
                return <EditorNode key={node.id.get()} node={node} onBlur={() => deselect(node)} onFocus={() => select(node)} onDelete={() => doDelete(node)}/>
            })}
        </Pressable>
        {props.toolbar && props.toolbarConfig && props.toolbar(props.toolbarConfig)}
    </View>
}

const styles = StyleSheet.create({
    inputArea: {
        flex: 1,
        flexDirection: 'row',
        padding: 5
    }
})
