import { getDB } from "../config/db.js";
import { FEED_POST_TYPES_ORDER, normalizePostType } from "../utils/postTypes.js";

const buildSummaryMap = () => {
  return FEED_POST_TYPES_ORDER.reduce((accumulator, postType) => {
    accumulator[postType] = 0;
    return accumulator;
  }, {});
};

export const normalizePostTypeInsights = (rows = []) => {
  const summaryMap = buildSummaryMap();

  rows.forEach((row) => {
    const postType = normalizePostType(row?.post_type);

    if (!postType) {
      return;
    }

    summaryMap[postType] = Number(row?.total) || 0;
  });

  const summary = FEED_POST_TYPES_ORDER.map((postType) => ({
    post_type: postType,
    total: summaryMap[postType],
  }));

  const dominantEntry = summary.reduce((currentMax, currentEntry) => {
    if (!currentMax) {
      return currentEntry;
    }

    return currentEntry.total > currentMax.total ? currentEntry : currentMax;
  }, null);

  const totalPosts = summary.reduce((total, entry) => total + entry.total, 0);

  return {
    summary,
    total_posts: totalPosts,
    dominant_post_type: dominantEntry?.total ? dominantEntry.post_type : null,
    dominant_post_type_count: dominantEntry?.total || 0,
  };
};

export const getPostTypeInsightsByUserId = async (db, userId) => {
  const database = db || getDB();
  const [rows] = await database.query(
    `
      SELECT post_type, COUNT(*) AS total
      FROM posts
      WHERE user_id = ?
      GROUP BY post_type
    `,
    [userId]
  );

  return normalizePostTypeInsights(rows);
};
