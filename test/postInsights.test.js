import { normalizePostTypeInsights } from "../src/service/postInsightsService.js";
import { POST_TYPES } from "../src/utils/postTypes.js";

describe("post insights service", () => {
  test("builds ordered summary and dominant post type", () => {
    expect(
      normalizePostTypeInsights([
        { post_type: POST_TYPES.PROJECT, total: "3" },
        { post_type: POST_TYPES.HELP, total: 1 },
      ])
    ).toEqual({
      summary: [
        { post_type: POST_TYPES.PERSONAL_UPDATE, total: 0 },
        { post_type: POST_TYPES.PROJECT, total: 3 },
        { post_type: POST_TYPES.QUESTION, total: 0 },
        { post_type: POST_TYPES.LEARNING, total: 0 },
        { post_type: POST_TYPES.HELP, total: 1 },
        { post_type: POST_TYPES.COLLABORATION, total: 0 },
        { post_type: POST_TYPES.LAUNCH, total: 0 },
      ],
      total_posts: 4,
      dominant_post_type: POST_TYPES.PROJECT,
      dominant_post_type_count: 3,
    });
  });

  test("returns zeroed insight data when there is no activity", () => {
    expect(normalizePostTypeInsights()).toEqual({
      summary: [
        { post_type: POST_TYPES.PERSONAL_UPDATE, total: 0 },
        { post_type: POST_TYPES.PROJECT, total: 0 },
        { post_type: POST_TYPES.QUESTION, total: 0 },
        { post_type: POST_TYPES.LEARNING, total: 0 },
        { post_type: POST_TYPES.HELP, total: 0 },
        { post_type: POST_TYPES.COLLABORATION, total: 0 },
        { post_type: POST_TYPES.LAUNCH, total: 0 },
      ],
      total_posts: 0,
      dominant_post_type: null,
      dominant_post_type_count: 0,
    });
  });
});
