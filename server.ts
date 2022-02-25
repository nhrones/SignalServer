
import { serve, ConnInfo } from "https://deno.land/std@0.127.0/http/server.ts";
import { SignalConnection } from './signaler.ts'
export const DEBUG = (Deno.env.get("DEBUG") === "true") || false
const MAX_CONNECTS = parseInt(Deno.env.get("MAX_CONNECTS") || '2')
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
function handleRequest(request: Request, connInfo: ConnInfo): Promise<Response> {
    try {
        console.info('request from;', connInfo.remoteAddr as Deno.NetAddr)
        if (request.headers.get("upgrade") === "websocket") {
            if (connections.size < MAX_CONNECTS) {
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
