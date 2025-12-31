import Router from 'express'
import { addComment, commentsByPost } from '../controllers/commentsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/addComment/:id/:postId',auth, addComment)
router.get('/readComment/:postId', commentsByPost)

export default router;
