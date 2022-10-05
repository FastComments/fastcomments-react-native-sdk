import {Pressable, StyleSheet, TextStyle, View, ViewStyle} from "react-native";
import {EditorNode} from "./editor-node";
import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {ReactNode} from "react";
import {EditorToolbarConfig} from "./editor-toolbar";
import {deleteNodeState} from "./editor-node-transform";
import {createBoldNode, createEmoticonNode, createStrikethroughNode, createUnderlineNode} from "./editor-nodes";
import {EmoticonBarConfig} from "./emoticon-bar";
import {
    getLastFocusedState,
    getNext,
    getStateById,
    getStateLast,
    getStateNext,
    getStatePrev,
} from "./node-navigate";
import {insertAfter} from "./node-insert";
import {deleteNodeRetainFocus} from "./node-delete";
import {focusNode, focusNodeState} from "./node-focus";
import {createImageNode, createNewlineNode, createTextNode} from "./node-create";
import {EditorNodeWithoutChildren, EditorNodeNewLine, EditorNodeImageTypes, EditorNodeNames, EditorNodeType} from "./node-types";

export interface UpdateNodesObserver {
    updateNodes?: (tree: EditorNodeNewLine[]) => void
}

export interface EditorProps {
    /**
     * This library takes an input of nodes, which can be generated from a string via editor-node-transformer. This is so the input format is flexible (markdown, html, etc).
     **/
    graph: EditorNodeNewLine[]
    updateNodesObserver?: UpdateNodesObserver
    isMultiLine?: boolean
    onChange: (nodes: State<EditorNodeNewLine[]>) => void
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

export function Editor(props: EditorProps) {
    // TODO wysiwyg gif button
    const graph = useHookstate<EditorNodeNewLine[]>(props.graph);

    if (props.updateNodesObserver) {
        props.updateNodesObserver.updateNodes = (newNodes) => {
            console.log('setting new nodes to', newNodes);
            graph.set(newNodes)
        };
    }

    useHookstateEffect(() => {
        props.onChange(graph);
        // TODO uncomment in production
        console.log('===== BEGIN EDITOR NODE STRUCTURE =====');
        const graphRaw = graph.get({stealth: true});
        for (const node of graphRaw) {
            console.log(EditorNodeNames[node.type], `(${node.id})`);
            const children = node.children;
            if (children) {
                for (const child of children) {
                    console.log('    ', EditorNodeNames[child.type], `(${child.id})`);
                }
            }
        }
        console.log('===== END EDITOR NODE STRUCTURE =====');
    }, [graph]);

    // uncomment to test keyboard losing focus.
    // useEffect(() => {
    //     let timeout = setTimeout(() => {
    //         nodes.set((_nodes) => {
    //             return [
    //                 createTextNode('123'),
    //                 createBoldNode('abc')
    //             ]
    //         });
    //         focusNodeState(nodes[1]);
    //         timeout = setTimeout(() => {
    //             // nodes[1].content.set(nodes[0].content.get() + nodes[1].content.get());
    //             nodes.set((nodes) => {
    //                 nodes.splice(0, 1);
    //                 return nodes;
    //             });
    //             nodes[0].type.set(EditorNodeType.TEXT);
    //             focusNodeState(nodes[0]);
    //         }, 7000);
    //     }, 3000);
    //     return () => clearTimeout(timeout);
    // }, []);

    const getCurrentNode = () => {
        return getLastFocusedState(graph);
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
                    graph.set((graph) => {
                        insertAfter(graph, currentNode.id.get(), newNode);
                        return graph;
                    });
                } else {
                    graph.set((graph) => {
                        // add a node after the current one
                        const newImageNode = createEmoticonNode(src);
                        currentNode.isFocused.set(false);
                        insertAfter(graph, currentNode.id.get(), newImageNode);
                        if (!getNext(graph, newImageNode.id)) {
                            const newTextNode = createTextNode('');
                            focusNode(newTextNode);
                            // now add in a text node after the emoticon so we can keep typing (also so we can backspace the emoticon)
                            insertAfter(graph, newImageNode.id, newTextNode);
                        }

                        return graph;
                    });
                }
            }
        }
    }

    if (props.toolbarConfig) {
        if (!props.toolbarConfig.getCurrentNode) {
            props.toolbarConfig.getCurrentNode = getCurrentNode;
        }

        function toggleElementType(node: State<EditorNodeWithoutChildren> | null, type: EditorNodeType, createFn: (startingValue: string) => EditorNodeWithoutChildren) {
            if (node && node.get()) {
                // TODO only bold selected content
                // TODO if none selected, add new node and set it as bold
                const nodeType = node.type.get();
                if (nodeType !== type) {
                    graph.set((nodes) => {
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
                        const prev = getStatePrev(graph, rawNode.id);
                        if (prev?.get()) {
                            console.log('node has no content, and has previous node. (removing, focusing)', rawNode.id, prev.id.get());
                            deleteNodeState(graph, rawNode.id);
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
            props.toolbarConfig.toggleBold = (node: State<EditorNodeWithoutChildren> | null) => {
                toggleElementType(node, EditorNodeType.TEXT_BOLD, createBoldNode);
            }
        }
        if (props.toolbarConfig.underlineButton && !props.toolbarConfig.toggleUnderline) {
            props.toolbarConfig.toggleUnderline = (node: State<EditorNodeWithoutChildren> | null) => {
                toggleElementType(node, EditorNodeType.TEXT_UNDERLINE, createUnderlineNode);
            }
        }
        if (props.toolbarConfig.strikethroughButton && !props.toolbarConfig.toggleStrikethrough) {
            props.toolbarConfig.toggleStrikethrough = (node: State<EditorNodeWithoutChildren> | null) => {
                toggleElementType(node, EditorNodeType.TEXT_STRIKETHROUGH, createStrikethroughNode);
            }
        }
        if (props.toolbarConfig.imageButton) {
            if (!props.toolbarConfig.uploadImage) {
                throw new Error('Toolbar config uploadImage() must be defined if image uploads are allowed!'); // could enforce via types?
            }
            if (!props.toolbarConfig.selectAndInsertImageAfterCurrentNode) {
                props.toolbarConfig.selectAndInsertImageAfterCurrentNode = async (node: State<EditorNodeWithoutChildren>) => {
                    const pickedPath = await props.toolbarConfig!.getImagePathToInsert!();
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
                    if (!node || !node.get()) {
                        node = getStateLast(graph);
                    }

                    // before: root -> text node A (selected)
                    // after: root -> text node A (not selected) -> newline node -> image -> newline node -> text node B (now selected)
                    const newSelectedTextNode = createTextNode('');
                    const imageNewLine = createNewlineNode();
                    imageNewLine.children = [newImageNode];

                    const textNewLine = createNewlineNode();
                    textNewLine.children = [newSelectedTextNode];

                    graph.set((nodes) => {
                        insertAfter(nodes, node.id.get(), imageNewLine);
                        insertAfter(nodes, imageNewLine.id, textNewLine);
                        return nodes;
                    });
                    focusNode(newSelectedTextNode);
                }
            }
        }
        if (props.toolbarConfig.gifPickerButton) {
            if (!props.toolbarConfig.getGIFPathToInsert) {
                throw new Error('Toolbar config getGIFPathToInsert() must be defined if gif uploads are allowed!'); // could enforce via types?
            }
            if (!props.toolbarConfig.selectAndInsertGIFAfterCurrentNode) {
                props.toolbarConfig.selectAndInsertGIFAfterCurrentNode = async (node: State<EditorNodeWithoutChildren>) => {
                    const publicGifPath = await props.toolbarConfig!.getGIFPathToInsert!();
                    if (!publicGifPath) {
                        return;
                    }
                    const newImageNode = createImageNode(publicGifPath);
                    if (!node || !node.get()) {
                        node = getStateLast(graph);
                    }

                    // before: root -> text node A (selected)
                    // after: root -> text node A (not selected) -> newline node -> image -> newline node -> text node B (now selected)
                    const newSelectedTextNode = createTextNode('');
                    const imageNewLine = createNewlineNode();
                    imageNewLine.children = [newImageNode];

                    const textNewLine = createNewlineNode();
                    textNewLine.children = [newSelectedTextNode];

                    graph.set((nodes) => {
                        insertAfter(nodes, node.id.get(), imageNewLine);
                        insertAfter(nodes, imageNewLine.id, textNewLine);
                        return nodes;
                    });
                    focusNode(newSelectedTextNode);
                }
            }
        }
    }

    function select(node: State<EditorNodeWithoutChildren>) {
        try {
            props.onFocus && props.onFocus();
            if (EditorNodeImageTypes.includes(node.type.get())) {
                console.log('FOCUSING IMAGE');
                // if we're selecting an image, is there a node in front of it? then select that
                const next = getStateNext(graph, node.id.get());
                if (next && next.get({stealth: true})) {
                    select(next);
                } else {
                    // otherwise, we should create a node in front of the image and select it.
                    const newTextNode = createTextNode('');
                    graph.set((graph) => {
                        insertAfter(graph, node.id.get(), newTextNode);
                        return graph;
                    })
                    focusNode(newTextNode);
                }
            } else {
                console.log('FOCUSING OTHER', node.id.get(), EditorNodeNames[node.type.get()], node.isFocused.get());
                focusNodeState(node);
            }
        } catch (e) {
            console.error(e);
        }
    }

    function deselect(node: State<EditorNodeWithoutChildren>) {
        console.log('deselecting', node.id.get());
        if (node.isFocused.get()) {
            node.isFocused.set(false);
            props.onBlur && props.onBlur();
        }
    }

    // taking a State<Node> here caused a ton of confusion, so now we just take a regular JS object.
    function doDelete(node: State<EditorNodeWithoutChildren>, focusNodeState: State<EditorNodeWithoutChildren>) {
        if (!node || typeof node !== 'object') {
            console.error('Tried to delete empty node!', typeof node);
            return;
        }
        const rawNode = node.get({noproxy: true, stealth: true});
        if (!rawNode || typeof rawNode !== 'object') {
            console.error('Tried to delete empty node!', typeof node);
            return;
        }

        graph.set((nodes) => {
            const deleteNode = node.get({noproxy: true, stealth: true});
            const focusNode = focusNodeState.get({noproxy: true, stealth: true});
            deleteNodeRetainFocus(nodes, deleteNode, focusNode);
            return nodes;
        });
    }

    function onTryNewline(node: State<EditorNodeWithoutChildren>) {
        if (props.isMultiLine) {
            console.log('Trying to create a new line.', node.id.get());
            // add a newline node
            // add a text node
            // focus new text node

            graph.set((nodes) => {
                node.isFocused.set(false); // we don't focus this node anymore

                // add a node after this one that is bold, and focus it.
                const newNewlineNode = createNewlineNode();
                const newTextNode = createTextNode('');
                newNewlineNode.children = [newTextNode];
                focusNode(newTextNode);
                insertAfter(nodes, node.id.get(), newNewlineNode);

                return nodes;
            });
        } else {
            console.log('Ignoring new line request.', node.id.get());
        }
    }

    function updateNodeContent(node: State<EditorNodeWithoutChildren>, content: string) {
        if (node) {
            node.content.set(content);
        }
        // console.log('updateNodeContent', id, node!.content.get(), '->', content);
    }

    return <View style={props.style}>
        <Pressable onPress={() => select(getStateLast(graph))} style={styles.inputArea}>
            {props.placeholder}
            {graph.map((node) => node && node.id !== undefined && <View style={styles.editorRow} key={node.id.get()}>
                    {/* Node can get set to "none" before the list is re-generated, so the id check is a fast way to eliminate those. */}
                    {node.children && (node.children as State<EditorNodeWithoutChildren[]>).map((node) => node && node.id !== undefined &&
                        <EditorNode
                            key={node.id.get()}
                            nodeState={node}
                            textStyle={props.textStyle}
                            onBlur={() => deselect(getStateById(graph, node.id.get())!)}
                            onChangeContent={(newContent) => updateNodeContent(node, newContent)}
                            onFocus={() => select(getStateById(graph, node.id.get())!)}
                            doDelete={() => doDelete(getStateById(graph, node.id.get())!, node)}
                            doDeleteNodeBefore={() => {
                                const nodeBefore = getStatePrev(graph, node.id.get());
                                if (nodeBefore) {
                                    doDelete(nodeBefore, node)
                                }
                            }}
                            onTryNewline={() => onTryNewline(getStateById(graph, node.id.get())!)}
                            isMultiLine={props.isMultiLine}
                        />)}
                </View>
            )}
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
