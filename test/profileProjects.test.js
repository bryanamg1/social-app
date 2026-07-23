import {
  DEFAULT_PROFILE_PROJECT_STATUS,
  PROFILE_PROJECT_STATUSES,
  buildNormalizedProjectPayload,
  normalizeProfileProjectStatus,
} from "../src/utils/profileProjects.js";

describe("profile projects utils", () => {
  test("uses default status when value is empty", () => {
    expect(normalizeProfileProjectStatus()).toBe(
      DEFAULT_PROFILE_PROJECT_STATUS
    );
  });

  test("normalizes valid project status values", () => {
    expect(normalizeProfileProjectStatus("LAUNCHED")).toBe(
      PROFILE_PROJECT_STATUSES.LAUNCHED
    );
  });

  test("returns null for invalid project status values", () => {
    expect(normalizeProfileProjectStatus("random")).toBeNull();
  });

  test("normalizes project payload and sanitizes invalid urls", () => {
    expect(
      buildNormalizedProjectPayload({
        title: "  Social App  ",
        summary: "  Proyecto portfolio  ",
        technologies: " React, Node ",
        repo_url: "https://github.com/example/repo",
        demo_url: "nota-url",
        status: "planned",
      })
    ).toEqual({
      title: "Social App",
      summary: "Proyecto portfolio",
      technologies: "React, Node",
      repo_url: "https://github.com/example/repo",
      demo_url: null,
      status: PROFILE_PROJECT_STATUSES.PLANNED,
    });
  });
});
