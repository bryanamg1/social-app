import { getDB } from "../config/db.js";

export const getProjectsByUserId = async (db, userId) => {
  const database = db || getDB();
  const [rows] = await database.query(
    `
      SELECT
        project_id,
        user_id,
        title,
        summary,
        technologies,
        repo_url,
        demo_url,
        status,
        created_at,
        updated_at
      FROM user_projects
      WHERE user_id = ?
      ORDER BY updated_at DESC, created_at DESC, project_id DESC
    `,
    [userId]
  );

  return rows;
};

export const createProject = async (
  db,
  { userId, title, summary, technologies, repo_url, demo_url, status }
) => {
  const database = db || getDB();
  const [result] = await database.query(
    `
      INSERT INTO user_projects
        (user_id, title, summary, technologies, repo_url, demo_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [userId, title, summary || null, technologies || null, repo_url, demo_url, status]
  );

  const [rows] = await database.query(
    `
      SELECT
        project_id,
        user_id,
        title,
        summary,
        technologies,
        repo_url,
        demo_url,
        status,
        created_at,
        updated_at
      FROM user_projects
      WHERE project_id = ?
      LIMIT 1
    `,
    [result.insertId]
  );

  return rows[0] ?? null;
};

export const updateProject = async (
  db,
  { projectId, userId, title, summary, technologies, repo_url, demo_url, status }
) => {
  const database = db || getDB();
  const [result] = await database.query(
    `
      UPDATE user_projects
      SET
        title = ?,
        summary = ?,
        technologies = ?,
        repo_url = ?,
        demo_url = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ? AND user_id = ?
    `,
    [
      title,
      summary || null,
      technologies || null,
      repo_url,
      demo_url,
      status,
      projectId,
      userId,
    ]
  );

  if (!result?.affectedRows) {
    return null;
  }

  const [rows] = await database.query(
    `
      SELECT
        project_id,
        user_id,
        title,
        summary,
        technologies,
        repo_url,
        demo_url,
        status,
        created_at,
        updated_at
      FROM user_projects
      WHERE project_id = ?
      LIMIT 1
    `,
    [projectId]
  );

  return rows[0] ?? null;
};

export const deleteProject = async (db, { projectId, userId }) => {
  const database = db || getDB();
  const [result] = await database.query(
    "DELETE FROM user_projects WHERE project_id = ? AND user_id = ?",
    [projectId, userId]
  );

  return result;
};
