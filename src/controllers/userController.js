import db from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
const SECRET_KEY = process.env.SECRET_KEY || "2025jwtdev";

export const profile = async (req,res)=>{
    try {
    const userId=req.user.id;
        const [users] = await db.query("SELECT * FROM user WHERE iduser = ?",[userId]);
        const {iduser,name,email,created_at} = users[0]
        if (users.length === 0) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
    }
        res.status(200).json({msg:"perfil usuario",data:{iduser,name,email,created_at}});
    
        console.log("ID del usuario autenticado:", userId)
    } catch (error) {
        res.status(500).json({msg:"error del servidor"})
    }
};

export const register = async (req,res)=>{
    try {
        const {name,email,password}= req.body;
        const [existinguser]= await db.query("SELECT * FROM user WHERE email = ?",[email]);
        if(existinguser.length > 0){
            return res.status(400).json({msg: "este usario ya existe"});
        }else{
        const hashedpassword= await bcrypt.hash(password,10);
        await db.query("INSERT INTO user (name,email,password) VALUES (?,?,?)",[name,email,hashedpassword]);
        res.status(201).json({msg:"usuario registrado"})
        }
    } catch (error) {
        res.status(500).json({msg:"server error"});
        console.error(error);
        
        
    }
};

export const login= async (req,res)=>{
    try{
        const {email,password}=req.body;
        const [rows] = await db.query("SELECT * FROM user WHERE email = ?",[email]);
        const user = rows[0]
        if(user.length === 0){
            return res.status(400).json({msg:"usuario no encontrado"});
        }
        const ismacht = await bcrypt.compare(password,user.password);
        if(!ismacht){
            res.status(400).json({msg:"contraseña incorrecta"});
        }
        const token = jwt.sign({ user: { id: user.iduser, name: user.name, email: user.email } }
        ,SECRET_KEY,{ expiresIn: "1h" });
            res.status(200).json({msg:"login exitoso",token});
    }
    catch(error){
        res.status(500).json({msg:"error del servidor"});
        console.error(error);
        
    }
}

