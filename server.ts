
import { serve } from "https://deno.land/std@0.125.0/http/server.ts";

export const DEBUG = (Deno.env.get("DEBUG") === "true") || false
const Region = Deno.env.get("DENO_REGION") || 'localhost'

const REMOVE_PLAYER = 1
const SET_ID = 9
const OPEN = 1

/** 
* If we have both a `callee` and a `caller`( peercount >= 2), the game is full.    
* We will reject any new connections.
*/
let gameIsFull = false
let peerCount = 0

serve(handleRequest)
if (DEBUG) console.log(`Serving Websockets`);

/** 
 * handle each new http request 
 */
function handleRequest(request: Request): Promise<Response> {
    try {
        if (request.headers.get("upgrade") === "websocket") {
            if (!gameIsFull) {
                const { socket, response } = Deno.upgradeWebSocket(request);
                connectPeer(socket, request)
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

/**  
 * A callback for the Server WebSocket 'upgrade' event.
 *     
 * NOTE: Our signaling service does not actually need to understand     
 * or do anything with the data being exchanged through it.
*/
export function connectPeer(socket: WebSocket, request: Request) {

    let thisID = '';
    let isAlive = false;
    const thisRole = peerCount + 1

    if (DEBUG) console.log(`connection in Region ${Region}`)

    // Note: this closure gets its own BroadcastChannel connection
    const channel = new BroadcastChannel("game");

    // message from another peer-socket! relay it
    channel.onmessage = (e: MessageEvent) => {
        if (DEBUG) console.info('channel.onmessage:', e.data)
        if (socket.readyState === OPEN) {
            socket.send(e.data);
        }
    }

    // When ready, send this peer their own unique id,
    // and then detect if the game is 'full' (callee + caller). 
    // A gameIsFull flag will block unneed/unwanted socket upgrades. 
    // The app instance will get a failed connection and report 
    // to the user 'Game is full'. 
    socket.onopen = () => {
        peerCount++
        thisID = request.headers.get('sec-websocket-key') || 'id'

        if (socket.readyState === OPEN) {
            socket.send(JSON.stringify([SET_ID, { id: thisID, role: thisRole }]))
            if (DEBUG) console.log(`peer ${thisID} has connected`)
            isAlive = true;
        }
        gameIsFull = (peerCount >= 2)
    }

    // When this peer has closed the socket connection, 
    // inform all peers and close the BroadcastChannel connection.
    socket.onclose = (ev: CloseEvent) => {
        peerCount--
        gameIsFull = false
        if (isAlive === true) {
            if (DEBUG) console.log(`Peer ${thisID} has disconnected with code: ${ev.code}`)
            channel.postMessage(JSON.stringify([REMOVE_PLAYER, thisID]))
        }
        // No leaks -- closing this should allow this closure to be GC'd
        channel.close()
    }

    // We ensure that all signalling messages are passed through 
    // and delivered, even if the server has no idea what they are.          
    socket.onmessage = (msg) => {
        const payload = JSON.parse(msg.data)
        const topic: number = payload[0] || 0
        if (DEBUG) console.log('socket.onmessage - topic: ', topic)
        // Relay this message to all other peers(s) 
        channel.postMessage(msg.data)
    }

    // Report any errors
    socket.onerror = (ev: Event | ErrorEvent) => {
        if (ev instanceof ErrorEvent) {
            console.error('An error occurred:', ev.message);
        } else {
            console.error('socket error: code', ev.type);
        }
    }
}