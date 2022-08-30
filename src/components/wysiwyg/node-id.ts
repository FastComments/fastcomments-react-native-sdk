import {hookstate} from "@hookstate/core";

const nodeCount = hookstate<number>(0);

export function getNextNodeId() {
    const lastValue = nodeCount.get();
    const newCount = lastValue + 1;
    nodeCount.set(newCount);
    return newCount; // OPTIMIZATIONS: only one get() and one set()
}
