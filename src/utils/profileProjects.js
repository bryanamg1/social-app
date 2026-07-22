export const PROFILE_PROJECT_STATUSES = Object.freeze({
  PLANNED: "planned",
  IN_PROGRESS: "in_progress",
  LAUNCHED: "launched",
  PAUSED: "paused",
});

export const DEFAULT_PROFILE_PROJECT_STATUS =
  PROFILE_PROJECT_STATUSES.IN_PROGRESS;

const VALID_PROFILE_PROJECT_STATUSES = new Set(
  Object.values(PROFILE_PROJECT_STATUSES)
);

const normalizeText = (value) => {
  return `${value ?? ""}`.trim();
};

const normalizeOptionalUrl = (value) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedValue);
    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const normalizeProfileProjectStatus = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_PROFILE_PROJECT_STATUS;
  }

  return VALID_PROFILE_PROJECT_STATUSES.has(normalizedValue)
    ? normalizedValue
    : null;
};

export const buildNormalizedProjectPayload = (projectData = {}) => {
  const title = normalizeText(projectData.title);
  const summary = normalizeText(projectData.summary);
  const technologies = normalizeText(projectData.technologies);
  const repoUrl = normalizeOptionalUrl(projectData.repo_url ?? projectData.repoUrl);
  const demoUrl = normalizeOptionalUrl(projectData.demo_url ?? projectData.demoUrl);
  const status = normalizeProfileProjectStatus(projectData.status);

  return {
    title,
    summary,
    technologies,
    repo_url: repoUrl,
    demo_url: demoUrl,
    status,
  };
};
