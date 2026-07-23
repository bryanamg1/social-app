export const POST_TYPES = Object.freeze({
  PERSONAL_UPDATE: "personal_update",
  PROJECT: "project",
  QUESTION: "question",
  LEARNING: "learning",
  HELP: "help",
  COLLABORATION: "collaboration",
  LAUNCH: "launch",
});

export const FEED_POST_TYPES_ORDER = Object.freeze([
  POST_TYPES.PERSONAL_UPDATE,
  POST_TYPES.PROJECT,
  POST_TYPES.QUESTION,
  POST_TYPES.LEARNING,
  POST_TYPES.HELP,
  POST_TYPES.COLLABORATION,
  POST_TYPES.LAUNCH,
]);

export const DEFAULT_POST_TYPE = POST_TYPES.PERSONAL_UPDATE;

export const VALID_POST_TYPES = new Set(FEED_POST_TYPES_ORDER);

export const normalizePostType = (value) => {
  const normalizedValue = `${value ?? ""}`.trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_POST_TYPE;
  }

  return VALID_POST_TYPES.has(normalizedValue)
    ? normalizedValue
    : null;
};
