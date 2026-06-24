const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "https://social-app-green-seven.vercel.app",
  "https://social-app-front-ruby.vercel.app",
  "https://social-app-front-opfry0fox-bryan-marquez.vercel.app",
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

export const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins])
);

export const isAllowedVercelPreview = (origin) => {
  return /^https:\/\/social-app-front-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
};

export const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  return allowedOrigins.includes(origin) || isAllowedVercelPreview(origin);
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
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
