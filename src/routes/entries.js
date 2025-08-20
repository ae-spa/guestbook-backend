import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { run, get, all } from "../db.js";
import {
  STATUS_APPROVED,
  STATUS_PENDING,
  STATUS_REJECTED,
  VALID_STATUSES,
} from "../constants.js";

const router = Router();

// POST /api/entries (글 작성 → PENDING)
router.post("/", async (req, res, next) => {
  try {
    const { name, message } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length === 0)
      return res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "name is required" },
        });
    if (!message || typeof message !== "string" || message.trim().length === 0)
      return res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "message is required" },
        });
    if (name.length > 30)
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "name must be <= 30 chars",
          },
        });
    if (message.length > 500)
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "message must be <= 500 chars",
          },
        });

    const now = new Date().toISOString();
    const { id } = await run(
      `INSERT INTO entries (name, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), message.trim(), STATUS_PENDING, now, now],
    );
    const row = await get(`SELECT * FROM entries WHERE id = ?`, [id]);
    return res.status(201).json({ data: row });
  } catch (e) {
    next(e);
  }
});

// GET /api/entries?status=&page=&pageSize=&q= (기본 APPROVED, 최신순, 검색, 페이지네이션)
router.get("/", async (req, res, next) => {
  try {
    const status = (req.query.status || STATUS_APPROVED)
      .toString()
      .toUpperCase();
    if (!VALID_STATUSES.includes(status))
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: `invalid status: ${status}`,
          },
        });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(req.query.pageSize || "10", 10)),
    );
    const q = (req.query.q || "").toString().trim();
    const like = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;

    const whereSearch = q ? `AND (name LIKE ? OR message LIKE ?)` : "";
    const baseParams = q ? [status, like, like] : [status];

    const [{ count }] = await all(
      `SELECT COUNT(*) AS count FROM entries WHERE status = ? ${q ? `AND (name LIKE ? OR message LIKE ?)` : ""}`,
      baseParams,
    );

    const offset = (page - 1) * pageSize;
    const rows = await all(
      `SELECT id, name, message, status, created_at, updated_at
       FROM entries
       WHERE status = ? ${whereSearch}
       ORDER BY datetime(created_at) DESC
       LIMIT ? OFFSET ?`,
      [...baseParams, pageSize, offset],
    );

    res.json({
      data: rows,
      meta: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/entries/:id/approve (관리자)
router.patch("/:id/approve", adminAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await get(`SELECT * FROM entries WHERE id = ?`, [id]);
    if (!row)
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "entry not found" } });
    if (row.status !== STATUS_PENDING)
      return res
        .status(409)
        .json({
          error: {
            code: "INVALID_STATE",
            message: "only PENDING can be approved",
          },
        });

    const now = new Date().toISOString();
    await run(`UPDATE entries SET status = ?, updated_at = ? WHERE id = ?`, [
      STATUS_APPROVED,
      now,
      id,
    ]);
    const updated = await get(`SELECT * FROM entries WHERE id = ?`, [id]);
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/entries/:id/reject (관리자)
router.patch("/:id/reject", adminAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await get(`SELECT * FROM entries WHERE id = ?`, [id]);
    if (!row)
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "entry not found" } });
    if (row.status !== STATUS_PENDING)
      return res
        .status(409)
        .json({
          error: {
            code: "INVALID_STATE",
            message: "only PENDING can be rejected",
          },
        });

    const now = new Date().toISOString();
    await run(`UPDATE entries SET status = ?, updated_at = ? WHERE id = ?`, [
      STATUS_REJECTED,
      now,
      id,
    ]);
    const updated = await get(`SELECT * FROM entries WHERE id = ?`, [id]);
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/entries/:id (관리자)
router.delete("/:id", adminAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await run(`DELETE FROM entries WHERE id = ?`, [id]);
    if (result.changes === 0)
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "entry not found" } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
