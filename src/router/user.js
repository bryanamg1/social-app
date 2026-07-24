import express from "express"
import {
    createProfileProject,
    deleteProfileProject,
    forgotPassword,
    googleAuth,
    profile,
    register,
    login,
    resetPassword,
    updateProfile,
    updateProfileProject,
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

router.get("/me/profile", auth, profile)
router.get("/users/:id", profile)
router.post("/register", rateLimitAuth, register);
router.post("/login", rateLimitLogin, login);
router.post("/google", rateLimitAuth, googleAuth);
router.post("/forgot-password", rateLimitPasswordRecovery, forgotPassword);
router.post("/reset-password", rateLimitPasswordReset, resetPassword);
router.patch("/me/profile",auth,updateProfile)
router.post("/users/:id/projects", auth, createProfileProject);
router.patch("/users/:id/projects/:projectId", auth, updateProfileProject);
router.delete("/users/:id/projects/:projectId", auth, deleteProfileProject);
router.get("/usersSearch",searchUserController)

export default router;
