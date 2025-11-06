import db from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
const SECRET_KEY = process.env.SECRET_KEY || "2025jwtdev";

export const profile = async (req,res)=>{
    try {
    const userId=req.user.id;
        const [users] = await db.query("SELECT * FROM users WHERE userid = ?",[userId])
        if (users.length === 0) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
    }
        res.status(200).json({msg:"perfil usuario",data:users[0]})
    
        console.log("ID del usuario autenticado:", userId)
    } catch (error) {
        res.status(500).json({msg:"error del servidor"})
    }
}

export const register = async (req,res)=>{
    try {
        
    } catch (error) {
        
    }
}
