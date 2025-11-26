import Router from 'express'
import { addComment, commentsByPost } from '../controllers/commentsController.js';

const router = Router();

router.post('/addComment/:id/:postId', addComment)
router.get('/readComment/:postId', commentsByPost)

export default router;
