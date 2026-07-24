import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  createOrGetConversations,
  getMyConversations,
  getConversationsMessages,
  markConversationRead,
  sendMessageRest,
} from "../controllers/conversationController.js";

const router = Router();

router.post('/addConversations', auth, createOrGetConversations);
router.get('/myConversations', auth, getMyConversations);
router.get('/readMessage/:id/message', auth, getConversationsMessages);
router.patch('/:id/read', auth, markConversationRead);
router.post('/sendMessage', auth, sendMessageRest);

export default router
