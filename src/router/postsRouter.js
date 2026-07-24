import Router from "express";
import {
  addpost,
  allpost,
  deletePostById,
  getSavedPostIdsController,
  getSavedPostsController,
  pinPostById,
  postById,
  postByUserId,
  removeSavedPostById,
  savePostById,
  updatePostById,
} from "../controllers/postsController.js";
import { optionalUpload } from "../utils/utils.js";
import auth from "../middleware/auth.js";
import { rateLimitRead } from "../middleware/rateLimit.js";

const router = Router();

router.post("/", auth, optionalUpload, addpost);
router.get("/saved/ids", auth, getSavedPostIdsController);
router.get("/saved", auth, getSavedPostsController);
router.get("/allpost", rateLimitRead, allpost)
router.get("/postByUserId/:id",postByUserId )
router.get("/postById/:id", postById)
router.patch("/:postId", auth, updatePostById);
router.post("/:postId/save", auth, savePostById);
router.delete("/:postId/save", auth, removeSavedPostById);
router.patch("/:postId/pin", auth, pinPostById);
router.delete("/removePost/:id",auth,deletePostById)


export default router;
