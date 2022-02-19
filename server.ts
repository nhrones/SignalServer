
import { serve } from "https://deno.land/std@0.125.0/http/server.ts";
import { SignalConnection } from './signaller.ts'
export const DEBUG = (Deno.env.get("DEBUG") === "true") || false

/**
 * 
 *  A collection of SignalConnection instances
 * 
 */
export const connections: Set<SignalConnection> = new Set()

/*
 *
 * Serves HTTP requests with the given handler
 *
 */
serve(handleRequest)

if (DEBUG) console.log(`Serving Websockets`);

/** 
 * 
 * handle each new http request 
 * 
 */
function handleRequest(request: Request): Promise<Response> {
    try {
        if (request.headers.get("upgrade") === "websocket") {
            if (connections.size < 2) {
                const { socket, response } = Deno.upgradeWebSocket(request);
                connections.add(new SignalConnection(socket, request))
                return Promise.resolve(response);
            } else {
                return Promise.resolve(new Response('Game full!', { status: 500 }))
            }
        }
        const errMsg = `Error: Request was not a valid WebSocket request! (405)`
        console.error(errMsg)
        return Promise.resolve(new Response(errMsg, { status: 405 }))
    } catch (err: unknown) {
        const errMsg = `Internal server error! 
    ${JSON.stringify(err)}`
        console.error(errMsg)
        return Promise.resolve(new Response(errMsg, { status: 500 }))
    }
}
