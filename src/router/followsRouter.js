import express from "express";
import {followUser,unfollowUser} from "../controllers/followscontroller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/users/:id/follow",auth,followUser);
router.post("/users/:id/unfollow",auth,unfollowUser);

export default router;