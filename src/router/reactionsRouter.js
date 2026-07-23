import Router from 'express'
import { toggleReactionPost, getReactionsByPost, toggleReactionComment, getReactionsByComment, getMyReactionByPost, getMyReactionByComment } from '../controllers/reactionsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/posts/:postId', auth, toggleReactionPost);
router.get('/reactionsPost/:postId', getReactionsByPost);
router.post('/comments/:commentId', auth, toggleReactionComment)
router.get('/reactionComment/:commentId', getReactionsByComment)
router.get('/posts/:pid/mine', auth, getMyReactionByPost)
router.get('/comments/:cid/mine', auth, getMyReactionByComment)

export default router;
