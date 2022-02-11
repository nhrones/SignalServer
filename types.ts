
export const Message = {
    RemovePlayer: 1,
    SetID: 9
}

export enum SocketState {
    CONNECTING,
    OPEN,
    CLOSING,
    CLOSED
}

export type PeerName = string | null

export type peer = {
    id: string | null
    name: string | null
    gameID: number
}

export type game = {
    id: number
    caller: peer
    callee: peer
    isFull: () => boolean
}