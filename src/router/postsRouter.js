import Router from "express";
import { addpost, allpost, postByUserId, deletePostById, postById } from "../controllers/postsController.js";
import { optionalUpload } from "../utils/utils.js";

const router = Router();

router.post("/CreatePost/:id", optionalUpload , addpost);
router.get("/allpost", allpost)
router.get("/postByUserId/:id",postByUserId )
router.get("/postById/:id", postById)
router.delete("/removePost/:id",deletePostById)


export default router;