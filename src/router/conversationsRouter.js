import { Router } from "express";
import {createOrGetConversations,getMyConversations,getConversationsMessages} from "../controllers/conversationController.js";

const router = Router();

router.post('/addConversations', createOrGetConversations);
router.get('/myConversations', getMyConversations);
router.get('/readMessage/:id/message', getConversationsMessages);

export default router