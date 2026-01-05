import db from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { searchUser } from "../service/usersService.js";

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
        const [duplicatename]= await db.query("SELECT * FROM users WHERE user_name = ?",[user_name]);
        if(duplicatename.length > 0){
            return res.status(400).json({msg: "este nombre de usuario ya existe"});
        }
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
        
        if(rows.length === 0){
            return res.status(400).json({msg:"email no encontrado"});
        }
        const users = rows[0]

        const ismacht = await bcrypt.compare(password,users.password);
        if(!ismacht){
            return res.status(400).json({msg:"contraseña incorrecta"});
        }
        const token = jwt.sign({ user: { user_id: users.user_id, name: users.user_name, email: users.email }}
        ,SECRET_KEY,{ expiresIn: "1h" });
            return res.status(200).json({msg:"login exitoso",token});
    }
    catch(error){
        res.status(500).json({msg:"error del servidor",error});
        console.error(error);
        
    }
}

export const updateProfile = async (req,res) =>{
    try{
        const userId = req.user.user_id;
        const {user_name,bio,location}= req.body;

        const [existinguser]= await db.query ("SELECT * FROM users WHERE user_id = ?",[userId]);
        const [duplicatename]= await db.query("SELECT * FROM users WHERE user_name = ?",[user_name]);
                if(duplicatename.length > 0){
            return res.status(400).json({msg: "este nombre de usuario ya existe"});
        }
        if(existinguser.length === 0){
            return res.status(404).json({msg:"este usuario no existe"});
        }
        await db.query("UPDATE users SET user_name = ?, bio = ?, location = ? WHERE user_id = ?",
        [user_name,bio,location,userId]);

        const token = jwt.sign({ user: { user_id: userId, name: user_name, email: existinguser[0].email } },
        SECRET_KEY,{ expiresIn: "1h" });

            return res.status(200).json({msg:"perfil actualizado exitosamente",token, data:{user_name,bio,location}});
    }
    catch(error){
        res.status(500).json({msg:"error al actualizar el perfil"});
        console.error(error);
    }
};

export const setImage = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    let image_url = null;

    if (req.file) {
      image_url = req.file.secure_url || req.file.path;
    } else if (req.body.image_url) {
      image_url = req.body.image_url.trim();
    }

    if (!image_url) {
      return res.status(400).json({ error: "No image received" });
    }

    const updateImageQuery = `
      UPDATE users 
      SET avatar_url = ? 
      WHERE user_id = ?
    `;

    await db.query(updateImageQuery, [image_url, userId]);

    return res.status(200).json({
      message: "Imagen subida y actualizada correctamente",
      avatar_url: image_url
    });

  } catch (error) {
    console.error("❌ Error cargando imagen:", error);
    return res.status(500).json({ message: "Error cargando imagen", error });
  }
};

export const searchUserController = async (req, res) => {
    try {
        const { query } = req.query; // EXTRAES el valor correcto

        if (!query || query.trim() === "") {
            return res.status(400).json({ error: "query requerida" });
        }

        const sanitizedQuery = query.trim();

        const result = await searchUser(db, sanitizedQuery);

        return res.status(200).json({
            count: result.length,
            users: result,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "error obteniendo usuario", error });
    }
};