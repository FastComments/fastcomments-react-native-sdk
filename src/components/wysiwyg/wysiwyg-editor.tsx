import {Pressable, StyleSheet, TextStyle, View, ViewStyle} from "react-native";
import {EditorNode, EditorNodeDefinition, EditorNodeType} from "./editor-node";
import {none, State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {ReactNode, useRef} from "react";
import {createTextNode} from "./editor-node-text";
import {EditorToolbarConfig} from "./editor-toolbar";
import * as ImagePicker from 'react-native-image-picker';
import {Asset} from 'react-native-image-picker';
import {createImageNode} from "./editor-node-image";
import {deleteNode} from "./editor-node-transform";
import {createBoldNode, createEmoticonNode, createStrikethroughNode, createUnderlineNode} from "./editor-nodes";
import {EmoticonBarConfig} from "./emoticon-bar";
import {getNext, getStateNext, getStatePrev} from "./node-navigate";
import {createNewlineNode} from "./editor-node-newline";

export interface UpdateNodesObserver {
    updateNodes?: (nodes: EditorNodeDefinition[]) => void
}

export interface EditorProps {
    /** This library takes an input of nodes, which can be generated from a string via editor-node-transformer. This is so the input format is flexible (markdown, html, etc). **/
    nodes: EditorNodeDefinition[]
    updateNodesObserver?: UpdateNodesObserver
    isMultiLine?: boolean
    onChange: (nodes: State<EditorNodeDefinition[]>) => void
    placeholder?: ReactNode // so you can style it etc
    onBlur?: () => void
    onFocus?: () => void
    style?: ViewStyle
    textStyle?: TextStyle
    maxLength?: number
    toolbarConfig?: EditorToolbarConfig
    // you can pass in the default toolbar or make your own, and call the config methods to add bold text etc.
    toolbar?: (config: EditorToolbarConfig) => ReactNode
    emoticonBar?: (config: EmoticonBarConfig) => ReactNode
    emoticonBarConfig?: EmoticonBarConfig
}

interface EditorRow {
    key: string
    items: State<EditorNodeDefinition>[]
}

export function Editor(props: EditorProps) {
    // TODO wysiwyg link button
    // TODO wysiwyg gif button
    // TODO image uploads work (weird runtime issue in library?)
    const nodes = useHookstate<EditorNodeDefinition[]>(props.nodes);
    const editorRowsRef = useRef<EditorRow[]>([]);

    if (props.updateNodesObserver) {
        props.updateNodesObserver.updateNodes = (newNodes) => {
            console.log('setting new nodes to', newNodes);
            nodes.set(newNodes)
        };
    }

    useHookstateEffect(() => {
        props.onChange(nodes);
        let row: EditorRow = {key: '', items: []};
        let editorRows: EditorRow[] = [];
        for (const node of nodes) {
            if (!node || node === none || node.get() === none) { // WHICH ONE IS IT GOD
                continue;
            }
            if (node.type.get() === EditorNodeType.NEWLINE) {
                if (row.items.length > 0) {
                    editorRows.push(row);
                }
                row = {
                    key: node.id.get() + '',
                    items: [] // OPTIMIZATION: we don't want to actually render the newline node. We'll do this implicitly by creating a new row container.
                };
                editorRows.push(row);
                row = {
                    key: '',
                    items: []
                };
            } else {
                row.key += node.id.get();
                row.items.push(node);
            }
        }
        if (row.items.length > 0) {
            editorRows.push(row);
        }
        editorRowsRef.current = editorRows;
    }, [nodes]);

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
                if (!currentNode.content.get()) {
                    currentNode.set(createEmoticonNode(src));
                    // now add in a text node after the emoticon so we can keep typing (also so we can backspace the emoticon)
                    const newNode = createTextNode('');
                    newNode.isFocused = true;
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
                            newTextNode.isFocused = true;
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
                    if (!rawNode.content) {
                        const prev = getStatePrev(nodes, rawNode.id);
                        if (prev?.get()) {
                            console.log('node has no content, and has previous node. (removing, focusing)', rawNode.id, prev.id.get());
                            deleteNode(nodes, rawNode.id);
                            // prev is now the current node.
                            select(prev);
                        }
                    } else {
                        // we COULD toggle here, but it might be weird.
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
                console.log('FOCUSING IMAGE');
                // if we're selecting an image, is there a node in front of it? then select that
                // otherwise, we should create a node in front of the image and select it.
                const next = getStateNext(nodes, node.id.get());
                if (next && next.get({stealth: true})) {
                    select(next);
                } else {
                    const newTextNode = createTextNode('');
                    nodes.merge([newTextNode]);
                    select(nodes[nodes.length - 1]);
                }
            } else {
                console.log('FOCUSING OTHER', node.isFocused.get());
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
    function doDelete(node: State<EditorNodeDefinition>, skipNextCheck?: boolean, skipFocus?: boolean) {
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
        console.log(`Deleting id=[${rawNode.id}] type=[${rawNode.type}] content=[${rawNode.content}]`);
        if (nodes.length === 1) { // TODO does this work with set(none)?
            // if this last node is an image, or text like @person, replace it with a text root node, otherwise skip.
            if (ImageTypes.includes(nodes[0].type.get()) || node.content) {
                // replace the node in-place
                console.log('Doing in-place replacement of node for delete.');
                const replacement = createTextNode('');
                replacement.isFocused = true;
                replacement.deleteOnBackspace = false; // TODO WHY IS .set() NOT REPLACING OBJECT????
                nodes[0].set(replacement);
            } else {
                console.log('Skipping delete - is last node.', rawNode.id);
            }
            return; // don't delete the last node. kind of surprising API, but simple.
        }
        // if this is not an image, and the node before this is an emoticon/image, and the current node is not an image node, delete the emoticon/image too.
        // maybe in an ideal object-oriented world you could broadcast "delete" to node.prev, but we can't serialize objects with methods with our state mechanism (yet).
        // It's also nice to encapsulate the delete logic in the "delete" code rather than in every object, so far.
        const prev = getStatePrev(nodes, rawNode.id);
        const emoticonOrNewLineNodeBeforeText = !skipNextCheck
        && prev
        && !ImageTypes.includes(rawNode.type)
        && (prev.type.get() === EditorNodeType.NEWLINE || ImageTypes.includes(prev.type.get()))
            ? prev
            : null;

        if (emoticonOrNewLineNodeBeforeText) {
            console.log(`Will delete next: id=[${emoticonOrNewLineNodeBeforeText.id}] type=[${emoticonOrNewLineNodeBeforeText.type}] content=[${emoticonOrNewLineNodeBeforeText.content}]`);
        } else {
            console.log('Nothing to delete next.');
        }
        // if we're backspacing on an emoticon, leave the current text field intact and delete the image node before this one
        // this way the keyboard does not lose focus resulting in flashing. The keyboard never loses focus on the element we said to delete, but
        // we actually delete the content the user sees (the image before).
        if (emoticonOrNewLineNodeBeforeText) {
            doDelete(emoticonOrNewLineNodeBeforeText, true, true);
        } else {
            const prevId = prev?.id.get();
            deleteNode(nodes, rawNode.id);
            if (prevId !== undefined && prevId !== null && !skipFocus) {
                select(nodes.find((searchingNode) => searchingNode.id.get() === prevId));
            }
        }
    }

    function onTryNewline(node: State<EditorNodeDefinition>) {
        if (props.isMultiLine) {
            console.log('Trying to create a new line.', node.id.get());
            // add a newline node
            // add a text node
            // focus new text node

            // TODO add newline after current node
            nodes.set((nodes) => {
                // add a node after this one that is bold, and focus it.
                const newNewLineNode = createNewlineNode()
                node.isFocused.set(false);
                const currentId = node.id.get();
                let currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === currentId);
                nodes.splice(currentIndex + 1, 0, newNewLineNode);
                const newTextNode = createTextNode('');
                newTextNode.isFocused = true;
                currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === newNewLineNode.id);
                nodes.splice(currentIndex + 1, 0, newTextNode);
                return nodes;
            });
        } else {
            console.log('Ignoring new line request.', node.id.get());
        }
    }

    return <View style={props.style}>
        <Pressable onPress={() => select(nodes[nodes.length - 1])} style={styles.inputArea}>
            {props.placeholder}
            {editorRowsRef.current.map((row) => {
                return <View style={styles.editorRow} key={row.key}>
                    {/* Node can get set to "none" before the list is re-generated, so the id check is a fast way to eliminate those. */}
                    {row.items.map((node) => node && node.id !== undefined && <EditorNode
                        key={node.id.get()}
                        node={node}
                        textStyle={props.textStyle}
                        onBlur={() => deselect(node)}
                        onFocus={() => select(node)}
                        onDelete={() => doDelete(node)}
                        onTryNewline={() => onTryNewline(node)}
                        isMultiLine={props.isMultiLine}
                    />)}
                </View>
            })}
        </Pressable>
        {props.emoticonBar && props.emoticonBarConfig && props.emoticonBar(props.emoticonBarConfig)}
        {props.toolbar && props.toolbarConfig && props.toolbar(props.toolbarConfig)}
    </View>
}

const styles = StyleSheet.create({
    inputArea: {
        flexDirection: 'column',
        padding: 5
    },
    editorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap'
    }
})
