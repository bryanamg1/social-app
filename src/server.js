import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerMessagesSocket } from "./sockets/message.socket.js";
import { notificationSocket  } from "./sockets/notificationSocket.js";
import {setIO} from "./sockets/sockets.js";
import { connectRedis } from "./config/redis.js";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
setIO(io);
// Registrar sockets
notificationSocket(io);
registerMessagesSocket(io);

// Levantar servidor (Express + Socket en el MISMO puerto)
async function startServer() {
  try {
    await connectRedis(); // ✅ conecta Redis si existe REDIS_URL
  } catch (error) {
    console.error("⚠️ Redis no disponible, continúo sin cache", error?.message || error);
  } 

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Servidor iniciado en: http://localhost:${PORT}`);
    console.log(`✅ Socket namespace: /messages`);
  });
}

startServer()