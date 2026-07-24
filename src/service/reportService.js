import { getDB } from "../config/db.js";

export const REPORT_TARGET_TYPES = {
  USER: "user",
  POST: "post",
  COMMENT: "comment",
};

export const REPORT_REASON_CODES = {
  SPAM: "spam",
  HARASSMENT: "harassment",
  HATE: "hate",
  IMPERSONATION: "impersonation",
  MISINFORMATION: "misinformation",
  OTHER: "other",
};

export const REPORT_STATUSES = {
  PENDING: "pending",
  REVIEWED: "reviewed",
  DISMISSED: "dismissed",
  ACTIONED: "actioned",
};

const normalizeValue = (value) => String(value ?? "").trim().toLowerCase();

export const normalizeReportPayload = (payload = {}) => {
  const targetType = normalizeValue(payload.target_type ?? payload.targetType);
  const reasonCode = normalizeValue(payload.reason_code ?? payload.reasonCode);
  const details = String(payload.details ?? "").trim();
  const targetId = Number.parseInt(payload.target_id ?? payload.targetId, 10);

  return {
    target_type: Object.values(REPORT_TARGET_TYPES).includes(targetType)
      ? targetType
      : null,
    target_id: Number.isInteger(targetId) && targetId > 0 ? targetId : null,
    reason_code: Object.values(REPORT_REASON_CODES).includes(reasonCode)
      ? reasonCode
      : null,
    details,
  };
};

export const normalizeReportStatus = (value) => {
  const status = normalizeValue(value);

  return Object.values(REPORT_STATUSES).includes(status) ? status : null;
};

const resolveTargetLookup = (targetType) => {
  switch (targetType) {
    case REPORT_TARGET_TYPES.USER:
      return {
        table: "users",
        idField: "user_id",
        ownerField: "user_id",
      };
    case REPORT_TARGET_TYPES.POST:
      return {
        table: "posts",
        idField: "post_id",
        ownerField: "user_id",
      };
    case REPORT_TARGET_TYPES.COMMENT:
      return {
        table: "comments",
        idField: "comment_id",
        ownerField: "user_id",
      };
    default:
      return null;
  }
};

export const getReportTarget = async (db, { targetType, targetId }) => {
  const database = db || getDB();
  const targetLookup = resolveTargetLookup(targetType);

  if (!targetLookup) {
    return null;
  }

  const [rows] = await database.query(
    `
      SELECT ${targetLookup.idField} AS target_id, ${targetLookup.ownerField} AS owner_user_id
      FROM ${targetLookup.table}
      WHERE ${targetLookup.idField} = ?
      LIMIT 1
    `,
    [targetId]
  );

  return rows[0] ?? null;
};

export const findPendingReport = async (
  db,
  { reporterUserId, targetType, targetId }
) => {
  const database = db || getDB();
  const [rows] = await database.query(
    `
      SELECT report_id, status
      FROM content_reports
      WHERE reporter_user_id = ?
        AND target_type = ?
        AND target_id = ?
        AND status = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [reporterUserId, targetType, targetId, REPORT_STATUSES.PENDING]
  );

  return rows[0] ?? null;
};

export const createContentReport = async (db, report) => {
  const database = db || getDB();
  const [result] = await database.query(
    `
      INSERT INTO content_reports (
        reporter_user_id,
        target_type,
        target_id,
        reason_code,
        details,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      report.reporter_user_id,
      report.target_type,
      report.target_id,
      report.reason_code,
      report.details || null,
      REPORT_STATUSES.PENDING,
    ]
  );

  return result.insertId;
};

export const getReportsByReporter = async (db, reporterUserId) => {
  const database = db || getDB();
  const [rows] = await database.query(
    `
      SELECT
        cr.report_id,
        cr.target_type,
        cr.target_id,
        cr.reason_code,
        cr.details,
        cr.status,
        cr.created_at,
        cr.updated_at
      FROM content_reports cr
      WHERE cr.reporter_user_id = ?
      ORDER BY cr.created_at DESC
    `,
    [reporterUserId]
  );

  return rows;
};

export const getModerationQueue = async (db, status = REPORT_STATUSES.PENDING) => {
  const database = db || getDB();
  const normalizedStatus = normalizeReportStatus(status) ?? REPORT_STATUSES.PENDING;
  const [rows] = await database.query(
    `
      SELECT
        cr.report_id,
        cr.reporter_user_id,
        reporter.user_name AS reporter_user_name,
        cr.target_type,
        cr.target_id,
        cr.reason_code,
        cr.details,
        cr.status,
        cr.created_at,
        cr.updated_at,
        cr.reviewed_by_user_id,
        reviewer.user_name AS reviewed_by_user_name,
        cr.resolution_notes,
        target_user.user_name AS target_user_name,
        target_post.content AS target_post_content,
        target_comment.comment_text AS target_comment_content
      FROM content_reports cr
      JOIN users reporter
        ON reporter.user_id = cr.reporter_user_id
      LEFT JOIN users reviewer
        ON reviewer.user_id = cr.reviewed_by_user_id
      LEFT JOIN users target_user
        ON cr.target_type = 'user' AND target_user.user_id = cr.target_id
      LEFT JOIN posts target_post
        ON cr.target_type = 'post' AND target_post.post_id = cr.target_id
      LEFT JOIN comments target_comment
        ON cr.target_type = 'comment' AND target_comment.comment_id = cr.target_id
      WHERE cr.status = ?
      ORDER BY cr.created_at ASC
    `,
    [normalizedStatus]
  );

  return rows;
};

export const updateReportModerationStatus = async (
  db,
  { reportId, status, reviewedByUserId, resolutionNotes = null }
) => {
  const database = db || getDB();
  await database.query(
    `
      UPDATE content_reports
      SET status = ?,
          reviewed_by_user_id = ?,
          resolution_notes = ?,
          updated_at = NOW()
      WHERE report_id = ?
    `,
    [status, reviewedByUserId, resolutionNotes, reportId]
  );

  const [rows] = await database.query(
    `
      SELECT
        report_id,
        target_type,
        target_id,
        reason_code,
        details,
        status,
        reviewed_by_user_id,
        resolution_notes,
        updated_at
      FROM content_reports
      WHERE report_id = ?
      LIMIT 1
    `,
    [reportId]
  );

  return rows[0] ?? null;
};
