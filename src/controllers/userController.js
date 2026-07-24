import {getDB} from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { searchUser } from "../service/usersService.js";
import { AppError } from "../utils/utils.js";
import dotenv from "dotenv";    
import {logger} from "../config/logger.js";
import { createAuthSession } from "../service/authSessionService.js";
import { getMissingMailEnvVars, isMailConfigured } from "../config/mail.js";
import { sendPasswordResetEmail } from "../service/emailService.js";
import {
    getMissingGoogleAuthEnvVars,
    isGoogleAuthConfigured,
    resolveGoogleAuthUser,
    verifyGoogleCredential,
} from "../service/googleAuthService.js";
import {
    clearUserRefreshTokens,
    createPasswordRecoveryRequest,
    deletePasswordResetTokenById,
    findPasswordResetRecordByToken,
    invalidateActivePasswordResetTokens,
    isPasswordResetRecordExpired,
    markPasswordResetTokenUsed,
    PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    PASSWORD_RESET_PUBLIC_MESSAGE,
    PASSWORD_RESET_SERVICE_UNAVAILABLE_MESSAGE,
    PASSWORD_RESET_SUCCESS_MESSAGE,
} from "../service/passwordRecoveryService.js";
import {
    createProject,
    deleteProject,
    getProjectsByUserId,
    updateProject,
} from "../service/profileProjectsService.js";
import { getPostTypeInsightsByUserId } from "../service/postInsightsService.js";
import { buildNormalizedProjectPayload } from "../utils/profileProjects.js";
import { getAuthenticatedUserId, isSameUser } from "../utils/authHelpers.js";

dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET;
const PASSWORD_MIN_LENGTH = 6;

const ensureProjectOwnership = (authUserId, routeUserId) => {
    return authUserId && routeUserId && isSameUser(authUserId, routeUserId);
};

