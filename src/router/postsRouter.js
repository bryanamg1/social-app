import Router from "express";
import { addpost, allpost, postById, deletePostById } from "../controllers/postsController.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/CreatePost/:id", upload.single("image") , addpost);
router.get("/allpost", allpost)
router.get("/postById/:id",postById )
router.delete("/removePost/:id",deletePostById)


export default router;