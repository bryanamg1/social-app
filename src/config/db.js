import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    port: process.env.DB_PORT || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "social-app"
});

console.log('Conectado a la base de datos✔️​​');

export default db;


