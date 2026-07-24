import { jest } from "@jest/globals";

import {
  createContentReport,
  findPendingReport,
  getModerationQueue,
  normalizeReportPayload,
  normalizeReportStatus,
  REPORT_STATUSES,
} from "../src/service/reportService.js";

describe("report service - phase 3 trust controls", () => {
  test("normalizes valid report payload values", () => {
    expect(
      normalizeReportPayload({
        target_type: "POST",
        target_id: "8",
        reason_code: "spam",
        details: "  contenido repetido  ",
      })
    ).toEqual({
      target_type: "post",
      target_id: 8,
      reason_code: "spam",
      details: "contenido repetido",
    });
  });

  test("normalizes moderation statuses", () => {
    expect(normalizeReportStatus("ACTIONED")).toBe("actioned");
    expect(normalizeReportStatus("invalid")).toBeNull();
  });

  test("findPendingReport reads the latest pending match", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([
        [
          {
            report_id: 17,
            status: REPORT_STATUSES.PENDING,
          },
        ],
      ]),
    };

    const result = await findPendingReport(db, {
      reporterUserId: 4,
      targetType: "post",
      targetId: 9,
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM content_reports"),
      [4, "post", 9, REPORT_STATUSES.PENDING]
    );
    expect(result).toEqual({
      report_id: 17,
      status: REPORT_STATUSES.PENDING,
    });
  });

  test("createContentReport persists a pending report", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([{ insertId: 22 }]),
    };

    const result = await createContentReport(db, {
      reporter_user_id: 4,
      target_type: "comment",
      target_id: 13,
      reason_code: "harassment",
      details: "lenguaje agresivo",
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO content_reports"),
      [4, "comment", 13, "harassment", "lenguaje agresivo", "pending"]
    );
    expect(result).toBe(22);
  });

  test("getModerationQueue defaults to pending status", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([[{ report_id: 1 }]]),
    };

    const result = await getModerationQueue(db);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE cr.status = ?"),
      ["pending"]
    );
    expect(result).toEqual([{ report_id: 1 }]);
  });
});
