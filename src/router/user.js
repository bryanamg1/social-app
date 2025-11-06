import express from "express"
import auth from "../middleware/auth"


const router = express.Router()

router.get("/users/:id",auth,profile)
router.post("/register",register)
router.post("/login",login)