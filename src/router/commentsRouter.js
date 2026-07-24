import Router from 'express'
import {
  addComment,
  commentsByPost,
  deleteComment,
  updateComment,
} from '../controllers/commentsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/:postId', auth, addComment)
router.patch('/:commentId', auth, updateComment)
router.delete('/:commentId', auth, deleteComment)
router.get('/readComment/:postId', commentsByPost)

export default router;
