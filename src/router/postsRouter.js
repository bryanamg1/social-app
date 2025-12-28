import Router from "express";
import { addpost, allpost, postById, deletePostById } from "../controllers/postsController.js";
import { optionalUpload } from "../utils/utils.js";

const router = Router();

router.post("/CreatePost/:id", optionalUpload , addpost);
router.get("/allpost", allpost)
router.get("/postById/:id",postById )
router.delete("/removePost/:id",deletePostById)


export default router;