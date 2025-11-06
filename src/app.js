import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path"
import { fileURLToPath } from 'url';
import postsRouter from "./router/postsRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express()


const PORT = process.env.PORT || 8080

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.get("/", (req,res)=>{
    res.send("servidor funcionando")
});

app.use("/api/posts", postsRouter);

app.listen(PORT,()=>{
    console.log(`✅ Servidor iniciado en: http://localhost:${PORT}`);
    
});