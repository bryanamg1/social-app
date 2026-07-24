import express from "express"
import {
    createProfileProject,
    deleteProfileProject,
    forgotPassword,
    getMyPrivacySettings,
    googleAuth,
    profile,
    register,
    login,
    resetPassword,
    updateMyPrivacySettings,
    updateProfile,
    updateProfileProject,
    searchUserController,
} from "../controllers/userController.js"
import auth from "../middleware/auth.js"
import optionalAuth from "../middleware/optionalAuth.js"
import {
    rateLimitAuth,
    rateLimitLogin,
    rateLimitPasswordRecovery,
    rateLimitPasswordReset,
}  from "../middleware/rateLimit.js"


const router = express.Router()

router.get("/me/profile", auth, profile)
router.get("/users/:id", optionalAuth, profile)
router.get("/me/privacy", auth, getMyPrivacySettings)
router.post("/register", rateLimitAuth, register);
router.post("/login", rateLimitLogin, login);
router.post("/google", rateLimitAuth, googleAuth);
router.post("/forgot-password", rateLimitPasswordRecovery, forgotPassword);
router.post("/reset-password", rateLimitPasswordReset, resetPassword);
router.patch("/me/profile",auth,updateProfile)
router.patch("/me/privacy",auth,updateMyPrivacySettings)
router.post("/users/:id/projects", auth, createProfileProject);
router.patch("/users/:id/projects/:projectId", auth, updateProfileProject);
router.delete("/users/:id/projects/:projectId", auth, deleteProfileProject);
router.get("/usersSearch",searchUserController)

export default router;
