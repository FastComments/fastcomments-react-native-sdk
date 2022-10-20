import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {createURLQueryString, makeRequest} from "./http";
import {WebsocketLiveEvent, WebsocketLiveNewOrUpdatedCommentEvent} from "../types/dto/websocket-live-event";
import {EventLogEntryData, GetEventLogResponse} from "../types/dto/get-event-log";

function extractCommentIdFromEvent(liveEvent: WebsocketLiveNewOrUpdatedCommentEvent) {
    if (liveEvent.type === 'new-comment') {
        return liveEvent.comment._id;
    }
    return 'undefined';
}

export interface SubscriberInstance {
    close: () => void
}

export function subscribeToChanges(
    config: FastCommentsCommentWidgetConfig,
    wsHost: string,
    tenantIdWS: string,
    urlId: string,
    urlIdWS: string,
    userIdWS: string,
    checkBlockedComments: (commentIds: string[]) => Promise<Record<string, boolean>>,
    handleLiveEvent: (event: WebsocketLiveEvent) => void,
    onConnectionStatusChange: (isConnected: boolean, lastEventTime: number | undefined) => void,
    lastLiveEventTime?: number
): SubscriberInstance | undefined | void {
    try {
        if (config.disableLiveCommenting) {
            return;
        }

        let isIntentionallyClosed = false;

        // Normally live events (comments created/updated, new votes) are pushed to the client from the server.
        // However, sometimes the client disconnects, some things happen, and then it reconnects.
        // To keep the server-side architecture simple, we store an event log on the server, and when the client reconnects
        // it simply fetches any events in the log that it would have missed.
        async function fetchEventLog(startTime: number | undefined, endTime: number) {
            // console.log('FastComments: fetchEventLog.', startTime, endTime);
            const response = await makeRequest<GetEventLogResponse>({
                apiHost: config.apiHost!, method: 'GET', url: '/event-log/' + config.tenantId + '/' + createURLQueryString({
                    urlId, // important this isn't urlIdWS. urlIdWS contains tenant id and is only meant for the pubsub server.
                    startTime,
                    endTime,
                    userIdWS // this will be used to validate the SSO session
                })
            });

            if (response && response.status === 'success') {
                if (response.events) {
                    // console.log('FastComments: fetchEventLog SUCCESS', response.events.length);
                    function handleEvents(eventsDataParsed: EventLogEntryData[], blockedCommentIdMap?: Record<string, boolean>) {
                        for (const eventDataParsed of eventsDataParsed) {
                            lastLiveEventTime = Math.max(lastLiveEventTime || 0, eventDataParsed.timestamp + 1);
                            // the as WebsocketLiveNewOrUpdatedCommentEvent cast is kind of wrong here, but probably better than ts-ignore.
                            // we could check the type before we call the method, but that's kind of the point of having the method in the first place.
                            (!blockedCommentIdMap || !blockedCommentIdMap[extractCommentIdFromEvent(eventDataParsed as WebsocketLiveNewOrUpdatedCommentEvent)]) && handleLiveEvent(eventDataParsed);
                        }
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
                            const blockedCommentIdMap = await checkBlockedComments(ids);
                            handleEvents(eventsParsed, blockedCommentIdMap);
                        } else {
                            handleEvents(eventsParsed);
                        }
                    } else {
                        handleEvents(eventsParsed);
                    }
                } else {
                    // console.log('FastComments: fetchEventLog SUCCESS - Empty response', response.events);
                }
            } else {
                console.error('FastComments: fetchEventLog FAILURE', response);
                setTimeout(function () {
                    fetchEventLog(startTime, Date.now());
                }, 5000 * Math.random());
            }
        }

        if (config.usePolling) {
            if (!lastLiveEventTime) {
                lastLiveEventTime = Date.now();
            }

            async function pollNext() {
                if (!isIntentionallyClosed) {
                    await fetchEventLog(lastLiveEventTime, Date.now());
                    timeNext();
                }
            }

            function timeNext() {
                if (!isIntentionallyClosed) {
                    setTimeout(function () {
                        // noinspection JSIgnoredPromiseFromCall
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
            if (lastLiveEventTime) {
                console.log('FastComments: Detected potentially missed events, fetching log...');
                // noinspection JSIgnoredPromiseFromCall
                fetchEventLog(lastLiveEventTime, Date.now());
            }

            console.log('FastComments: connecting...');
            const socket = new WebSocket(wsHost + '/sub' + createURLQueryString({
                urlId: urlIdWS,
                userIdWS, // this will be used to validate the SSO session
                tenantIdWS
            }));

            socket.onopen = async function () {
                if (isIntentionallyClosed) {
                    return;
                }
                console.log('FastComments: connected.');
                if (lastLiveEventTime) {
                    // noinspection ES6MissingAwait
                    fetchEventLog(lastLiveEventTime, Date.now());
                }
                onConnectionStatusChange && onConnectionStatusChange(true, lastLiveEventTime);
            };

            socket.onclose = function () {
                console.log('FastComments: disconnected.');
                if (!lastLiveEventTime) {
                    lastLiveEventTime = Date.now();
                }
                if (!isIntentionallyClosed) {
                    onConnectionStatusChange && onConnectionStatusChange(false, lastLiveEventTime);
                    setTimeout(function () {
                        subscribeToChanges(config, wsHost, tenantIdWS, urlId, urlIdWS, userIdWS, checkBlockedComments, handleLiveEvent, onConnectionStatusChange, lastLiveEventTime);
                    }, 2000 * Math.random());
                }
            };

            socket.onmessage = async function (event) {
                if (isIntentionallyClosed) {
                    return;
                }
                // console.log('FastComments: live event.');
                const eventDataParsed = JSON.parse(decodeURIComponent(event.data));
                lastLiveEventTime = Math.max(lastLiveEventTime || 0, eventDataParsed.timestamp);

                if (checkBlockedComments) {
                    const id = extractCommentIdFromEvent(eventDataParsed);
                    if (id) {
                        const blockedCommentsInfo = await checkBlockedComments([id]);
                        if (!blockedCommentsInfo[id]) {
                            handleLiveEvent(eventDataParsed);
                        }
                    } else {
                        handleLiveEvent(eventDataParsed);
                    }
                } else {
                    handleLiveEvent(eventDataParsed);
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
