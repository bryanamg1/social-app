import db from "../config/db.js";

export const followUser = async (req, res) =>{
    try{
        const followerid = req.params.id;
        const followidUser = req.user.user_id;
        if (Number(followidUser) === Number(followerid)) {
            return res.status(400).json({msg:"No puedes seguirte"});
        }
        const [userExists] = await db.query("SELECT * FROM users WHERE user_id = ?",
            [followerid]);

        if (userExists.length === 0) {
            return res.status(404).json({msg:"Este usuario no existe"});
        }
        const [following] = await db.query("SELECT * FROM follows WHERE follower_id = ? AND followed_id = ?", 
            [followidUser, followerid]);

        if (following.length > 0) {
            return res.status(409).json({msg: "Ya estas siguiendo a este usuario "});
        }

        await db.query("INSERT INTO follows (follower_id, followed_id, created_at) Values (?,?,NOW())",
            [followidUser, followerid]
        );
        res.status(201).json({msg:"Seguiendo al usuario"});
    } catch(error){
        res.status(500).json({msg:"error al seguir"});
        console.error(error);
    }
};

export const unfollowUser = async (req, res)=>{
    try{
        const unfollowerid = req.params.id;
        const unfollowidUser = req.user.user_id;

        const [userExists] = await db.query("SELECT * FROM users WHERE user_id = ?",
            [unfollowerid]);

        if (userExists.length === 0) {
            return res.status(404).json({msg:"Este usuario no existe"});
        }

        await db.query ("DELETE FROM follows WHERE follower_id = ? AND followed_id = ?",
            [unfollowidUser, unfollowerid]
        );
        res.status(200).json({msg:"Has dejado de seguir al usuario"});
    }catch(error){
        res.status(500).json({msg:"Error al dejar de seguir"});
        console.error(error);
        
    }

};


