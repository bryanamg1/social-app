import express from "express";
import {
    blockUser,
    feedfollowers,
    followUser,
    getFollowSuggestions,
    getFollowStatus,
    unblockUser,
    unfollowUser,
} from "../controllers/followscontroller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/users/:id/status", auth, getFollowStatus);
router.post("/users/:id/follow",auth,followUser);
router.post("/users/:id/unfollow",auth,unfollowUser);
router.post("/users/:id/block",auth,blockUser);
router.post("/users/:id/unblock",auth,unblockUser);
router.get("/feed",auth,feedfollowers);
router.get("/suggestions",auth,getFollowSuggestions);

export default router;
