import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {createURLQueryString, makeRequest} from "./http";
import {FastCommentsState} from "../types/fastcomments-state";
import {WebsocketLiveEvent} from "../types/dto/websocket-live-event";

function extractCommentIdFromEvent(liveEvent) {
    if (liveEvent.type === 'new-comment') {
        return liveEvent.comment._id;
    }
}

export interface SubscriberInstance {
    close: () => void
}

export function subscribeToChanges(
    config: FastCommentsCommentWidgetConfig,
    tenantIdWS: string,
    urlId: string,
    urlIdWS: string,
    userIdWS: string,
    checkBlockedComments: (commentIds: string[]) => Promise<Record<string, boolean>>,
    handleLiveEvent: (event: WebsocketLiveEvent) => boolean,
    doRerender: () => void,
    onConnectionStatusChange: (isConnected: boolean, lastEventTime: number) => void,
    lastLiveEventTime?: number
): SubscriberInstance | undefined {
    try {
        if (config.disableLiveCommenting) {
            return;
        }

        let isIntentionallyClosed = false;

        // Normally live events (comments created/updated, new votes) are pushed to the client from the server.
        // However, sometimes the client disconnects, some things happen, and then it reconnects.
        // To keep the server-side architecture simple, we store an event log on the server, and when the client reconnects
        // it simply fetches any events in the log that it would have missed.
        function fetchEventLog(startTime: number, endTime: number, cb) {
            // console.log('FastComments: fetchEventLog.', startTime, endTime);
            makeRequest(config, 'GET', '/event-log/' + config.tenantId + '/' + createURLQueryString({
                urlId, // important this isn't urlIdWS. urlIdWS contains tenant id and is only meant for the pubsub server.
                startTime,
                endTime,
            }), null, function success(response) {
                if (response && response.events) {
                    // console.log('FastComments: fetchEventLog SUCCESS', response.events.length);

                    function handleEvents(eventsDataParsed, blockedCommentIdMap) {
                        let needsReRender = false;
                        for (const eventDataParsed of eventsDataParsed) {
                            lastLiveEventTime = Math.max(lastLiveEventTime, eventDataParsed.timestamp + 1);
                            if ((!blockedCommentIdMap || !blockedCommentIdMap[extractCommentIdFromEvent(eventDataParsed)]) && handleLiveEvent(eventDataParsed)) {
                                needsReRender = true;
                            }
                        }
                        if (needsReRender) {
                            doRerender && doRerender();
                        }
                        cb && cb();
                    }

                    const eventsParsed = response
                        .events
                        .map(function (event) {
                            return JSON.parse(event.data);
                        });

                    if (checkBlockedComments) {
                        const ids = [];
                        for (const eventParsed of eventsParsed) {
                            const extractedId = extractCommentIdFromEvent(eventParsed);
                            if (extractedId) {
                                ids.push(extractedId);
                            }
                        }

                        if (ids.length > 0) {
                            checkBlockedComments(ids, function (blockedCommentIdMap) {
                                handleEvents(eventsParsed, blockedCommentIdMap);
                            });
                        } else {
                            handleEvents(eventsParsed);
                        }
                    } else {
                        handleEvents(eventsParsed);
                    }
                } else {
                    // console.log('FastComments: fetchEventLog SUCCESS - Empty response', response.events);
                    cb && cb();
                }
            }, function failure(e) {
                console.error('FastComments: fetchEventLog FAILURE', e);
                if (cb) {
                    cb();
                } else {
                    setTimeout(function () {
                        fetchEventLog(startTime, Date.now());
                    }, 5000 * Math.random());
                }
            });
        }

        if (config.usePolling) {
            if (!lastLiveEventTime) {
                lastLiveEventTime = Date.now();
            }

            function pollNext() {
                if (!isIntentionallyClosed) {
                    fetchEventLog(lastLiveEventTime, Date.now(), timeNext);
                }
            }

            function timeNext() {
                if (!isIntentionallyClosed) {
                    setTimeout(function () {
                        pollNext();
                    }, 2000);
                }
            }

            timeNext();

            return {
                close: function () {
                    isIntentionallyClosed = true;
                }
            }
        } else {
            // console.log('FastComments: connecting...');
            const socket = new WebSocket(state.wsHost + '/sub?urlId=' + urlIdWS + '&userIdWS=' + userIdWS + '&tenantIdWS=' + tenantIdWS);

            socket.onopen = function () {
                if (isIntentionallyClosed) {
                    return;
                }
                // console.log('FastComments: connected.');
                if (lastLiveEventTime) {
                    fetchEventLog(lastLiveEventTime, Date.now());
                }
                onConnectionStatusChange && onConnectionStatusChange(true, lastLiveEventTime);
            };

            socket.onclose = function () {
                // console.log('FastComments: disconnected.');
                if ('removeAllListeners' in socket) { // not supported on FF?
                    socket.removeAllListeners();
                }
                if (!lastLiveEventTime) {
                    lastLiveEventTime = Date.now();
                }
                if (!isIntentionallyClosed) {
                    onConnectionStatusChange && onConnectionStatusChange(false, lastLiveEventTime);
                    setTimeout(function () {
                        subscribeToChanges(config, tenantIdWS, urlId, urlIdWS, userIdWS, checkBlockedComments, handleLiveEvent, doRerender, onConnectionStatusChange, lastLiveEventTime);
                    }, 2000 * Math.random());
                }
            };

            socket.onmessage = async function (event) {
                if (isIntentionallyClosed) {
                    return;
                }
                // console.log('FastComments: live event.');
                const eventDataParsed = JSON.parse(decodeURIComponent(event.data));
                lastLiveEventTime = Math.max(lastLiveEventTime, eventDataParsed.timestamp);

                if (checkBlockedComments) {
                    const id = extractCommentIdFromEvent(eventDataParsed);
                    if (id) {
                        const blockedCommentsInfo = await checkBlockedComments([id]);
                        if (!blockedCommentsInfo[id]) {
                            if (handleLiveEvent(eventDataParsed)) {
                                doRerender && doRerender();
                            }
                        }
                    } else {
                        if (handleLiveEvent(eventDataParsed)) {
                            doRerender && doRerender();
                        }
                    }
                } else {
                    if (handleLiveEvent(eventDataParsed)) {
                        doRerender && doRerender();
                    }
                }
            };

            return {
                close: function () {
                    isIntentionallyClosed = true;
                    socket && socket.close();
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}
