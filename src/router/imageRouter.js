import Router from "express";
import {setImage} from "../controllers/userController.js"
import { optionalUpload } from "../utils/utils.js";

const router = Router();

router.post('/uploadImage/:userId', optionalUpload,setImage)

export default router;