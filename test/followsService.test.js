import { normalizeSuggestedUser } from "../src/service/followsService.js";

describe("follows service suggestion helpers", () => {
  test("normalizes numeric counters and featured project metadata", () => {
    expect(
      normalizeSuggestedUser({
        user_id: 9,
        followers_count: "7",
        project_count: "2",
        featured_project_title: "  Social App Mobile  ",
        featured_project_status: "IN_PROGRESS",
        featured_project_technologies: " React Native, Expo ",
      })
    ).toEqual({
      user_id: 9,
      followers_count: 7,
      project_count: 2,
      total_posts: 0,
      dominant_post_type: null,
      dominant_post_type_count: 0,
      featured_project_title: "Social App Mobile",
      featured_project_status: "in_progress",
      featured_project_technologies: "React Native, Expo",
    });
  });

  test("cleans featured project fields when the user has no visible projects", () => {
    expect(
      normalizeSuggestedUser({
        user_id: 12,
        followers_count: null,
        project_count: null,
        featured_project_title: null,
        featured_project_status: "LAUNCHED",
        featured_project_technologies: null,
      })
    ).toEqual({
      user_id: 12,
      followers_count: 0,
      project_count: 0,
      total_posts: 0,
      dominant_post_type: null,
      dominant_post_type_count: 0,
      featured_project_title: "",
      featured_project_status: "",
      featured_project_technologies: "",
    });
  });
});
