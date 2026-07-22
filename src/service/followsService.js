import { getDB } from "../config/db.js";
import { PROFILE_PROJECT_STATUSES } from "../utils/profileProjects.js";
import { FEED_POST_TYPES_ORDER, normalizePostType } from "../utils/postTypes.js";

const SUGGESTED_PROJECT_STATUS_PRIORITY = [
    PROFILE_PROJECT_STATUSES.IN_PROGRESS,
    PROFILE_PROJECT_STATUSES.LAUNCHED,
    PROFILE_PROJECT_STATUSES.PLANNED,
    PROFILE_PROJECT_STATUSES.PAUSED,
];

const normalizeSuggestionValue = (value) => {
    return `${value ?? ""}`.trim();
};

export const normalizeSuggestedUser = (user) => {
    const projectCount = Number(user?.project_count) || 0;
    const rawDominantPostType = normalizeSuggestionValue(
        user?.dominant_post_type
    ).toLowerCase();
    const dominantPostType = rawDominantPostType
        ? normalizePostType(rawDominantPostType)
        : null;

    return {
        ...user,
        followers_count: Number(user?.followers_count) || 0,
        project_count: projectCount,
        total_posts: Number(user?.total_posts) || 0,
        dominant_post_type: dominantPostType,
        dominant_post_type_count: dominantPostType
            ? Number(user?.dominant_post_type_count) || 0
            : 0,
        featured_project_title: normalizeSuggestionValue(
            user?.featured_project_title
        ),
        featured_project_status: projectCount
            ? normalizeSuggestionValue(user?.featured_project_status).toLowerCase()
            : "",
        featured_project_technologies: normalizeSuggestionValue(
            user?.featured_project_technologies
        ),
    };
};

export const getSuggestedUsers = async (db, { currentUserId, limit }) => {
    const database = db || getDB();
    const normalizedLimit = Math.max(Number(limit) || 4, 1);
    const statusPriorityParams = [
        ...SUGGESTED_PROJECT_STATUS_PRIORITY,
        ...SUGGESTED_PROJECT_STATUS_PRIORITY,
        ...SUGGESTED_PROJECT_STATUS_PRIORITY,
    ];
    const postTypePriorityParams = [
        ...FEED_POST_TYPES_ORDER,
        ...FEED_POST_TYPES_ORDER,
    ];

    const [rows] = await database.query(
        `
            SELECT
                u.user_id,
                u.user_name,
                u.email,
                u.avatar_url,
                u.bio,
                u.location,
                COALESCE(followers.followers_count, 0) AS followers_count,
                COALESCE(project_meta.project_count, 0) AS project_count,
                COALESCE(post_meta.total_posts, 0) AS total_posts,
                post_meta.dominant_post_type,
                COALESCE(post_meta.dominant_post_type_count, 0) AS dominant_post_type_count,
                project_meta.featured_project_title,
                project_meta.featured_project_status,
                project_meta.featured_project_technologies
            FROM users u
            LEFT JOIN (
                SELECT followed_id, COUNT(*) AS followers_count
                FROM follows
                GROUP BY followed_id
            ) followers ON followers.followed_id = u.user_id
            LEFT JOIN (
                SELECT
                    up.user_id,
                    COUNT(*) AS project_count,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(
                            up.title
                            ORDER BY FIELD(up.status, ?, ?, ?, ?), up.updated_at DESC
                            SEPARATOR '||'
                        ),
                        '||',
                        1
                    ) AS featured_project_title,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(
                            up.status
                            ORDER BY FIELD(up.status, ?, ?, ?, ?), up.updated_at DESC
                            SEPARATOR '||'
                        ),
                        '||',
                        1
                    ) AS featured_project_status,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(
                            COALESCE(up.technologies, '')
                            ORDER BY FIELD(up.status, ?, ?, ?, ?), up.updated_at DESC
                            SEPARATOR '||'
                        ),
                        '||',
                        1
                    ) AS featured_project_technologies
                FROM user_projects up
                GROUP BY up.user_id
            ) project_meta ON project_meta.user_id = u.user_id
            LEFT JOIN (
                SELECT
                    counts.user_id,
                    SUM(counts.total) AS total_posts,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(
                            counts.post_type
                            ORDER BY counts.total DESC, FIELD(counts.post_type, ?, ?, ?, ?, ?, ?, ?)
                            SEPARATOR '||'
                        ),
                        '||',
                        1
                    ) AS dominant_post_type,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(
                            counts.total
                            ORDER BY counts.total DESC, FIELD(counts.post_type, ?, ?, ?, ?, ?, ?, ?)
                            SEPARATOR '||'
                        ),
                        '||',
                        1
                    ) AS dominant_post_type_count
                FROM (
                    SELECT user_id, post_type, COUNT(*) AS total
                    FROM posts
                    GROUP BY user_id, post_type
                ) counts
                GROUP BY counts.user_id
            ) post_meta ON post_meta.user_id = u.user_id
            WHERE u.user_id <> ?
              AND u.user_id NOT IN (
                  SELECT followed_id
                  FROM follows
                  WHERE follower_id = ?
              )
            ORDER BY followers_count DESC, project_count DESC, u.created_at DESC
            LIMIT ?
        `,
        [
            ...statusPriorityParams,
            ...postTypePriorityParams,
            currentUserId,
            currentUserId,
            normalizedLimit,
        ]
    );

    return rows.map(normalizeSuggestedUser);
};

export const getFollowingFeedPosts = async (
    db,
    { currentUserId, limit, offset, postType = null }
) => {
    const database = db || getDB();
    const params = [currentUserId, currentUserId];
    const postTypeClause = postType ? " AND p.post_type = ?" : "";

    if (postType) {
        params.push(postType);
    }

    const [rows] = await database.query(
        `
            SELECT
                p.post_id,
                p.user_id,
                p.content,
                p.image_url,
                p.post_type,
                p.created_at,
                u.user_name,
                u.avatar_url
            FROM posts p
            JOIN users u ON u.user_id = p.user_id
            WHERE (
                    p.user_id = ?
               OR p.user_id IN (
                    SELECT followed_id
                    FROM follows
                    WHERE follower_id = ?
               )
            )
              ${postTypeClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
    );

    return rows;
};

export const countFollowingFeedPosts = async (
    db,
    { currentUserId, postType = null }
) => {
    const database = db || getDB();
    const params = [currentUserId, currentUserId];
    const postTypeClause = postType ? " AND post_type = ?" : "";

    if (postType) {
        params.push(postType);
    }

    const [rows] = await database.query(
        `
            SELECT COUNT(*) AS total
            FROM posts
            WHERE (
                    user_id = ?
               OR user_id IN (
                    SELECT followed_id
                    FROM follows
                    WHERE follower_id = ?
               )
            )
              ${postTypeClause}
        `,
        params
    );

    return Number(rows?.[0]?.total) || 0;
};
