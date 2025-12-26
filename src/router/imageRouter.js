import Router from "express";
import upload from "../middleware/upload.js";
import {setImage} from "../controllers/userController.js"

const router = Router();

router.post('/uploadImage/:userId', upload.single("image"),setImage)

export default router;