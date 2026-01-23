import Router from 'express'
import { toggleReactionPost, getReactionsByPost, toggleReactionComment, getReactionsByComment, getMyReactionByPost, getMyReactionByComment } from '../controllers/reactionsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/toggleReaction/:userId/:postId', auth,toggleReactionPost);
router.get('/reactionsPost/:postId', getReactionsByPost);
router.post('/toggleReactionComment/:userId/:commentId', auth,toggleReactionComment)
router.get('/reactionComment/:commentId', getReactionsByComment)
router.get('/:uid/:pid/byUserInPost', getMyReactionByPost)
router.get('/:uid/:cid/byUserInComment', getMyReactionByComment)

export default router;