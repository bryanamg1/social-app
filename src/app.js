import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import routerUser from "./router/user.js";
import postsRouter from "./router/postsRouter.js";
import commentsRouter from "./router/commentsRouter.js";
import reactionsRouter from "./router/reactionsRouter.js";
import followsrouter from "./router/followsRouter.js";
import imageRouter from "./router/imageRouter.js"
import http from "http";
import {Server} from "socket.io";
import { notificationSocket  } from "./socket/notificationSocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express()


const PORT = process.env.PORT || 8080

const server = http.createServer(app);

export const io = new Server(server,{cors:{origin: "*", methods: ["GET","POST"]}});
notificationSocket(io);

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.get("/", (req,res)=>{
    res.send("servidor funcionando")
});
app.use("/api",routerUser);

app.use("/api",followsrouter);

app.use("/api/posts", postsRouter);

app.use("/api/comments", commentsRouter )

app.use("/api/reactions", reactionsRouter)

app.use("/api/image", imageRouter)


server.listen(PORT,()=>{
    console.log(`✅ Servidor iniciado en: http://localhost:${PORT}`);
    
});