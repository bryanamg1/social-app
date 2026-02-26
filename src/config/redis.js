import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

let client = null;

export function getRedisClient() {
    if (!REDIS_URL) return null;
    if (client) return client;

    client = createClient({
        url: REDIS_URL,
        socket: {
            reconnectStrategy: (retries) => {
                return Math.min(retries * 100, 2000);
            }
        }
    });

    client.on("connect", () => console.log("✅ Redis: connecting..."));
    client.on("ready", () => console.log("✅ Redis: ready"));
    client.on("error", (err) => console.error("❌ Redis error:", err.message));

    // 🔥 CONECTAR AUTOMÁTICAMENTE
    client.connect().catch(err => {
        console.error("❌ Redis connection failed:", err.message);
    });

    return client;
}