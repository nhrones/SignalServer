import * as type from './types.ts'
import { DEBUG } from './server.ts'

/** 
* If we have both a `callee` and a `caller`, the game is full.    
* We will reject any new connections.
*/
export let gameIsFull = false

export const games: Map<number,type.game> = new Map()

/**
* The first peer to connect will likely be called by a second peer.    
* We'll call her the `callee`.
*/
export const callee: type.peer = { id: null, name: null, gameID: 0 }

/** 
* The second peer to connect will call the first.    
* We'll call her the `caller`. 
*/
export const caller: type.peer = { id: null, name: null, gameID: 0 }

/** 
 * manage peers and game state 
 */
export const managePeers = (thisID: string,
    data: { action: string, id: string, name: string } | null) => {
    // if we have new data, unpack it
    if (data !== null) {
        const { action, id, name } = data
        
        // when a peer registers we get their name
        if (action === 'connected') {
            if (caller.id === id) { caller.name = name }
            if (callee.id === id) { callee.name = name }
        }
        // when a peer disconnects, we clean up after it
        if (action === 'disconnected') {
            
            // adjust roles if the callee disconnected, 
            // the caller will now become a callee
            if (id === callee.id) {
                if (caller.id !== null) {
                    callee.id = caller.id;
                    callee.name = caller.name;
                    caller.id = null;
                    caller.name = null;
                } else {
                    callee.id = null;
                    callee.name = null; 
                }
            }
            // the caller quit, we'll wait for another
            if (id === caller.id) { 
                caller.id = null; 
                caller.name = null; 
            }
        }
    }
    
    gameIsFull = (callee.id !== null && caller.id !== null) ? true : false
    if (DEBUG) { console.log(`id:  ${thisID}, callee.id:  ${callee.id}, caller.id:  ${caller.id}`) }
}