import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routerUser from "./router/user.js";
import postsRouter from "./router/postsRouter.js";
import commentsRouter from "./router/commentsRouter.js";
import reactionsRouter from "./router/reactionsRouter.js";
import followsrouter from "./router/followsRouter.js";
import imageRouter from "./router/imageRouter.js";
import notificationrouter from "./router/notificationRouter.js";
import conversationsRouter from "./router/conversationsRouter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimitGlobal } from "./middleware/rateLimit.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { metrics } from "./monitoring/metrics.js";
import monitoringRouter from "./router/monitoringRouters.js";
import helmet from "helmet";

dotenv.config();

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "https://social-app-green-seven.vercel.app",
  "https://social-app-production-8e89.up.railway.app",
];

const envAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.CORS_ORIGIN,
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins])
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Request-Id",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use((req, res, next) => {
  metrics.totalRequests++;
  next();
});

app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://127.0.0.1:5173",
          "https://social-app-green-seven.vercel.app",
          "https://social-app-production-8e89.up.railway.app",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/", (req, res) => {
  res.send("servidor funcionando");
});

app.use("/api/monitoring", monitoringRouter);

app.use(requestIdMiddleware);
app.use("/api", rateLimitGlobal);

app.use("/api/auth", routerUser);
app.use("/api/follows", followsrouter);
app.use("/api/posts", postsRouter);
app.use("/api/image", imageRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/reactions", reactionsRouter);
app.use("/api/notifications", notificationrouter);

app.use(errorHandler);

export default app;