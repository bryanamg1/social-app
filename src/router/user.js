import express from "express"
import { profile, register, login } from "../controllers/userController.js"
import auth from "../middleware/auth.js"


const router = express.Router()

router.get("/users/:id",auth,profile)
router.post("/auth/register",register)
router.post("/auth/login",login)

export default router;