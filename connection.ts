
import { DEBUG } from './context.ts'

/** 
 * A Server Sent Events stream connection class
 * */
export class SignalConnection {

    static connections = 0
    id = ''

    stream: ReadableStream | null
 
    constructor(id: string) {
        //SignalConnection.connections++
        this.id = id;
        this.stream = null
    }
 
    connect(): Response {

        const sseChannel = new BroadcastChannel("game");
        if (DEBUG) console.log('Started ' + this.id + ' SSE Stream!')

        this.stream = new ReadableStream({

            /**
             * Start: is called immediately when the object is constructed.
             * Each readable stream has an associated controller that, 
             * as the name suggests, allows you to control the stream. 
             */
            start: (controller) => {
                
                // notify the game is full
                if (SignalConnection.connections >= 4) {
                    controller.enqueue('event: GameIsFull\n\n')
                    controller.close()
                }
                
                // send the client their new ID
                const setID = JSON.stringify({ data: { id: this.id } })
                controller.enqueue('event: SetID\ndata: ' + setID + '\nretry: 300000\n\n')
                
                sseChannel.onmessage = (e) => {

                    // BC messages are posted as 'Objects'
                    const dataObject = e.data
                    const { from } = dataObject

                    // We don't send messages to our self!
                    if (from !== this.id) {
                        console.info('SSE sending: ', dataObject)
                        controller.enqueue('data: ' + JSON.stringify(dataObject) + '\n\n');
                    } else {
                        console.log("Ignore! It's from me!")
                    }

                    /**
                     * Disconnection Detection 
                     * When a client is connected to the server via SSE, the server 
                     * is not notified if the client disconnects. Disconnection will 
                     * be detected by the server only when trying to send data to
                     * the client and getting an error report mentioning that the 
                     * connection was lost. 
                     * The disconnection detection issue can be addressed with a
                     * server sent heartbeat.
                     * 
                     * To cancel a stream from the server, respond with a 
                     * non "text/event-stream" Content-Type or return an HTTP status other 
                     * than 200 OK (e.g. 404 Not Found).
                     * Both methods will prevent the browser from re-establishing the connection.
                     * 
                     */
                    // if (data.data === 'bye') {
                    //     console.log('Bye Bye!')
                    //     try {
                    //         if (this.stream && !this.stream.locked) {
                    //             console.info('Stream was not locked while trying to cancel!')
                    //             //const c = stream.cancel('Client said Bye!')
                    //             //    c.then((value)=> console.log(value))
                    //             controller.error('Client said Bye!')
                    //         } else {
                    //             console.log("The stream is locked! Can't cancel!")
                    //         }
                    //     } catch (er) {
                    //         console.error('I caught this error trying to cancel the stream!', er)
                    //     } finally {
                    //         console.log("Well didn't catch it! Why not?")
                    //     }

                    // }
                };
            },

            /**
             * Called when the stream consumer cancels the stream. 
             */
            cancel() {
                console.log('User was disconnected!')
                // cancel is called when the client hangs up the connection.
                sseChannel.close();
                SignalConnection.connections--
            },

        });


        // Stream.pipeThrough - Provides a chainable way of piping the current 
        // stream through a transform stream or any other writable/readable pair.
        //
        //TODO const RESPONSE_HEADERS = [
        // ["Connection", "Keep-Alive"],
        // ["Content-Type", "text/event-stream"],
        // ["Cache-Control", "no-cache"],
        // ["Keep-Alive", `timeout=${Number.MAX_SAFE_INTEGER}`],
        // ] as const;

        return new Response(this.stream.pipeThrough(new TextEncoderStream()), {
            headers: {
                "content-type": "text/event-stream",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
            },
        });

    }
}