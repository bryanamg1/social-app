import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const env = process.env;

let db;

if (env.DATABASE_URL) {
  db = mysql.createPool(env.DATABASE_URL);
} else {
  const host = env.DB_HOST || env.MYSQLHOST;
  const user = env.DB_USER || env.MYSQLUSER;
  const password = env.DB_PASSWORD || env.MYSQLPASSWORD;
  const database = env.DB_NAME || env.MYSQLDATABASE;
  const port = parseInt(env.DB_PORT || env.MYSQLPORT || "3306", 10);

  if (!host || !user || !database) {
    throw new Error(
      "Missing DB env vars. Need DB_HOST/DB_USER/DB_NAME or DATABASE_URL."
    );
  }

  db = mysql.createPool({
    host,
    user,
    port,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

db.getConnection()
  .then((conn) => {
    console.log("DB pool connected");
    conn.release();
  })
  .catch((err) => {
    console.error("DB connection failed", {
      code: err?.code,
      message: err?.message,
    });
  });

export default db;
