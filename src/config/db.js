import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const env = process.env;

let dbConfig;

if (env.DATABASE_URL) {
  dbConfig = {
    uri: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // 🚨 CLAVE EN RAILWAY
  };
} else {
  const host = env.DB_HOST || env.MYSQLHOST;
  const user = env.DB_USER || env.MYSQLUSER;
  const password = env.DB_PASSWORD || env.MYSQLPASSWORD;
  const database = env.DB_NAME || env.MYSQLDATABASE;
  const port = parseInt(env.DB_PORT || env.MYSQLPORT || "3306", 10);

  if (!host || !user || !database) {
    throw new Error("Missing DB env vars.");
  }

  dbConfig = {
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: { rejectUnauthorized: false } // 🚨 TAMBIÉN AQUÍ
  };
}

const db = env.DATABASE_URL
  ? mysql.createPool(env.DATABASE_URL + "?ssl={" + '"rejectUnauthorized":false}')
  : mysql.createPool(dbConfig);

console.log("✅ MySQL pool created");

export default db;