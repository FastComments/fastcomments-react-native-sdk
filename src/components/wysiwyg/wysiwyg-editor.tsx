import {Pressable, StyleSheet, TextStyle, View, ViewStyle} from "react-native";
import {EditorNode, EditorNodeProps} from "./editor-node";
import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import React, {ReactNode, useRef} from "react";
import {EditorToolbarConfig} from "./editor-toolbar";
import {deleteNodeState} from "./editor-node-transform";
import {createBoldNode, createEmoticonNode, createStrikethroughNode, createUnderlineNode} from "./editor-nodes";
import {EmoticonBarConfig} from "./emoticon-bar";
import {getNext, getStateById, getStateLast, getStateNext, getStatePrev, graphToListStateWithNewlines} from "./node-navigate";
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

const EditorNodeMemo = React.memo<EditorNodeProps>(
    props => EditorNode(props),
    (prevProps, nextProps) => {
        if (prevProps.node.id !== nextProps.node.id) {
            // console.log('node changed - id')
            return false;
        }
        if (prevProps.node.content !== nextProps.node.content) {
            // console.log('node changed - content', prevProps.node.content, '->', nextProps.node.content)
            return false;
        }
        if (prevProps.node.isFocused !== nextProps.node.isFocused) {
            // console.log('node changed - isFocused')
            return false;
        }
        if (prevProps.node.lastFocusTime !== nextProps.node.lastFocusTime) {
            // console.log('node changed - lastFocusTime')
            return false;
        }
        if (prevProps.node.type !== nextProps.node.type) {
            // console.log('node changed - type')
            return false;
        }

        return true;
    }
);

export function Editor(props: EditorProps) {
    // TODO wysiwyg gif button
    const graph = useHookstate<EditorNodeNewLine[]>(props.graph);
    const nodeMapRef = useRef<Record<string, State<EditorNodeNewLine> | State<EditorNodeWithoutChildren>>>({});

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
        const nodeMap: Record<string, State<EditorNodeNewLine> | State<EditorNodeWithoutChildren>> = {};
        for (const node of graph) {
            console.log(EditorNodeNames[node.type.get()], `(${node.id.get()})`);
            nodeMap[node.id.get()] = node;
            const children = node.children;
            if (children) {
                // we only support one level of nesting.
                // @ts-ignore
                children.forEach(function (child: State<EditorNodeWithoutChildren>) {
                    console.log('    ', EditorNodeNames[child.type.get()], `(${child.id.get()})`);
                    nodeMap[child.id.get()] = child;
                });
            }
        }
        console.log('===== END EDITOR NODE STRUCTURE =====');
        nodeMapRef.current = nodeMap; // it would be cool to get rid of the map (requires node to not use React.memo and modify node.content itself)
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
        // TODO OPTIMIZE: we had a ton of problems with keeping track of the last selected node with storing references to a raw js object or State<>
        //  due to hookstatejs (or maybe not using it correctly). Maybe a React expert can help us :)
        //  UPDATE: Probably way to do it is editorState = { lastNode?: Node } - this way optionals are supported via usehookstate

        const hasBeenFocused = graphToListStateWithNewlines(graph).filter((node) => 'lastFocusTime' in node && node.lastFocusTime.get()) as State<EditorNodeWithoutChildren>[];
        if (hasBeenFocused.length === 0) {
            // it really feels like we are using the library wrong if we have to cast like this?
            const children = graph[0].children as unknown as State<EditorNodeWithoutChildren>[]; // we ALWAYS have a root node
            if (children && children.length > 0) {
                return children[0];
            } else {
                throw new Error('Could not determine current node!!!'); // if this happens it's a bug.
            }
        }
        hasBeenFocused.sort((a, b) => {
            return b.lastFocusTime.get()! - a.lastFocusTime.get()!;
        });
        return hasBeenFocused[0] as State<EditorNodeWithoutChildren>;
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
            if (!props.toolbarConfig.selectImage) {
                props.toolbarConfig.selectImage = async (node: State<EditorNodeWithoutChildren>) => {
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
                console.log('FOCUSING OTHER', node.isFocused.get());
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
    function doDelete(node: State<EditorNodeWithoutChildren>) {
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
            deleteNodeRetainFocus(nodes, node.get({noproxy: true, stealth: true}));
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

    function updateNodeContent(id: number, content: string) {
        const node = getStateById(graph, id);
        // console.log('updateNodeContent', id, node!.content.get(), '->', content);
        node!.content.set(content);
    }

    return <View style={props.style}>
        <Pressable onPress={() => select(getStateLast(graph))} style={styles.inputArea}>
            {props.placeholder}
            {graph.map((node) => <View style={styles.editorRow} key={node.id.get()}>
                    {/* Node can get set to "none" before the list is re-generated, so the id check is a fast way to eliminate those. */}
                    {node.children && (node.children as State<EditorNodeWithoutChildren[]>).map((node) => node && node.id !== undefined &&
                        <EditorNodeMemo
                            key={node.id.get()}
                            node={node.get()}
                            textStyle={props.textStyle}
                            onBlur={() => deselect(getStateById(graph, node.id.get())! as State<EditorNodeWithoutChildren>)}
                            onChangeContent={(newContent) => updateNodeContent(node.id.get(), newContent)}
                            onFocus={() => select(getStateById(graph, node.id.get()) as State<EditorNodeWithoutChildren>)}
                            onDelete={() => doDelete(getStateById(graph, node.id.get()) as State<EditorNodeWithoutChildren>)}
                            onTryNewline={() => onTryNewline(getStateById(graph, node.id.get()) as State<EditorNodeWithoutChildren>)}
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
