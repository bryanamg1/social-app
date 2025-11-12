import Router from "express";
import { addpost, allpost, postById, deletePostById } from "../controllers/postsController.js";

const router = Router();

router.post("/CreatePost/:id", addpost);
router.get("/allpost", allpost)
router.get("/postById/:id",postById )
router.delete("/removePost/:id",deletePostById)


export default router;