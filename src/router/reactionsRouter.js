import Router from 'express'
import { toggleReactionPost, getReactionsByPost, toggleReactionComment, getReactionsByComment, getMyReactionByPost, getMyReactionByComment } from '../controllers/reactionsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/posts/:postId', auth, toggleReactionPost);
router.post('/toggleReaction/:userId/:postId', auth,toggleReactionPost);
router.get('/reactionsPost/:postId', getReactionsByPost);
router.post('/comments/:commentId', auth, toggleReactionComment)
router.post('/toggleReactionComment/:userId/:commentId', auth,toggleReactionComment)
router.get('/reactionComment/:commentId', getReactionsByComment)
router.get('/posts/:pid/mine', auth, getMyReactionByPost)
router.get('/:uid/:pid/byUserInPost', auth, getMyReactionByPost)
router.get('/comments/:cid/mine', auth, getMyReactionByComment)
router.get('/:uid/:cid/byUserInComment', auth, getMyReactionByComment)

export default router;
