import {createUUID} from "./uuid";

// this could technically grow unbounded forever, but the chance that the user does enough (leaving comments, votes, etc) to make this a problem
// is slim, as they would have to add hundreds of thousands of comments before restarting the app before it slows down.
export const broadcastIdsSent: string[] = [];

export function newBroadcastId() {
    const id = createUUID();
    broadcastIdsSent.push(id);
    return id;
}
