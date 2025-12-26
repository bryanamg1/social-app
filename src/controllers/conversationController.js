import { findConversationBetweenTwoUsers, createConversation, addUsersToConversation, userBelongsToConversation, getMessagesByConversation, getUserConversations } from "../service/conversationsService.js";
import { insertMessage } from "../service/messageService.js";
import db from "../config/db.js";
import { insertComment } from "../service/commentService.js";

export const createOrGetConversations = async (req, res) => {
    try {
        const { user_id, other_user_id } = req.body;

        const userId = parseInt(user_id, 10);
        const otherUserId = parseInt(other_user_id, 10);
        

        if (isNaN(userId) || isNaN(otherUserId)) {
            return res.status(400).json({ error: "Invalid or missing user IDs" });
        }

        if(userId === otherUserId) {
            return res.status(400).json({ error: "User IDs must be different" });
        }

        let conversationId = await findConversationBetweenTwoUsers(db, userId, otherUserId);

        if (!conversationId) {
            conversationId = await createConversation(db);
            await addUsersToConversation(db, conversationId, [userId, otherUserId]);
        }

        res.status(200).json({
            message: "✅ Conversation retrieved successfully",
            conversationId
        });


    } catch (error) {
        console.error("createOrGetconversations error:", error);
        return res.status(500).json({ error: "Error del servidor", detail: error.message });
    }
};

export const getMyconversations =  async (req, res) => {
    try {
        const userId = parseInt(req.query.id, 10);

        

        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid or missing user ID" });
        }

        const conversations = await getUserConversations(db, userId);

        res.status(200).json({
            message: "✅ Conversations retrieved successfully",
            conversations
        });
    } catch (error) {
        console.error("getMyconversations error:", error);
        return res.status(500).json({ error: "Error del servidor", detail: error.message });
    }
}

export const getConversationsMessges =  async (req, res)=>{
    try {
        const conversationId = parseInt(req.params.id, 10);
        const userId = parseInt(req.query.uid, 10);
        

        if(isNaN(userId)){
            return res.status(400).json({ error: "Invalid or missing user ID" });
    }

        if(isNaN(conversationId)){
            return res.status(400).json({ error: "Invalid or missing conversation ID" });
    }

        if (!userId || !conversationId) {
      return res.status(400).json({ error: "user_id y conversation_id requeridos" });
    }


        const limit = Math.max(parseInt(req.query.limit) || 50, 1);
        const offset = Math.max(parseInt(req.query.offset) || 0, 1);

        const allowed = await userBelongsToConversation(db, conversationId, userId)

        if(!allowed){
            return res.status(400).json({error: "no perteneces a esta conversacion"})
        }

        const message = await getMessagesByConversation(db, conversationId, limit, offset)

        return res.status(200).json({
            message
        })

    } catch (error) {
        console.error("getConversationMessage error:", error);
        return res.status(500).json({ error: "Error del servidor", detail: error.message });   
    }
}

export const sendMessageRest = async (req, res)=>{
    try {
        const {senderId, conversationId, content} = req.body;

        const sender_id = parseInt(senderId, 10);
        const conversation_id = parseInt(conversationId, 10);

        if(isNaN(sender_id)){
            return res.status(400).json({ error: "Invalid or missing sender ID" })
        }

        if(isNaN(conversation_id)){
            return res.status(400).json({error: "invalid or missing coversation ID"})
        }

        if(!content){
            return res.status(400).json({error: "content is require"})
        }

        const allowed = await userBelongsToConversation(db, conversation_id, sender_id)

        if(!allowed){
            return res.status(400).json({error: "no perteneces a esta conversacion"})
        }

        const message = await insertComment(db, conversation_id, senderId, content.trim())

        return res.status(201).json({
            message
        })
        
    } catch (error) {
        console.error("sendmessageRest error:", error);
        return res.status(500).json({ error: "Error del servidor", detail: error.message });
    }
}