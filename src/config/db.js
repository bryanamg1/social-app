import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool = null;

const getDatabaseConfig = () => {
  const env = process.env;
  const isTest = env.NODE_ENV === "test";

  const host = env.DB_HOST || env.MYSQLHOST;
  const user = env.DB_USER || env.MYSQLUSER;
  const password = env.DB_PASSWORD || env.MYSQLPASSWORD;

  const database = isTest
    ? "social_app_test"
    : env.DB_NAME || env.MYSQLDATABASE || env.MYSQL_DATABASE;

  const port = parseInt(env.DB_PORT || env.MYSQLPORT || "3306", 10);

  if (host && user && database) {
    return {
      host,
      user,
      port,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  if (env.DATABASE_URL && !isTest) {
    return env.DATABASE_URL;
  }

  throw new Error(
    "Missing DB env vars. Need DB_HOST/DB_USER/DB_NAME or DATABASE_URL"
  );
};

export const connectDB = async () => {
  if (pool) return pool;

  const isTest = process.env.NODE_ENV === "test";
  const dbConfig = getDatabaseConfig();

  pool = mysql.createPool(dbConfig);

  try {
    const conn = await pool.getConnection();

    const [dbInfo] = await conn.query(`
      SELECT 
        DATABASE() AS database_name,
        USER() AS db_user
    `);

    console.log(
      isTest
        ? "🧪 Connected to TEST database"
        : "✅ Connected to MAIN database"
    );

    console.log("✅ DB runtime info:", dbInfo[0]);

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