import express from "express"
import {
    forgotPassword,
    googleAuth,
    profile,
    register,
    login,
    resetPassword,
    updateProfile,
    searchUserController,
} from "../controllers/userController.js"
import auth from "../middleware/auth.js"
import {
    rateLimitAuth,
    rateLimitLogin,
    rateLimitPasswordRecovery,
    rateLimitPasswordReset,
}  from "../middleware/rateLimit.js"


const router = express.Router()

router.get("/users/:id",auth,profile)
router.post("/register", rateLimitAuth, register);
router.post("/login", rateLimitLogin, login);
router.post("/google", rateLimitAuth, googleAuth);
router.post("/forgot-password", rateLimitPasswordRecovery, forgotPassword);
router.post("/reset-password", rateLimitPasswordReset, resetPassword);
router.patch("/update/:id",auth,updateProfile)
router.get("/usersSearch",searchUserController)

export default router;
