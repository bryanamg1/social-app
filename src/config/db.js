import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DB_HOST) {
  throw new Error("❌ Variables MYSQL no definidas (Railway)");
}

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT ),

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 10000,
});

console.log("✅ Pool MySQL conectado correctamente");

export default db;
