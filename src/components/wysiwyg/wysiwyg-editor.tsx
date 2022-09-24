import {Pressable, StyleSheet, TextStyle, View, ViewStyle} from "react-native";
import {EditorNode} from "./editor-node";
import {none, State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {ReactNode, useRef} from "react";
import {EditorToolbarConfig} from "./editor-toolbar";
import {deleteNodeState} from "./editor-node-transform";
import {createBoldNode, createEmoticonNode, createStrikethroughNode, createUnderlineNode} from "./editor-nodes";
import {EmoticonBarConfig} from "./emoticon-bar";
import {getNext, getStateNext, getStatePrev} from "./node-navigate";
import {insertAfter, insertChainAfter} from "./node-insert";
import {deleteNodeRetainFocus} from "./node-delete";
import {focusNode, focusNodeState} from "./node-focus";
import {createImageNode, createNewlineNode, createTextNode} from "./node-create";
import {EditorNodeDefinition, EditorNodeImageTypes, EditorNodeNames, EditorNodeType} from "./node-types";

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
    // TODO wysiwyg gif button
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
        // TODO uncomment in production
        console.log('===== BEGIN EDITOR NODE STRUCTURE =====');
        for (const node of nodes) {
            console.log(EditorNodeNames[node.type.get()], `(${node.id.get()})`);
        }
        console.log('===== END EDITOR NODE STRUCTURE =====');
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
                    focusNode(newNode);
                    nodes.merge([newNode]);
                } else {
                    nodes.set((nodes) => {
                        // add a node after the current one
                        const newImageNode = createEmoticonNode(src);
                        currentNode.isFocused.set(false);
                        insertAfter(nodes, currentNode.id.get(), newImageNode);
                        if (!getNext(nodes, newImageNode.id)) {
                            const newTextNode = createTextNode('');
                            focusNode(newTextNode);
                            // now add in a text node after the emoticon so we can keep typing (also so we can backspace the emoticon)
                            insertAfter(nodes, newImageNode.id, newTextNode);
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
                        focusNode(newNode);
                        node.isFocused.set(false);
                        insertAfter(nodes, node.id.get(), newNode);
                        return nodes;
                    });
                } else if (nodeType === type) {
                    const rawNode = node.get();
                    if (!rawNode.content) {
                        const prev = getStatePrev(nodes, rawNode.id);
                        if (prev?.get()) {
                            console.log('node has no content, and has previous node. (removing, focusing)', rawNode.id, prev.id.get());
                            deleteNodeState(nodes, rawNode.id);
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
                    const pickedPath = await props.toolbarConfig!.pickImage!();
                    let finalPath;
                    if (!pickedPath) {
                        return;
                    }
                    if (typeof pickedPath === 'string' && pickedPath.startsWith('http')) {
                        finalPath = pickedPath;
                    } else if (typeof pickedPath === 'object') {
                        finalPath = await props.toolbarConfig!.uploadImage!(node, pickedPath);
                    }
                    if (!finalPath) {
                        return;
                    }
                    const newImageNode = createImageNode(finalPath);
                    if (node && node.get()) {
                        // before: root -> text node A (selected)
                        // after: root -> text node A (not selected) -> newline node -> image -> newline node -> text node B (now selected)
                        nodes.set((nodes) => {
                            const newSelectedTextNode = createTextNode('');
                            focusNode(newSelectedTextNode);

                            insertChainAfter(nodes, node.id.get(), [
                                createNewlineNode(),
                                newImageNode,
                                createNewlineNode(),
                                newSelectedTextNode
                            ]);

                            return nodes;
                        });
                        select(nodes[nodes.length - 1]);
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
                    focusNode(newNode);
                    nodes.set([newNode]);
                } else {
                    select(nodes[nodes.length - 1]);
                }
                return;
            } else if (EditorNodeImageTypes.includes(node.type.get())) {
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
                focusNodeState(node);
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

    // taking a State<Node> here caused a ton of confusion, so now we just take a regular JS object.
    function doDelete(node: State<EditorNodeDefinition>) {
        if (!node || typeof node !== 'object') {
            console.error('Tried to delete empty node!', typeof node);
            return;
        }
        const rawNode = node.get({noproxy: true, stealth: true});
        if (!rawNode || typeof rawNode !== 'object') {
            console.error('Tried to delete empty node!', typeof node);
            return;
        }

        nodes.set((nodes) => {
            deleteNodeRetainFocus(nodes, node.get({noproxy: true, stealth: true}));
            return nodes;
        });
    }

    function onTryNewline(node: State<EditorNodeDefinition>) {
        if (props.isMultiLine) {
            console.log('Trying to create a new line.', node.id.get());
            // add a newline node
            // add a text node
            // focus new text node

            nodes.set((nodes) => {
                node.isFocused.set(false); // we don't focus this node anymore

                // add a node after this one that is bold, and focus it.
                const newNewlineNode = createNewlineNode();
                const newTextNode = createTextNode('');
                focusNode(newTextNode);
                insertChainAfter(nodes, node.id.get(), [
                    newNewlineNode,
                    newTextNode,
                ]);

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
