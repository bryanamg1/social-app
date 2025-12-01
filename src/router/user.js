import express from "express"
import { profile, register, login , updateProfile } from "../controllers/userController.js"
import auth from "../middleware/auth.js"


const router = express.Router()

router.get("/users/:id",auth,profile)
router.post("/auth/register",register)
router.post("/auth/login",login)
router.patch("/auth/update/:id",auth,updateProfile)

export default router;