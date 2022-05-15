
import { serve } from "https://deno.land/std@0.136.0/http/server.ts";
import { DEBUG, host, port, corsResponse, connections } from './context.ts'
import { SignalConnection } from './connection.ts'
   
/**  handle http requests */
async function handleRequest(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (DEBUG) console.log('server request - pathname = ', pathname)
    if (pathname.includes('/listen')) { // client requesting SSE connection
        if (DEBUG) console.log('Client registering SSE')
        const id = pathname.substring(pathname.lastIndexOf('/') + 1)
        const connection = new SignalConnection(id)
        connections.set(id, connection);
        return connection.connect()
    }
    else if (request.method === 'POST') { // client posts a message
        const dataObject = await request.json();
        if (DEBUG) console.info('Client Posted:', dataObject)
        const gBC = new BroadcastChannel("game");
        gBC.postMessage(dataObject);
        gBC.close();
        return corsResponse()
    } else  return corsResponse()
}
 
serve(handleRequest, { hostname: host, port: port });
console.log(`Serving http://${host}:${port}`);
