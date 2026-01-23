import Router from "express";
import { addpost, allpost, postByUserId, deletePostById, postById } from "../controllers/postsController.js";
import { optionalUpload } from "../utils/utils.js";
import auth from "../middleware/auth.js";

const router = Router();

router.post("/CreatePost/:id", auth, optionalUpload , addpost);
router.get("/allpost", allpost)
router.get("/postByUserId/:id",postByUserId )
router.get("/postById/:id", postById)
router.delete("/removePost/:id",auth,deletePostById)


export default router;