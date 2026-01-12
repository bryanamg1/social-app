import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import routerUser from "./router/user.js";
import postsRouter from "./router/postsRouter.js";
import commentsRouter from "./router/commentsRouter.js";
import reactionsRouter from "./router/reactionsRouter.js";
import followsrouter from "./router/followsRouter.js";
import imageRouter from "./router/imageRouter.js";
import conversationsRouter from "./router/conversationsRouter.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga .env (si estás usando ESM)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Health check
app.get("/", (req, res) => {
  res.send("servidor funcionando");
});

// Rutas
app.use("/api/auth", routerUser);
app.use("/api/follows", followsrouter);
app.use("/api/posts", postsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/reactions", reactionsRouter);
app.use("/api/image", imageRouter);
app.use("/api/conversations", conversationsRouter);

// Error handler (al final)
app.use(errorHandler);

export default app;