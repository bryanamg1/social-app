import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerMessagesSocket } from "./sockets/message.socket.js";
import { notificationSocket } from "./sockets/notificationSocket.js";
import { setIO } from "./sockets/sockets.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

// 🔥 Conectar DB antes de iniciar
if (process.env.NODE_ENV !== "test") {
  await connectDB();
}

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:5173", "http://localhost:3000"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setIO(io);

// Registrar sockets
notificationSocket(io);
registerMessagesSocket(io);

// 🚀 Levantar servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor iniciado en: http://localhost:${PORT}`);
  console.log(`✅ Socket namespace: /messages`);
});