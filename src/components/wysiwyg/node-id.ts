import {hookstate} from "@hookstate/core";

const nodeCount = hookstate<number>(0);

export function getNextNodeId() {
    const newCount = nodeCount.get() + 1;
    nodeCount.set(newCount);
    return nodeCount.get();
}
