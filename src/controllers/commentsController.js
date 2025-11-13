import db from "../config/db";

export const addComment = async (req, res) =>{
    try {
        
    } catch (error) {
        res.status(500).json({ error: "Error inserting comment" });
    }
}