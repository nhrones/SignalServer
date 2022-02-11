
import { serve } from "https://deno.land/std@0.125.0/http/server.ts";
import { Message, SocketState } from './types.ts'
import { gameIsFull, managePeers, callee, caller } from './peerManagement.ts'

export const DEBUG = (Deno.env.get("DEBUG") === "true") || true
const Region = Deno.env.get("DENO_REGION") || 'localhost'


const host = "localhost" //"192.168.0.171"//"127.0.0.1"
const port = 8000

//serve(handleRequest, { hostname: host, port: port });
serve(handleRequest)   
if (DEBUG) console.log(`Serving Client App from http://${host}:${port}`);

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

    let id = '';
    let isAlive = false;
  
    if (DEBUG) console.log(`connection in Region ${Region}`)

    const channel = new BroadcastChannel("game");

    // message from another socket! relay it
    channel.onmessage = (e: MessageEvent) => {
        if (socket.readyState === SocketState.OPEN) {
            socket.send(e.data);
        }
    }

    // when ready, send the client a unique id from its key
    socket.onopen = () => { // send instance its new ID
        id = request.headers.get('sec-websocket-key') || 'id'
        if (callee.id === null) {
            callee.id = id
        } else if (caller.id === null) {
            caller.id = id
        }
        managePeers(id, null)
        if (socket.readyState === SocketState.OPEN) {
            socket.send(JSON.stringify([Message.SetID, { id: id }]))
            if (DEBUG) {
                console.log(`peer ${id} has connected`)
                console.log(`callee.id: ${callee.id}, caller.id: ${caller.id}`)
            }
            isAlive = true;
        }
    }

    // when this client closes the connection, inform all peers
    socket.onclose = () => {
        if (isAlive === true) {
            if (DEBUG) console.log(`peer ${id} has disconnected`) 
            channel.postMessage(JSON.stringify([Message.RemovePlayer, id]))
        }
        managePeers(id, { action: 'disconnected', id: id, name: "" })
    }
 
    // Ensure that all message are passed through and delivered, 
    // even if the server has no idea what they are.          
    socket.onmessage = (event) => {
        if (DEBUG) console.log(event.data)
        const payload = JSON.parse(event.data)
        const topic = payload[0]
        if (DEBUG) console.log('socket.onmessage - topic: ', topic)
        const data = payload[1]
        
        if (topic === 0) { //'RegisterPlayer') {
            if (DEBUG) console.info('socket.onmessage - RegisterPlayer: ', data)
            managePeers(id, { action: 'connected', id: data[0], name: data[1] })
        }
        // Relay this message to the other peers(s) 
        channel.postMessage(event.data)
    }
} 