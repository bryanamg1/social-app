import { getDB } from "../config/db.js";
import { AppError } from "../utils/utils.js";
import { getAuthenticatedUserId } from "../utils/authHelpers.js";
import {
  createContentReport,
  findPendingReport,
  getModerationQueue,
  getReportsByReporter,
  getReportTarget,
  normalizeReportPayload,
  normalizeReportStatus,
  REPORT_STATUSES,
  updateReportModerationStatus,
} from "../service/reportService.js";

const STATUS_CODES = {
  USER_NOT_FOUND: "USER_NOT_FOUND",
  POST_NOT_FOUND: "POST_NOT_FOUND",
  COMMENT_NOT_FOUND: "COMMENT_NOT_FOUND",
};

const resolveMissingTargetCode = (targetType) => {
  switch (targetType) {
    case "user":
      return STATUS_CODES.USER_NOT_FOUND;
    case "post":
      return STATUS_CODES.POST_NOT_FOUND;
    case "comment":
      return STATUS_CODES.COMMENT_NOT_FOUND;
    default:
      return "REPORT_TARGET_NOT_FOUND";
  }
};

export const createReport = async (req, res, next) => {
  try {
    const db = getDB();
    const reporterUserId = getAuthenticatedUserId(req);

    if (!reporterUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    const normalizedPayload = normalizeReportPayload(req.body);

    if (
      !normalizedPayload.target_type ||
      !normalizedPayload.target_id ||
      !normalizedPayload.reason_code
    ) {
      return next(
        new AppError({
          code: "REPORT_PAYLOAD_INVALID",
          message: "El reporte no tiene un formato valido",
          status: 400,
          details: req.body ?? null,
        })
      );
    }

    const target = await getReportTarget(db, {
      targetType: normalizedPayload.target_type,
      targetId: normalizedPayload.target_id,
    });

    if (!target) {
      return next(
        new AppError({
          code: resolveMissingTargetCode(normalizedPayload.target_type),
          message: "El contenido que intentas reportar no existe",
          status: 404,
          details: normalizedPayload,
        })
      );
    }

    if (Number(target.owner_user_id) === Number(reporterUserId)) {
      return next(
        new AppError({
          code: "REPORT_SELF_FORBIDDEN",
          message: "No puedes reportar tu propio contenido",
          status: 400,
          details: normalizedPayload,
        })
      );
    }

    const pendingReport = await findPendingReport(db, {
      reporterUserId,
      targetType: normalizedPayload.target_type,
      targetId: normalizedPayload.target_id,
    });

    if (pendingReport) {
      return res.status(200).json({
        ok: true,
        message: "Ya existe un reporte pendiente para este contenido",
        data: {
          report_id: pendingReport.report_id,
          status: pendingReport.status,
        },
      });
    }

    const reportId = await createContentReport(db, {
      reporter_user_id: reporterUserId,
      ...normalizedPayload,
    });

    return res.status(201).json({
      ok: true,
      message: "Reporte enviado correctamente",
      data: {
        report_id: reportId,
        status: REPORT_STATUSES.PENDING,
      },
    });
  } catch (error) {
    return next(
      new AppError({
        code: "REPORT_CREATE_FAILED",
        message: "No se pudo crear el reporte",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const getMyReports = async (req, res, next) => {
  try {
    const db = getDB();
    const reporterUserId = getAuthenticatedUserId(req);

    if (!reporterUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    const reports = await getReportsByReporter(db, reporterUserId);

    return res.status(200).json({
      ok: true,
      message: "Reportes obtenidos correctamente",
      data: reports,
    });
  } catch (error) {
    return next(
      new AppError({
        code: "REPORTS_READ_FAILED",
        message: "No se pudieron obtener los reportes",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const getReportsQueue = async (req, res, next) => {
  try {
    const db = getDB();
    const authenticatedUserId = getAuthenticatedUserId(req);

    if (!authenticatedUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    const queue = await getModerationQueue(
      db,
      req.query.status ?? REPORT_STATUSES.PENDING
    );

    return res.status(200).json({
      ok: true,
      message: "Cola de moderacion obtenida correctamente",
      data: queue,
    });
  } catch (error) {
    return next(
      new AppError({
        code: "REPORT_QUEUE_READ_FAILED",
        message: "No se pudo obtener la cola de moderacion",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const updateReportStatus = async (req, res, next) => {
  try {
    const db = getDB();
    const reviewerUserId = getAuthenticatedUserId(req);
    const reportId = Number.parseInt(req.params.reportId, 10);
    const nextStatus = normalizeReportStatus(req.body?.status);
    const resolutionNotes = String(req.body?.resolution_notes ?? "").trim();

    if (!reviewerUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return next(
        new AppError({
          code: "REPORT_ID_INVALID",
          message: "El ID del reporte es invalido",
          status: 400,
          details: { param: req.params.reportId },
        })
      );
    }

    if (!nextStatus || nextStatus === REPORT_STATUSES.PENDING) {
      return next(
        new AppError({
          code: "REPORT_STATUS_INVALID",
          message: "El estado de moderacion no es valido",
          status: 400,
          details: req.body ?? null,
        })
      );
    }

    const updatedReport = await updateReportModerationStatus(db, {
      reportId,
      status: nextStatus,
      reviewedByUserId: reviewerUserId,
      resolutionNotes: resolutionNotes || null,
    });

    if (!updatedReport) {
      return next(
        new AppError({
          code: "REPORT_NOT_FOUND",
          message: "El reporte no existe",
          status: 404,
          details: { reportId },
        })
      );
    }

    return res.status(200).json({
      ok: true,
      message: "Estado de reporte actualizado correctamente",
      data: updatedReport,
    });
  } catch (error) {
    return next(
      new AppError({
        code: "REPORT_STATUS_UPDATE_FAILED",
        message: "No se pudo actualizar el estado del reporte",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};
