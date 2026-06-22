import express from "express";
import {
    feedfollowers,
    followUser,
    getFollowStatus,
    unfollowUser,
} from "../controllers/followscontroller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/users/:id/status", auth, getFollowStatus);
router.post("/users/:id/follow",auth,followUser);
router.post("/users/:id/unfollow",auth,unfollowUser);
router.get("/feed",auth,feedfollowers);

export default router;
