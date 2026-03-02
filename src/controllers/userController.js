import {getDB} from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { searchUser } from "../service/usersService.js";
import { AppError } from "../utils/utils.js";
import dotenv from "dotenv";    
import {logger} from "../config/logger.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET;

export const profile = async (req,res, next)=>{
    try {
        const db = getDB();
    const userId=req.user.user_id;

    if (!userId) {
        return next(
        new AppError({
            code: "UNAUTHORIZED",
            message: "Usuario no autenticado",
            status: 401,
            })
        );
    }

    const [users] = await db.query(
        "SELECT user_id, user_name, email, created_at FROM users WHERE user_id = ?",
        [userId]
    );

    if (!users || users.length === 0) {
        return next(
            new AppError({
                code: "USER_NOT_FOUND",
                message: "Usuario no encontrado",
                status: 404,
                details: { userId },
            })
        );
    }

    const { user_id, user_name, email, created_at } = users[0];

    return res.status(200).json({
        ok: true,
        message: "Perfil de usuario",
        data: { user_id, user_name, email, created_at },
        });
    } catch (error) {
    console.error("profile error:", error);

    return next(
        new AppError({
            code: "USER_PROFILE_FAILED",
            message: "Error del servidor",
            status: 500,
            details: error?.code || error?.message || null,
            })
        );
    }
};

export const register = async (req,res,next)=>{
    try {
        const db = getDB();
        const {user_name,email,password}= req.body;
        const [existinguser]= await db.query("SELECT * FROM users WHERE email = ?",[email]);
        const [duplicatename]= await db.query("SELECT * FROM users WHERE user_name = ?",[user_name]);
            if (!email || !password) {
            return next(
        new AppError({
        code: "REGISTER_DATA_MISSIN",
        message: "los campos no pueden estar vacios",
        status: 400,
    })
);
        };

        if(duplicatename.length > 0){
            return next(
                new AppError({
                    code:"USER_NAME_EXIST",
                    message:"este nombre de usuario ya existe",
                    status:409
                })
            );
        };
        if(existinguser.length > 0){
            return next(
                new AppError({
                    code:"EMAIL_REGISTERED",
                    message:"este email ya esta registrado",
                    status:409
                })
            );
        }else{
        const hashedpassword= await bcrypt.hash(password,10);
        const [result] = await db.query("INSERT INTO users (user_name, email, password) VALUES (?, ?, ?)",[user_name, email, hashedpassword]);
        
        const token = jwt.sign({ user: { user_id: result.insertId, name: user_name, email } },SECRET_KEY,{ expiresIn: "1h" });
            res.status(201).json({msg: "Usuario registrado exitosamente",token,});
}
    }catch (error) {
        return next(
    new AppError({
    code: "REGISTER_FAILED",
    message: "Error al registrar usuario",
    status: 500,
    details: error?.code || error?.message || null,
    })
);
}
};

export const login = async (req, res, next) => {
try {
    const db = getDB();
    const { email, password } = req.body;

    logger.info("Login attempt", {
        requestId: req.requestId,
        ip: req.ip,
        email,
    });

    if (!email || !password) {
        logger.warn("login failed - missing data", { email });

        return next(
        new AppError({
            code: "LOGIN_DATA_MISSING",
            message: "Los campos no pueden estar vacíos",
            status: 400,
        })
        );
    }

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
        [email]
    );

    if (!rows.length) {
        logger.warn("login failed - user not found", { email });

        return next(
        new AppError({
            code: "USER_NOT_FOUND",
            message: "Datos incorrectos",
            status: 401,
        })
    );
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        logger.warn("login failed - invalid password", { email });

        return next(
        new AppError({
            code: "INVALID_PASSWORD",
            message: "Datos incorrectos",
            status: 401,
        })
        );
    }

    // 🔐 ACCESS TOKEN (15 min)
    const accessToken = generateAccessToken({
        id: user.user_id,
        email: user.email,
        name: user.user_name,
    });

    // 🔐 REFRESH TOKEN (random)
    const refreshToken = generateRefreshToken();

    // 🔒 HASH DEL REFRESH
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.execute(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
        [user.user_id, hashedRefreshToken, expiresAt]
    );

    logger.info("login successful", { email });

    return res.status(200).json({
        msg: "Login exitoso",
        accessToken,
        refreshToken,
    });
} catch (error) {
    logger.error("login error", {
        email: req.body?.email,
        error: error?.message || error?.code || null,
        stack: error?.stack || null,
    });

    return next(
        new AppError({
        code: "LOGIN_FAILED",
        message: "Error al iniciar sesión",
        status: 500,
        details: error?.code || error?.message || null,
        })
    );
    }
};

