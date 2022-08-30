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
import {createBoldNode, createEmoticonNode, createStrikethroughNode, createUnderlineNode} from "./editor-nodes";
import {EmoticonBarConfig} from "./emoticon-bar";
import {getNext, getStateNext, getStatePrev} from "./node-navigate";

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
    emoticonBar?: (config: EmoticonBarConfig) => ReactNode
    emoticonBarConfig?: EmoticonBarConfig
}

export function Editor(props: EditorProps) {
    // TODO multiline (newline element)
    // TODO wysiwyg link button
    // TODO wysiwyg gif button
    // TODO image uploads work (weird runtime issue in library?)
    const nodes = useHookstate<EditorNodeDefinition[]>(props.nodes);

    useEffect(() => {
        // for example, if the consumer wants to clear everything.
        nodes.set(props.nodes);
    }, [props.nodes]);

    const getCurrentNode = () => {
        // TODO OPTIMIZE: we had a ton of problems with keeping track of the last selected node with storing references to a raw js object or State<>
        //  due to hookstatejs (or maybe not using it correctly). Maybe a React expert can help us :)
        //  UPDATE: Probably way to do it is editorState = { lastNode?: Node } - this way optionals are supported via usehookstate

        const hasBeenFocused = nodes.filter((node) => node.lastFocusTime);
        if (hasBeenFocused.length === 0) {
            return nodes[0]; // we ALWAYS have a root node
        }
        hasBeenFocused.sort((a, b) => {
            return b.lastFocusTime.get()! - a.lastFocusTime.get()!;
        });
        return hasBeenFocused[0] as State<EditorNodeDefinition>;
    }

    if (props.emoticonBarConfig) {
        if (!props.emoticonBarConfig.getCurrentNode) {
            props.emoticonBarConfig.getCurrentNode = getCurrentNode;
        }
        if (!props.emoticonBarConfig.addEmoticon) {
            // @ts-ignore - TODO better way to do this or useHookstate<EditorNodeDefinition | null>(null); ?
            props.emoticonBarConfig.addEmoticon = (currentNode, src) => {
                // if current node is an empty node, just replace it.
                if (!currentNode.content) {
                    currentNode.set(createEmoticonNode(src));
                    // now add in a text node after the emoticon so we can keep typing (also so we can backspace the emoticon)
                    const newNode = createTextNode('');
                    nodes.merge([newNode]);
                } else {
                    nodes.set((nodes) => {
                        // add a node after the current one
                        const newImageNode = createEmoticonNode(src);
                        currentNode.isFocused.set(false);
                        const currentId = currentNode.id.get();
                        const currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === currentId);
                        nodes.splice(currentIndex + 1, 0, newImageNode);
                        if (!getNext(nodes, newImageNode.id)) {
                            const newTextNode = createTextNode('');
                            // now add in a text node after the emoticon so we can keep typing (also so we can backspace the emoticon)
                            const currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === newImageNode.id);
                            nodes.splice(currentIndex + 1, 0, newTextNode);
                        }

                        return nodes;
                    });
                }
            }
        }
    }

    if (props.toolbarConfig) {
        if (!props.toolbarConfig.getCurrentNode) {
            props.toolbarConfig.getCurrentNode = getCurrentNode;
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
                        newNode.isFocused = true; // TODO it'd be cool if we could get the keyboard to not go away
                        node.isFocused.set(false);
                        const currentId = node.id.get();
                        const currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === currentId);
                        nodes.splice(currentIndex + 1, 0, newNode);
                        return nodes;
                    });
                } else if (nodeType === type) {
                    const rawNode = node.get();
                    if (!rawNode.content && getStatePrev(nodes, rawNode.id)) {
                        console.log('node has no content, and has previous node, removing.', rawNode.id);
                        // const toFocus = rawNode.prev;
                        deleteNode(nodes, rawNode.id);
                        // prev is now the current node.
                        // toFocus.set((toFocus) => {
                        //     if (toFocus) {
                        //         toFocus.isFocused = true;
                        //     }
                        //     return toFocus;
                        // });
                        // console.log('no content, removed node. new focused node: ', toFocus);
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
                props.toolbarConfig.selectImage = async (node: State<EditorNodeDefinition>) => {
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
                        // TODO insert after current node
                        // newImageNode.prev = node.get();
                        // newImageNode.next = node.next.get();
                        // node.next.set(newImageNode);
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
        try {
            props.onFocus && props.onFocus();
            if (!node || !node.get({stealth: true})) {
                if (nodes.length === 0) {
                    const newNode = createTextNode('');
                    newNode.isFocused = true;
                    nodes.set([newNode]);
                } else {
                    select(nodes[nodes.length - 1]);
                }
                return;
            } else if (ImageTypes.includes(node.type.get())) {
                // if we're selecting an image, is there a node in front of it? then select that
                // otherwise, we should create a node in front of the image and select it.
                const next = getStateNext(nodes, node.id.get());
                if (next) {
                    select(next);
                } else {
                    const newTextNode = createTextNode('');
                    nodes.merge([newTextNode]);
                    select(nodes[nodes.length - 1]);
                }
            } else {
                node.isFocused.set(true);
                node.lastFocusTime.set(Date.now());
            }
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

    const ImageTypes = [EditorNodeType.EMOTICON, EditorNodeType.IMAGE];

    // taking a State<Node> here caused a ton of confusion, so now we just take a regular JS object.
    function doDelete(node: State<EditorNodeDefinition>, skipNextCheck?: boolean) {
        console.log('DO DELETE', !!node)
        if (!node || typeof node !== 'object') {
            console.error('Tried to delete empty node!', typeof node);
            return;
        }
        const rawNode = node.get({noproxy: true, stealth: true});
        if (!rawNode || typeof rawNode !== 'object') {
            console.error('Tried to delete empty node!', typeof node);
            return;
        }
        // try {
        //     node = JSON.parse(JSON.stringify(node));
        //     console.log(node);
        // } catch (e) {
        //     console.error(e);
        // }
        console.log('??? a')
        console.log(`Deleting id=[${rawNode.id}] type=[${rawNode.type}] content=[${rawNode.content}]`);
        console.log('??? b')
        if (nodes.length === 1) { // TODO does this work with set(none)?
            // if this last node is an image, replace it with a text root node, otherwise skip.
            if (ImageTypes.includes(nodes[0].type.get())) {
                // replace the node in-place
                console.log('Doing in-place replacement of node for delete.');
                nodes[0].set(createTextNode(''));
            } else {
                console.log('Skipping delete - is last node.', rawNode.id);
            }
            return; // don't delete the last node. kind of surprising API, but simple.
        }
        // if this is not an image, and the node before this is an emoticon/image, and the current node is not an image node, delete the emoticon/image too.
        // maybe in an ideal object-oriented world you could broadcast "delete" to node.prev, but we can't serialize objects with methods with our state mechanism (yet).
        // It's also nice to encapsulate the delete logic in the "delete" code rather than in every object, so far.
        const prev = getStatePrev(nodes, rawNode.id)
        const emoticonNodeBeforeText = !skipNextCheck && prev && !ImageTypes.includes(rawNode.type) && ImageTypes.includes(prev.type.get()) ? prev : null;
        if (emoticonNodeBeforeText) {
            console.log(`Will delete next: id=[${emoticonNodeBeforeText.id}] type=[${emoticonNodeBeforeText.type}] content=[${emoticonNodeBeforeText.content}]`);
        } else {
            console.log('Nothing to delete next.');
        }
        const prevId = prev?.id.get();
        deleteNode(nodes, rawNode.id);
        if (emoticonNodeBeforeText) {
            doDelete(emoticonNodeBeforeText, true);
        } else if (prevId !== undefined && prevId !== null) {
            // TODO OPTIMIZE
            nodes.find((searchingNode) => searchingNode.id.get() === prevId)?.isFocused.set(true);
        }
    }

    return <View style={props.style}>
        <Pressable onPress={() => select(nodes[nodes.length - 1])} style={styles.inputArea}>
            {props.placeholder}
            {nodes.map((node) => {
                return <EditorNode key={node.id.get()} node={node} onBlur={() => deselect(node)} onFocus={() => select(node)}
                                   onDelete={() => doDelete(node)}/>
            })}
        </Pressable>
        {props.emoticonBar && props.emoticonBarConfig && props.emoticonBar(props.emoticonBarConfig)}
        {props.toolbar && props.toolbarConfig && props.toolbar(props.toolbarConfig)}
    </View>
}

const styles = StyleSheet.create({
    inputArea: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 5
    }
})
