import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerMessagesSocket } from "./sockets/message.socket.js";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Registrar sockets
registerMessagesSocket(io);

// Levantar servidor (Express + Socket en el MISMO puerto)
server.listen(PORT, () => {
  console.log(`✅ Servidor iniciado en: http://localhost:${PORT}`);
  console.log(`✅ Socket namespace: /messages`);
});