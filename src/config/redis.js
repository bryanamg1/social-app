import {createClient} from "redis"

const REDIS_URL = process.env.REDIS_URL;

let client = null;


export function getRedisClient (){
    if(!REDIS_URL) return null;
    if(client) return client;

    client = createClient({
        url: REDIS_URL,
        socket: {
            reconnectStrategy: (retries) =>{
                return Math.min(retries * 100 * 2000)
            }
        }
    })

    client.on("connect", ()=> console.log("✅ Redis: connecting..."));
    client.on("ready", ()=>console.log("✅ Redis: ready"))
    
    return client;
}

export async function connectRedis(){
    const c = getRedisClient()

    if(!c){
        console.warn("⚠️ REDIS_URL no definido. Redis deshabilitado.");
        return null
    }

    if(!c.isOpen){
        await c.connect();
    }

    return c;
}