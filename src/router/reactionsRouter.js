import Router from 'express'
import { toggleReactionPost, getReactionsByPost, toggleReactionComment, getReactionsByComment } from '../controllers/reactionsController.js';

const router = Router();

router.post('/toggleReaction/:userId/:postId', toggleReactionPost);
router.get('/reactionsPost/:postId', getReactionsByPost);
router.post('/toggleReactionComment/:userId/:commentId', toggleReactionComment)
router.get('/reactionComment/:commentId', getReactionsByComment)

export default router;