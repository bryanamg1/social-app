import Router from 'express'
import { toggleReactionPost, getReactionsByPost } from '../controllers/reactionsController.js';

const router = Router();

router.post('/toggle-reaction/:userId/:postId', toggleReactionPost);
router.get('/reactionsPost/:postId', getReactionsByPost)

export default router;