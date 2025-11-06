import Router from "express";
import { addpost } from "../controllers/postsController.js";

const router = Router();

router.post("/CreatePost/:id", addpost);


export default router;