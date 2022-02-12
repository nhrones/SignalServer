
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

export const topicName:Map<number,string> = new Map();
topicName.set(0, "RegisterPlayer")
topicName.set(1, "RemovePlayer")
topicName.set(2, "ResetGame")
topicName.set(3, "ResetTurn")
topicName.set(4, "ShowPopup")
topicName.set(5, "UpdateRoll")
topicName.set(6, "UpdateScore")
topicName.set(7, "UpdateDie")
topicName.set(8, "UpdatePlayers")
topicName.set(9, "SetID")
topicName.set(10, "GameFull")
topicName.set(11, "Bye")
topicName.set(12, "RtcOffer")
topicName.set(13, "RtcAnswer")
topicName.set(14, "candidate")
topicName.set(15, "connectOffer")
topicName.set(100, "UpdateScore-ones")
topicName.set(101, "UpdateScore-twos")
topicName.set(102, "UpdateScore-threes")
topicName.set(103, "UpdateScore-fours")
topicName.set(104, "UpdateScore-fives")
topicName.set(105, "UpdateScore-sixes")
topicName.set(106, "UpdateScore-three-o-kind")
topicName.set(107, "UpdateScore-four-o-kind")
topicName.set(108, "UpdateScore-small-straight")
topicName.set(109, "UpdateScore-large-straight")
topicName.set(110, "UpdateScore-full-house")
topicName.set(111, "UpdateScore-five-o-kind")
topicName.set(112, "UpdateScore-chance")
