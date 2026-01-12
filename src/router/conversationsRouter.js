import { Router } from "express";
import {createOrGetConversations, getMyconversations, getConversationsMessges } from "../controllers/conversationController.js"

const router = Router();

router.post('/addConversations', createOrGetConversations);
router.get('/myConversations', getMyconversations);
router.get('/readMessage/:id/message', getConversationsMessges);

export default router;