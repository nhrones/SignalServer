import { DEBUG, connections } from './server.ts'
const Region = Deno.env.get("DENO_REGION") || 'localhost'

const SET_ID = 9
const REMOVE_PLAYER = 1

/**   
 *  A signaling class for WebSocket - BroadcastChannel 'message-coupling'.    
 *  @example
 *   >-WS.send ---------> BC.onmessage--v    
 *   |                                  |     
 *   <-WS.onmessage <--- BC.postMessage-<   
*/
export class SignalConnection {
        
    id: string
    table: number
    seat:number
    channel = new BroadcastChannel("iso1")
    socket: WebSocket
    
    constructor(soc: WebSocket, request: Request) {

        this.id = request.headers.get('sec-websocket-key') || ''
        this.table = 0
        this.seat = connections.size + 1
        this.socket = soc
        if (DEBUG) console.log(`connection in Region ${Region}`)

        //
        // message from another peer! relay it
        //
        this.channel.onmessage = (e: MessageEvent) => {
            if (DEBUG) console.info('channel.onmessage:', e.data)
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(e.data)
            }
        }
        
        //
        //  capture any message data errors
        //
        this.channel.onmessageerror = (ev: MessageEvent) => {
            console.error('BroadcastChannel message error occurred! data was: ', ev.data);
        }

        // 
        //  When ready, send the new peer its unique id. 
        //
        //  The `SET_ID` signal, will start initialization for an RTC-negociation process  
        //
        this.socket.onopen = () => {
            const msg = JSON.stringify([SET_ID, { id: this.id, table: this.table, seat: this.seat }])
            if (this.socket.readyState === WebSocket.OPEN) {
                // NOTE: It is the clients responsibility to report itself (state) to others.
                // This service simply accknowledges the new connection and returns
                // to the caller a new unique ID. 
                this.socket.send(msg)
                if (DEBUG) console.log('peer has connected: ', msg)
            }
        }
        
        //
        // When the client has closed the connection, 
        //
        // inform all peers and cleanup the connection.
        //
        this.socket.onclose = (ev: CloseEvent) => {
            if (DEBUG) console.log(`Peer ${this.id} has disconnected: ${ev.reason}`)
            this.channel.postMessage(JSON.stringify([REMOVE_PLAYER, this.id]))
            this.cleanUp()
        }

        //
        //  Ensure that all signaling messages are passed through. 
        //           
        this.socket.onmessage = (msg) => {
            if (DEBUG) console.log(`Seat#${this.seat} recieved socket message >> ${msg.data}`)
            // broadcast all messages to all other peers 
            this.channel.postMessage(msg.data)
        }

        //
        //  Report any socket errors
        //
        this.socket.onerror = (ev: Event | ErrorEvent) => {
            if (ev instanceof ErrorEvent) {
                console.error('An error occurred:', ev.message);
            } else {
                console.error('socket error: code', ev.type);
            }
        }
    }
    
    //
    //  cleanup resoures
    //
    cleanUp() {
        // remove socket listeners
        this.socket.onopen = null
        this.socket.onerror = null
        this.socket.onmessage = null
        this.socket.onclose = null
        this.socket.close()
        // remove channel listeners
        this.channel.onmessage = null
        this.channel.onmessageerror = null
        // No leaks -- allow this instance to be GC'd
        connections.delete(this)
    }
}