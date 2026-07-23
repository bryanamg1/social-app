import Router from "express";
import {setImage} from "../controllers/userController.js"
import { optionalUpload } from "../utils/utils.js";
import auth from "../middleware/auth.js";

const router = Router();

router.post('/avatar', auth, optionalUpload, setImage)
router.post('/uploadImage/:userId', auth ,optionalUpload,setImage)

export default router;
