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
import imageRouter from "./router/imageRouter.js"
import notificationrouter from "./router/notificationRouter.js";
import conversationsRouter from "./router/conversationsRouter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimitGlobal } from "./middleware/rateLimit.js";
import helmet from "helmet";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga .env (si estás usando ESM)
dotenv.config();

const app = express();


app.set("trust proxy", 1);
app.disable("x-powered-by")

app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
});

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
)

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));


app.get("/", (req, res) => {
res.send("servidor funcionando");
});

app.use("/api", rateLimitGlobal);

// Rutas
app.use("/api/auth", routerUser);

app.use("/api/follows", followsrouter);

app.use("/api/posts", postsRouter);

app.use("/api/image", imageRouter);

app.use("/api/conversations", conversationsRouter);

app.use("/api/comments", commentsRouter )

app.use("/api/reactions", reactionsRouter)

app.use("/api/notifications", notificationrouter);

app.use(errorHandler);

export default app;
