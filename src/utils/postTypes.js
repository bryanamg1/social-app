export const POST_TYPES = Object.freeze({
  PERSONAL_UPDATE: "personal_update",
  PROJECT: "project",
  QUESTION: "question",
  LEARNING: "learning",
  HELP: "help",
  COLLABORATION: "collaboration",
  LAUNCH: "launch",
});

export const DEFAULT_POST_TYPE = POST_TYPES.PERSONAL_UPDATE;

export const VALID_POST_TYPES = new Set(Object.values(POST_TYPES));

export const normalizePostType = (value) => {
  const normalizedValue = `${value ?? ""}`.trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_POST_TYPE;
  }

  return VALID_POST_TYPES.has(normalizedValue)
    ? normalizedValue
    : null;
};
