import {
  DEFAULT_POST_TYPE,
  POST_TYPES,
  normalizePostType,
} from "../src/utils/postTypes.js";

describe("post types utils", () => {
  test("uses personal_update as default when no value is provided", () => {
    expect(normalizePostType()).toBe(DEFAULT_POST_TYPE);
    expect(DEFAULT_POST_TYPE).toBe(POST_TYPES.PERSONAL_UPDATE);
  });

  test("normalizes a valid value", () => {
    expect(normalizePostType("PROJECT")).toBe(POST_TYPES.PROJECT);
    expect(normalizePostType(" collaboration ")).toBe(POST_TYPES.COLLABORATION);
  });

  test("returns null for invalid values", () => {
    expect(normalizePostType("random")).toBeNull();
  });
});
