import { SignalConnection } from './connection.ts'

// constants from environment variables
export const DEBUG = (Deno.env.get("DEBUG") === "true") || true
export const Region = Deno.env.get("DENO_REGION") || 'localhost'

export const myIP = '192.168.0.171'
export const host = "localhost"
export const port = 8000

/**
 * we should listen for dropped connections and remove them 
 */
export const connections: Map<string, SignalConnection> = new Map();

export const corsResponse = () => new Response("",
    {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
    }
);