export const updateProfile = async (req,res,next) =>{
    try{
        const db = getDB();
        const userId = req.user.user_id;
        const {user_name,bio,location}= req.body;

        const [existinguser]= await db.query ("SELECT * FROM users WHERE user_id = ?",[userId]);
        const [duplicatename]= await db.query("SELECT * FROM users WHERE user_name = ?",[user_name]);
        if(duplicatename.length > 0){
            return next(
                new AppError({
                    code:"USER_NAME_EXIST",
                    message:"este nombre de usuario ya existe",
                    status:409
                })
            );
        };
        if(existinguser.length === 0){
            return next(
                new AppError({
                    code:"EMAIL_REGISTERED",
                    message:"este usuario no existe",
                    status:409
                })
            );
        }
        await db.query("UPDATE users SET user_name = ?, bio = ?, location = ? WHERE user_id = ?",
        [user_name,bio,location,userId]);

        const token = jwt.sign({ user: { user_id: userId, name: user_name, email: existinguser[0].email } },
        SECRET_KEY,{ expiresIn: "1h" });

            return res.status(200).json({msg:"perfil actualizado exitosamente",token, data:{user_name,bio,location}});
    }
catch (error) {
        return next(
    new AppError({
    code: "UPDATE_PROFILE_FAILED",
    message: "Error al actualizar el perfil",
    status: 500,
    details: error?.code || error?.message || null,
    })
);
}
};

export const setImage = async (req, res,next) => {
    try {
    const userId = parseInt(req.params.userId, 10);

        if (isNaN(userId)) {
    return next(
        new AppError({
        code: "USER_ID_INVALID",
        message: "Invalid or missing user ID",
        status: 400,
        details: { param: req.params.userId },
            })
        );
    }

    let image_url = null;

    if (req.file) {
        image_url = req.file.secure_url || req.file.path;
    } else if (req.body.image_url) {
        image_url = req.body.image_url.trim();
    }

if (!image_url) {
    return next(
    new AppError({
    code: "IMAGE_REQUIRED",
    message: "No se recibió ninguna imagen",
    status: 400
        })
    );
};


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

        return next(
    new AppError({
    code: "IMAGE_UPLOAD_ERROR",
    message: "Error cargando imagen",
    status: 500,
    details: error?.message || null
        })
    );
}
};

export const searchUserController = async (req, res,next) => {
    try {
        const db = getDB();
        const { query } = req.query; // EXTRAES el valor correcto

        if (!query || query.trim() === "") {
            return next(
                new AppError({
                    code: "SEARCH_QUERY_MISSING",
                    message: "El parámetro de búsqueda es obligatorio",
                    status: 400,
                })
            );
        }

        const sanitizedQuery = query.trim();

        const result = await searchUser(db, sanitizedQuery);

        return res.status(200).json({
            count: result.length,
            users: result,
        });

    }catch (error) {
    console.error(error);

        return next(
    new AppError({
    code: "USER_FETCH_ERROR",
    message: "Error obteniendo usuario",
    status: 500,
    details: error?.message || null
        })
    );
};
};