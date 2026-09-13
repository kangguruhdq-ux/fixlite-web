import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateJwt, AuthRequest, requireRole, optionalJwt } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// GET /reports
router.get('/', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin', 'Analyst']), (req: AuthRequest, res: Response) => {
  try {
    const { status, type, page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM reports WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const reports = db.prepare(query).all(...params);

    return res.json({
      data: reports.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        type: r.type,
        title: r.title,
        description: r.description,
        imageUrl: r.image_url,
        status: r.status,
        assignedAdminId: r.assigned_admin_id,
        resolutionNote: r.resolution_note,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /reports
router.post('/', optionalJwt, (req: AuthRequest, res: Response) => {
  try {
    const { type, title, description, imageUrl } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const id = `rep_${Date.now()}`;
    const now = new Date().toISOString();
    const userId = req.user?.id || null;
    const userName = req.user?.name || 'Guest User';

    db.prepare(`
      INSERT INTO reports (id, user_id, user_name, type, title, description, image_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
    `).run(id, userId, userName, type || 'Bug aplikasi', title, description, imageUrl || null, now, now);

    return res.status(201).json({ id, title, status: 'Pending', createdAt: now });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /reports/:id
router.patch('/:id', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote, assignedAdminId } = req.body;
    const old = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as any;
    if (!old) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (resolutionNote !== undefined) { updates.push('resolution_note = ?'); params.push(resolutionNote); }
    if (assignedAdminId !== undefined) { updates.push('assigned_admin_id = ?'); params.push(assignedAdminId); }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    recordAuditLog(req, 'UPDATE_REPORT', 'REPORT', id, old, req.body);
    return res.json({ message: 'Laporan diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /reports/:id
router.delete('/:id', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const old = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

    db.prepare('DELETE FROM reports WHERE id = ?').run(id);
    recordAuditLog(req, 'DELETE_REPORT', 'REPORT', id, old, null);

    return res.json({ message: 'Laporan berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
