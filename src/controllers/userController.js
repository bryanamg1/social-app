import db from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
const SECRET_KEY = process.env.SECRET_KEY || "2025jwtdev";

export const profile = async (req,res)=>{
    try {
    const userId=req.user.user_id;
        const [users] = await db.query("SELECT * FROM users WHERE user_id = ?",[userId]);

        if (users.length === 0) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
    }
    const {user_id,user_name,email,created_at} = users[0]
        res.status(200).json({msg:"perfil usuario",data:{user_id,user_name,email,created_at}});

        console.log("ID del usuario autenticado:", userId)
    } catch (error) {
        res.status(500).json({msg:"error del servidor"})
        console.error(error);   
    }
};

export const register = async (req,res)=>{
    try {
        const {user_name,email,password}= req.body;
        const [existinguser]= await db.query("SELECT * FROM users WHERE email = ?",[email]);
        if(existinguser.length > 0){
            return res.status(400).json({msg: "este usario ya existe"});
        }else{
        const hashedpassword= await bcrypt.hash(password,10);
        const [result] = await db.query("INSERT INTO users (user_name, email, password) VALUES (?, ?, ?)",[user_name, email, hashedpassword]);
        
        const token = jwt.sign({ user: { user_id: result.insertId, name: user_name, email } },SECRET_KEY,{ expiresIn: "1h" });
            res.status(201).json({msg: "Usuario registrado exitosamente",token,});
}
    } catch (error) {
        res.status(500).json({msg:"server error"});
        console.error(error);
        
        
    }
};

export const login= async (req,res)=>{
    try{
        const {email,password}=req.body;
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?",[email]);
        const users = rows[0]
        if(users.length === 0){
            return res.status(400).json({msg:"usuario no encontrado"});
        }
        const ismacht = await bcrypt.compare(password,users.password);
        if(!ismacht){
            return res.status(400).json({msg:"contraseña incorrecta"});
        }
        const token = jwt.sign({ user: { user_id: users.user_id, name: users.user_name, email: users.email }}
        ,SECRET_KEY,{ expiresIn: "1h" });
            return res.status(200).json({msg:"login exitoso",token});
    }
    catch(error){
        res.status(500).json({msg:"error del servidor"});
        console.error(error);
        
    }
}

export const updateProfile = async (req,res) =>{
    try{
        const userId = req.user.user_id;
        const {user_name,bio,location}= req.body;

        const [existinguser]= await db.query ("SELECT * FROM users WHERE user_id = ?",[userId]);
        if(existinguser.length === 0){
            return res.status(404).json({msg:"este usuario no existe"});
        }
    }
    catch(error){
        res.status(500).json({msg:"error al actualizar el perfil"});
        console.error(error);
    }
};