export const profile = async (req,res,next)=>{
    try {
        const db = getDB();
    const authUserId = getAuthenticatedUserId(req);
    const routeUserParam = req.params.id ?? null;
    const userId = routeUserParam ? Number(routeUserParam) : authUserId;

    if (!routeUserParam && !authUserId) {
        return next(
        new AppError({
            code: "UNAUTHORIZED",
            message: "Usuario no autenticado",
            status: 401,
            })
        );
    }

    if (Number.isNaN(userId)) {
        return next(
            new AppError({
                code: "USER_ID_INVALID",
                message: "Usuario invalido",
                status: 400,
                details: { userId: req.params.id },
            })
        );
    }

    const [users] = await db.query(
        "SELECT user_id, user_name, email, bio, location, avatar_url, created_at FROM users WHERE user_id = ?",
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

    const [projects, postInsights] = await Promise.all([
        getProjectsByUserId(db, userId),
        getPostTypeInsightsByUserId(db, userId),
    ]);
    const { user_id, user_name, email, bio, location, avatar_url, created_at } = users[0];

    return res.status(200).json({
        ok: true,
        message: "Perfil de usuario",
        data: {
            user_id,
            user_name,
            email,
            bio,
            location,
            avatar_url,
            created_at,
            projects,
            post_type_summary: postInsights.summary,
            dominant_post_type: postInsights.dominant_post_type,
            dominant_post_type_count: postInsights.dominant_post_type_count,
            total_posts: postInsights.total_posts,
        },
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

export const createProfileProject = async (req, res, next) => {
    try {
        const db = getDB();
        const authUserId = getAuthenticatedUserId(req);
        const routeUserId = Number(req.params.id);

        if (!ensureProjectOwnership(authUserId, routeUserId)) {
            return next(
                new AppError({
                    code: "FORBIDDEN",
                    message: "No tienes permiso para crear proyectos en este perfil",
                    status: 403,
                })
            );
        }

        const normalizedProject = buildNormalizedProjectPayload(req.body);

        if (!normalizedProject.title) {
            return next(
                new AppError({
                    code: "PROJECT_TITLE_REQUIRED",
                    message: "El titulo del proyecto es obligatorio",
                    status: 400,
                })
            );
        }

        if (!normalizedProject.status) {
            return next(
                new AppError({
                    code: "PROJECT_STATUS_INVALID",
                    message: "El estado del proyecto no es valido",
                    status: 400,
                })
            );
        }

        if ((req.body?.repo_url || req.body?.repoUrl) && !normalizedProject.repo_url) {
            return next(
                new AppError({
                    code: "PROJECT_REPO_URL_INVALID",
                    message: "La URL del repositorio no es valida",
                    status: 400,
                })
            );
        }

        if ((req.body?.demo_url || req.body?.demoUrl) && !normalizedProject.demo_url) {
            return next(
                new AppError({
                    code: "PROJECT_DEMO_URL_INVALID",
                    message: "La URL del demo no es valida",
                    status: 400,
                })
            );
        }

        const project = await createProject(db, {
            userId: routeUserId,
            ...normalizedProject,
        });

        return res.status(201).json({
            ok: true,
            message: "Proyecto creado correctamente",
            data: project,
        });
    } catch (error) {
        return next(
            new AppError({
                code: "PROFILE_PROJECT_CREATE_FAILED",
                message: "No se pudo crear el proyecto",
                status: 500,
                details: error?.code || error?.message || null,
            })
        );
    }
};

export const updateProfileProject = async (req, res, next) => {
    try {
        const db = getDB();
        const authUserId = getAuthenticatedUserId(req);
        const routeUserId = Number(req.params.id);
        const projectId = Number(req.params.projectId);

        if (!ensureProjectOwnership(authUserId, routeUserId)) {
            return next(
                new AppError({
                    code: "FORBIDDEN",
                    message: "No tienes permiso para editar proyectos en este perfil",
                    status: 403,
                })
            );
        }

        if (Number.isNaN(projectId)) {
            return next(
                new AppError({
                    code: "PROJECT_ID_INVALID",
                    message: "El proyecto no es valido",
                    status: 400,
                })
            );
        }

        const normalizedProject = buildNormalizedProjectPayload(req.body);

        if (!normalizedProject.title) {
            return next(
                new AppError({
                    code: "PROJECT_TITLE_REQUIRED",
                    message: "El titulo del proyecto es obligatorio",
                    status: 400,
                })
            );
        }

        if (!normalizedProject.status) {
            return next(
                new AppError({
                    code: "PROJECT_STATUS_INVALID",
                    message: "El estado del proyecto no es valido",
                    status: 400,
                })
            );
        }

        if ((req.body?.repo_url || req.body?.repoUrl) && !normalizedProject.repo_url) {
            return next(
                new AppError({
                    code: "PROJECT_REPO_URL_INVALID",
                    message: "La URL del repositorio no es valida",
                    status: 400,
                })
            );
        }

        if ((req.body?.demo_url || req.body?.demoUrl) && !normalizedProject.demo_url) {
            return next(
                new AppError({
                    code: "PROJECT_DEMO_URL_INVALID",
                    message: "La URL del demo no es valida",
                    status: 400,
                })
            );
        }

        const project = await updateProject(db, {
            projectId,
            userId: routeUserId,
            ...normalizedProject,
        });

        if (!project) {
            return next(
                new AppError({
                    code: "PROJECT_NOT_FOUND",
                    message: "Proyecto no encontrado",
                    status: 404,
                })
            );
        }

        return res.status(200).json({
            ok: true,
            message: "Proyecto actualizado correctamente",
            data: project,
        });
    } catch (error) {
        return next(
            new AppError({
                code: "PROFILE_PROJECT_UPDATE_FAILED",
                message: "No se pudo actualizar el proyecto",
                status: 500,
                details: error?.code || error?.message || null,
            })
        );
    }
};

export const deleteProfileProject = async (req, res, next) => {
    try {
        const db = getDB();
        const authUserId = getAuthenticatedUserId(req);
        const routeUserId = Number(req.params.id);
        const projectId = Number(req.params.projectId);

        if (!ensureProjectOwnership(authUserId, routeUserId)) {
            return next(
                new AppError({
                    code: "FORBIDDEN",
                    message: "No tienes permiso para eliminar proyectos en este perfil",
                    status: 403,
                })
            );
        }

        if (Number.isNaN(projectId)) {
            return next(
                new AppError({
                    code: "PROJECT_ID_INVALID",
                    message: "El proyecto no es valido",
                    status: 400,
                })
            );
        }

        const result = await deleteProject(db, {
            projectId,
            userId: routeUserId,
        });

        if (!result?.affectedRows) {
            return next(
                new AppError({
                    code: "PROJECT_NOT_FOUND",
                    message: "Proyecto no encontrado",
                    status: 404,
                })
            );
        }

        return res.status(200).json({
            ok: true,
            message: "Proyecto eliminado correctamente",
            data: {
                project_id: projectId,
            },
        });
    } catch (error) {
        return next(
            new AppError({
                code: "PROFILE_PROJECT_DELETE_FAILED",
                message: "No se pudo eliminar el proyecto",
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

    const { accessToken } = await createAuthSession(db, user);

    logger.info("login successful", { email });

    return res.status(200).json({
        msg: "Login exitoso",
        accessToken,
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
        details: error?.sqlMessage || error?.code || error?.message || null,
        })
    );
    }
};

export const googleAuth = async (req, res, next) => {
try {
    const db = getDB();
    const credential = `${req.body?.credential || ""}`.trim();

    if (!credential) {
        return next(
        new AppError({
            code: "GOOGLE_AUTH_CREDENTIAL_REQUIRED",
            message: "La credencial de Google es obligatoria.",
            status: 400,
        })
        );
    }

    if (!isGoogleAuthConfigured()) {
        return next(
        new AppError({
            code: "GOOGLE_AUTH_NOT_CONFIGURED",
            message: "Google Sign-In no esta configurado.",
            status: 503,
            details: getMissingGoogleAuthEnvVars(),
        })
        );
    }

    logger.info("[google-auth] token received", {
        requestId: req.requestId,
    });

    const googleProfile = await verifyGoogleCredential(credential);

    logger.info("[google-auth] google token verified", {
        requestId: req.requestId,
        email: googleProfile.email,
    });

    const { user, action } = await resolveGoogleAuthUser(db, googleProfile);
    const { accessToken } = await createAuthSession(db, user);

    logger.info("[google-auth] user logged in", {
        requestId: req.requestId,
        userId: user.user_id,
        action,
    });

    return res.status(200).json({
        msg: "Login exitoso",
        accessToken,
    });
} catch (error) {
    logger.error("[google-auth] auth failed", {
        requestId: req.requestId,
        code: error?.code || null,
        error: error?.message || error?.code || null,
        details: error?.details || null,
    });

    return next(
    new AppError({
        code: error?.code || "GOOGLE_AUTH_FAILED",
        message:
            error instanceof AppError
                ? error.message
                : "No se pudo iniciar sesion con Google.",
        status: error?.status || 500,
        details:
            error instanceof AppError
                ? error.details
                : error?.code || error?.message || null,
    })
    );
}
};

export const forgotPassword = async (req, res, next) => {
try {
    const db = getDB();
    const email = `${req.body?.email || ""}`.trim().toLowerCase();

    logger.info("[password-recovery] request received", {
        requestId: req.requestId,
    });

    if (!email) {
        return next(
        new AppError({
            code: "FORGOT_PASSWORD_EMAIL_REQUIRED",
            message: "El email es obligatorio",
            status: 400,
        })
        );
    }

    if (!isMailConfigured()) {
        return next(
        new AppError({
            code: "MAIL_NOT_CONFIGURED",
            message: PASSWORD_RESET_SERVICE_UNAVAILABLE_MESSAGE,
            status: 503,
            details: getMissingMailEnvVars(),
        })
        );
    }

    const recoveryRequest = await createPasswordRecoveryRequest(db, email);

    if (!recoveryRequest) {
        logger.info("[password-recovery] user not found", {
            requestId: req.requestId,
        });

        return res.status(200).json({
            ok: true,
            message: PASSWORD_RESET_PUBLIC_MESSAGE,
        });
    }

    logger.info("[password-recovery] user found", {
        requestId: req.requestId,
        userId: recoveryRequest.user.user_id,
    });

    logger.info("[password-recovery] reset token stored", {
        requestId: req.requestId,
        userId: recoveryRequest.user.user_id,
        resetTokenId: recoveryRequest.resetTokenId,
    });

    try {
        await sendPasswordResetEmail({
            to: recoveryRequest.user.email,
            userName: recoveryRequest.user.user_name,
            resetUrl: recoveryRequest.resetUrl,
            expiresInMinutes: recoveryRequest.expiresInMinutes,
        });
    } catch (error) {
        await deletePasswordResetTokenById(db, recoveryRequest.resetTokenId);

        logger.error("forgot password email send failed", {
            requestId: req.requestId,
            userId: recoveryRequest.user.user_id,
            error: error?.message || error?.code || null,
            details: error?.details || null,
        });

        return next(
        new AppError({
            code: "FORGOT_PASSWORD_EMAIL_FAILED",
            message: "No se pudo enviar el email de recuperacion",
            status: 500,
            details: error?.details || error?.code || error?.message || null,
        })
        );
    }

    logger.info("[password-recovery] email sent", {
        requestId: req.requestId,
        userId: recoveryRequest.user.user_id,
    });

    return res.status(200).json({
        ok: true,
        message: PASSWORD_RESET_PUBLIC_MESSAGE,
    });
} catch (error) {
    logger.error("forgot password error", {
        email: req.body?.email || null,
        error: error?.message || error?.code || null,
    });

    return next(
        new AppError({
        code: "FORGOT_PASSWORD_FAILED",
        message: "No se pudo procesar la solicitud de recuperacion",
        status: 500,
        details: error?.sqlMessage || error?.code || error?.message || null,
        })
    );
}
};

export const resetPassword = async (req, res, next) => {
try {
    const db = getDB();
    const token = `${req.body?.token || ""}`.trim();
    const password = `${req.body?.password || ""}`;
    const confirmPassword = `${req.body?.confirmPassword || ""}`;

    if (!token) {
        return next(
        new AppError({
            code: "RESET_PASSWORD_TOKEN_REQUIRED",
            message: "El token de recuperacion es obligatorio",
            status: 400,
        })
        );
    }

    if (!password) {
        return next(
        new AppError({
            code: "RESET_PASSWORD_REQUIRED",
            message: "La contrasena es obligatoria",
            status: 400,
        })
        );
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return next(
        new AppError({
            code: "RESET_PASSWORD_TOO_SHORT",
            message: `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
            status: 400,
        })
        );
    }

    if (password !== confirmPassword) {
        return next(
        new AppError({
            code: "RESET_PASSWORD_MISMATCH",
            message: "Las contrasenas no coinciden",
            status: 400,
        })
        );
    }

    const resetRecord = await findPasswordResetRecordByToken(db, token);

    if (isPasswordResetRecordExpired(resetRecord)) {
        return next(
        new AppError({
            code: "INVALID_OR_EXPIRED_RESET_TOKEN",
            message: PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
            status: 400,
        })
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
        "UPDATE users SET password = ? WHERE user_id = ?",
        [hashedPassword, resetRecord.user_id]
    );

    await markPasswordResetTokenUsed(db, resetRecord.id);
    await invalidateActivePasswordResetTokens(db, resetRecord.user_id);
    await clearUserRefreshTokens(db, resetRecord.user_id);

    logger.info("password reset completed", {
        requestId: req.requestId,
        userId: resetRecord.user_id,
    });

    return res.status(200).json({
        ok: true,
        message: PASSWORD_RESET_SUCCESS_MESSAGE,
    });
} catch (error) {
    logger.error("reset password error", {
        error: error?.message || error?.code || null,
    });

    return next(
        new AppError({
        code: "RESET_PASSWORD_FAILED",
        message: "No se pudo actualizar la contrasena",
        status: 500,
        details: error?.sqlMessage || error?.code || error?.message || null,
        })
    );
}
};

export const updateProfile = async (req,res,next) =>{
    try{
        const db = getDB();
        const userId = getAuthenticatedUserId(req);
        const {user_name,bio,location}= req.body;

        if (!userId) {
            return next(
                new AppError({
                    code:"UNAUTHORIZED",
                    message:"Usuario no autenticado",
                    status:401
                })
            );
        }

        const [existinguser]= await db.query ("SELECT * FROM users WHERE user_id = ?",[userId]);

        if(existinguser.length === 0){
            return next(
                new AppError({
                    code:"EMAIL_REGISTERED",
                    message:"este usuario no existe",
                    status:409
                })
            );
        }

        const hasUserName = typeof user_name === "string" && user_name.trim() !== "";
        const hasBio = typeof bio === "string";
        const hasLocation = typeof location === "string";
        const nextUserName = hasUserName ? user_name.trim() : existinguser[0].user_name;

        const [duplicatename]= await db.query(
            "SELECT * FROM users WHERE user_name = ? AND user_id <> ?",
            [nextUserName, userId]
        );

        if(duplicatename.length > 0){
            return next(
                new AppError({
                    code:"USER_NAME_EXIST",
                    message:"este nombre de usuario ya existe",
                    status:409
                })
            );
        };

        const updateFields = [];
        const updateValues = [];

        if(hasUserName){
            updateFields.push("user_name = ?");
            updateValues.push(nextUserName);
        }

        if(hasBio){
            updateFields.push("bio = ?");
            updateValues.push(bio.trim());
        }

        if(hasLocation){
            updateFields.push("location = ?");
            updateValues.push(location.trim());
        }

        if(updateFields.length === 0){
            return res.status(200).json({
                msg:"sin cambios para actualizar",
                token:null,
                data:{
                    user_id: userId,
                    user_name: existinguser[0].user_name,
                    email: existinguser[0].email,
                    bio: existinguser[0].bio,
                    location: existinguser[0].location
                }
            });
        }

        await db.query(
            `UPDATE users SET ${updateFields.join(", ")} WHERE user_id = ?`,
            [...updateValues,userId]
        );

        const [updatedUsers]= await db.query(
            "SELECT user_id, user_name, email, bio, location FROM users WHERE user_id = ?",
            [userId]
        );
        const updatedUser = updatedUsers[0];

        const token = jwt.sign({ user: { user_id: userId, name: updatedUser.user_name, email: updatedUser.email } },
        SECRET_KEY,{ expiresIn: "1h" });

            return res.status(200).json({
                msg:"perfil actualizado exitosamente",
                token,
                data:{
                    user_id: updatedUser.user_id,
                    user_name: updatedUser.user_name,
                    email: updatedUser.email,
                    bio: updatedUser.bio,
                    location: updatedUser.location
                }
            });
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
    const db = getDB();
    const authUserId = getAuthenticatedUserId(req);

        if (!authUserId) {
    return next(
        new AppError({
        code: "UNAUTHORIZED",
        message: "Usuario no autenticado",
        status: 401,
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

    await db.query(updateImageQuery, [image_url, authUserId]);

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
