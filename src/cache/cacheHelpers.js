import { getRedisClient } from "../config/redis.js";


const isDev = process.env.NODE_ENV !== "production"

export async function getCache (key){
    try {
        const client = getRedisClient()

        if(!client || !client.isOpen){
            return null
        }

        const data = await client.get(key);

        if(!data){
            return null
        }

        if(isDev){
            console.log(`🟢 CACHE HIT: ${key}`);
            return JSON.parse(data)
            
        }

    } catch (error) {
        console.error("❌ getCache error:", error?.message || error);
    return null;
    }
}

export async function setCache(key, ttl, value) {
    try {
        const client = getRedisClient()

        if(!client || !client.isOpen){
            return
        }

        const payload = JSON.stringify(value);

        await client.set(key, payload, {
            EX: ttl,
        });

        if(isDev){
            console.log(`🟡 CACHE SET: ${key} (TTL ${ttl}s)`)
        }
    } catch (error) {
        console.error("❌ setCache error:", error?.message || error);
    }
}

export async function invalidateCache(pattern) {
    try {
        const client = getRedisClient();

        if(!client || !client.isOpen){
            return
        }

        const keys = await client.keys(pattern);

        if(keys.length === 0){
            return
        }

        await client.del(keys)

        if(isDev){
            console.log(`🔴 CACHE INVALIDATE: ${pattern} (${keys.length})`);
        }
    } catch (error) {
        console.error("❌ invalidateCache error:", error?.message || error);
    }
}