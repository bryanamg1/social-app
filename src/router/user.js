import express from "express"
import { profile, register, login } from "../controllers/userController.js"
import auth from "../middleware/auth.js"


const router = express.Router()

router.get("/users/:id",auth,profile)
router.post("/register",register)
router.post("/login",login)

export default router;