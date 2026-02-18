import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool = null; // 🔑 pool global reutilizable

export const connectDB = async () => {
  if (pool) return pool; // evita crear múltiples pools

  const env = process.env;

  const isTest = env.NODE_ENV === "test";

  if (env.DATABASE_URL && !isTest) {
    // 👉 Producción
    pool = mysql.createPool(env.DATABASE_URL);
  } else {
    // 👉 Dev / Test
    const host = env.DB_HOST || env.MYSQLHOST;
    const user = env.DB_USER || env.MYSQLUSER;
    const password = env.DB_PASSWORD || env.MYSQLPASSWORD;
    const database = isTest
      ? "social_app_test" // 🔥 base de datos de testing
      : env.DB_NAME || env.MYSQLDATABASE;

    const port = parseInt(env.DB_PORT || env.MYSQLPORT || "3306", 10);

    if (!host || !user || !database) {
      throw new Error(
        "Missing DB env vars. Need DB_HOST/DB_USER/DB_NAME"
      );
    }

    pool = mysql.createPool({
      host,
      user,
      port,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  try {
    const conn = await pool.getConnection();
    console.log(
      isTest
        ? "🧪 Connected to TEST database"
        : "✅ Connected to MAIN database"
    );
    conn.release();
  } catch (err) {
    console.error("❌ DB connection failed", err.message);
    throw err;
  }

  return pool;
};

export const getDB = () => {
  if (!pool) {
    throw new Error("DB not initialized. Call connectDB first.");
  }
  return pool;
};

export const closeDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("🛑 DB pool closed");
  }
};
