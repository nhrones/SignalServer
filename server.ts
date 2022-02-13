
import { serve } from "https://deno.land/std@0.125.0/http/server.ts";
import { topicName } from './topicNames.ts'

export const DEBUG = (Deno.env.get("DEBUG") === "true") || false
const Region = Deno.env.get("DENO_REGION") || 'localhost'

const REMOVE_PLAYER = 1
const SET_ID = 9
const OPEN = 1
const CALLEE = 1
const CALLER = 2

const RegisterPlayer = 0

const emptyString = ""

/** 
* If we have both a `callee` and a `caller`, the game is full.    
* We will reject any new connections.
*/
let gameIsFull = false

/**
* The first peer to connect will likely be called by a second peer.    
* We'll call her the `callee`.
*/
export const callee = { id: emptyString, name: 'Player1' }

/** 
* The second peer to connect will call the first.    
* We'll call her the `caller`. 
*/
export const caller = { id: emptyString, name: 'Player2' }

serve(handleRequest)
if (DEBUG) console.log(`Serving Websockets`);

/** handle each new http request */
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
 * A callback for the Server WebSocket 'connect' event.    
 * NOTE: This signaling service does not actually need to understand     
 * or do anything with the data being exchanged through it.
*/
export function connectPeer(socket: WebSocket, request: Request) {

    let thisID = emptyString;
    let isAlive = false;

    if (DEBUG) console.log(`connection in Region ${Region}`)

    const channel = new BroadcastChannel("game");

    // message from another socket! relay it
    channel.onmessage = (e: MessageEvent) => {
        if (socket.readyState === OPEN) {
            socket.send(e.data);
        }
    }

    // when ready, send the peer a unique id (its own socket-key)
    socket.onopen = () => {
        let role = CALLEE
        thisID = request.headers.get('sec-websocket-key') || 'id'
        if (callee.id === emptyString) { // first peer 
            callee.id = thisID
        } else if (caller.id === emptyString) { // second peer
            caller.id = thisID
            role = CALLER
        }

        if (socket.readyState === OPEN) {
            socket.send(JSON.stringify([SET_ID, { id: thisID, role: role }]))
            if (DEBUG) {
                console.log(`peer ${thisID} has connected`)
                console.log(`callee.id: ${callee.id}, caller.id: ${caller.id}`)
            }
            isAlive = true;
        }
        gameIsFull = (callee.id !== emptyString && caller.id !== emptyString) ? true : false
    }

    // when this client closes the connection, inform all peers
    socket.onclose = () => {
        if (isAlive === true) {
            if (DEBUG) console.log(`peer ${thisID} has disconnected`)
            channel.postMessage(JSON.stringify([REMOVE_PLAYER, thisID]))
        }

        // if our `callee` disconnected, swap roles;  
        // the caller will now become a callee
        if (thisID === callee.id) {
            if (caller.id !== emptyString) {
                callee.id = caller.id;
                callee.name = caller.name;
                caller.id = emptyString;
                caller.name = emptyString;
            }            
        } 
        // the caller quit, we'll wait for another
        else if (thisID === caller.id) {
            caller.id = emptyString;
            caller.name = emptyString;
        }
        gameIsFull = (callee.id !== emptyString && caller.id !== emptyString) ? true : false
    }

    // Ensure that all message are passed through and delivered, 
    // even if the server has no idea what they are.          
    socket.onmessage = (event) => {
        const payload = JSON.parse(event.data)
        const topic: number = payload[0] || 0
        if (DEBUG) console.log('socket.onmessage - topic: ', topicName.get(topic))
        const data = payload[1]

        if (topic === RegisterPlayer) {
            if (DEBUG) console.info('socket.onmessage - RegisterPlayer: ', data)
            if (caller.id === data[0]) { caller.name = data[1] }
            if (callee.id === data[0]) { callee.name = data[1] }
        }
        // Relay this message to the other peers(s) 
        channel.postMessage(event.data)
    }
}
