import { getDB } from "../config/db.js";

export const getSuggestedUsers = async (db, { currentUserId, limit }) => {
    const database = db || getDB();
    const normalizedLimit = Math.max(Number(limit) || 4, 1);

    const [rows] = await database.query(
        `
            SELECT
                u.user_id,
                u.user_name,
                u.email,
                u.avatar_url,
                u.bio,
                u.location,
                COALESCE(followers.followers_count, 0) AS followers_count
            FROM users u
            LEFT JOIN (
                SELECT followed_id, COUNT(*) AS followers_count
                FROM follows
                GROUP BY followed_id
            ) followers ON followers.followed_id = u.user_id
            WHERE u.user_id <> ?
              AND u.user_id NOT IN (
                  SELECT followed_id
                  FROM follows
                  WHERE follower_id = ?
              )
            ORDER BY followers_count DESC, u.created_at DESC
            LIMIT ?
        `,
        [currentUserId, currentUserId, normalizedLimit]
    );

    return rows;
};

export const getFollowingFeedPosts = async (
    db,
    { currentUserId, limit, offset }
) => {
    const database = db || getDB();

    const [rows] = await database.query(
        `
            SELECT
                p.post_id,
                p.user_id,
                p.content,
                p.image_url,
                p.created_at,
                u.user_name,
                u.avatar_url
            FROM posts p
            JOIN users u ON u.user_id = p.user_id
            WHERE p.user_id = ?
               OR p.user_id IN (
                    SELECT followed_id
                    FROM follows
                    WHERE follower_id = ?
               )
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `,
        [currentUserId, currentUserId, limit, offset]
    );

    return rows;
};

export const countFollowingFeedPosts = async (db, { currentUserId }) => {
    const database = db || getDB();

    const [rows] = await database.query(
        `
            SELECT COUNT(*) AS total
            FROM posts
            WHERE user_id = ?
               OR user_id IN (
                    SELECT followed_id
                    FROM follows
                    WHERE follower_id = ?
               )
        `,
        [currentUserId, currentUserId]
    );

    return Number(rows?.[0]?.total) || 0;
};
