import express from "express"
import { profile, register, login , updateProfile, searchUserController } from "../controllers/userController.js"
import auth from "../middleware/auth.js"
import {rateLimitAuth, rateLimitLogin}  from "../middleware/rateLimit.js"


const router = express.Router()

router.get("/users/:id",auth,profile)
router.post("/register", rateLimitAuth, register);
router.post("/login", rateLimitLogin, login);
router.patch("/update/:id",auth,updateProfile)
router.get("/usersSearch",searchUserController)

export default router;