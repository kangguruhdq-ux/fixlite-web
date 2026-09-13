import { z } from 'zod';
import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateJwt, optionalJwt, AuthRequest, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// GET /presets (Background presets)
router.get('/', optionalJwt, (req:AuthRequest, res: Response) => {
  try {
    const all = req.query.all === 'true' && req.user && ['Super Admin','Admin','Content Admin'].includes(req.user.role);
    const presets = db.prepare('SELECT * FROM presets ' + (all ? '' : 'WHERE is_active = 1 ') + 'ORDER BY created_at ASC').all();
    const filters = db.prepare('SELECT * FROM photo_filters ' + (all ? '' : 'WHERE is_active = 1 ') + 'ORDER BY created_at ASC').all();
    const aspectRatios = db.prepare('SELECT * FROM aspect_ratios WHERE is_active = 1').all();

    return res.json({
      presets: presets.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        value: p.value,
        blurLevel: p.blur_level,
        previewUrl: p.preview_url,
        isActive: Boolean(p.is_active),
      })),
      filters: filters.map((f: any) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        settings: JSON.parse(f.settings_json),
        previewUrl: f.preview_url,
        isActive: Boolean(f.is_active),
      })),
      aspectRatios: aspectRatios.map((a: any) => ({
        id: a.id,
        name: a.name,
        ratio: a.ratio,
        width: a.width,
        height: a.height,
        isActive: Boolean(a.is_active),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /presets (Create background preset)
router.post('/', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Content Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { name, type, value, blurLevel = 0 } = req.body;
    if (!name || !type || !value) {
      return res.status(400).json({ error: 'Name, type, and value are required' });
    }

    const id = `pre_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO presets (id, name, type, value, blur_level, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, name, type, value, blurLevel, now);

    recordAuditLog(req, 'CREATE_PRESET', 'PRESET', id, null, { name, type, value });
    return res.status(201).json({ id, name, type, value, blurLevel, isActive: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /presets/:id
router.patch('/:id', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Content Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, value, type, blurLevel, isActive } = req.body;
    const old = db.prepare('SELECT * FROM presets WHERE id = ?').get(id);
    if (!old) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (type !== undefined && !['solid','gradient','image'].includes(type)) return res.status(400).json({error:'Tipe preset tidak valid.'});
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (value !== undefined) { updates.push('value = ?'); params.push(value); }
    if (blurLevel !== undefined) { updates.push('blur_level = ?'); params.push(blurLevel); }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE presets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    recordAuditLog(req, 'UPDATE_PRESET', 'PRESET', id, old, req.body);
    return res.json({ message: 'Preset updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /presets/:id
router.delete('/:id', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Content Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const old = db.prepare('SELECT * FROM presets WHERE id = ?').get(id);
    if (!old) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    db.prepare('DELETE FROM presets WHERE id = ?').run(id);
    recordAuditLog(req, 'DELETE_PRESET', 'PRESET', id, old, null);
    return res.json({ message: 'Preset deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /presets/filters (Create Photo Filter)
router.post('/filters', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Content Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { name, category = 'General', settings } = req.body;
    if (!name || !settings) {
      return res.status(400).json({ error: 'Name and filter settings are required' });
    }

    const id = `filt_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO photo_filters (id, name, category, settings_json, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(id, name, category, JSON.stringify(settings), now);

    recordAuditLog(req, 'CREATE_FILTER', 'FILTER', id, null, { name, category });
    return res.status(201).json({ id, name, category, settings, isActive: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


const filterSchema = z.object({ name:z.string().trim().min(1).max(100).optional(), category:z.string().max(80).optional(), settings:z.record(z.unknown()).optional(), isActive:z.boolean().optional() }).strict();
router.patch('/filters/:id', authenticateJwt, requireRole(['Super Admin','Admin','Content Admin']), (req:AuthRequest,res:Response) => {
 const parsed = filterSchema.safeParse(req.body);
 if(!parsed.success) return res.status(400).json({error:'Data filter tidak valid.'});
 const old = db.prepare('SELECT * FROM photo_filters WHERE id = ?').get(req.params.id) as any;
 if(!old) return res.status(404).json({error:'Filter tidak ditemukan.'});
 const data = parsed.data;
 db.prepare('UPDATE photo_filters SET name = ?, category = ?, settings_json = ?, is_active = ? WHERE id = ?').run(data.name ?? old.name,data.category ?? old.category,data.settings ? JSON.stringify(data.settings) : old.settings_json,data.isActive === undefined ? old.is_active : Number(data.isActive),old.id);
 recordAuditLog(req,'UPDATE_FILTER','FILTER',old.id,null,data);
 return res.json({message:'Filter diperbarui.'});
});
router.delete('/filters/:id', authenticateJwt, requireRole(['Super Admin','Admin','Content Admin']), (req:AuthRequest,res:Response) => {
 const old = db.prepare('SELECT * FROM photo_filters WHERE id = ?').get(req.params.id) as any;
 if(!old) return res.status(404).json({error:'Filter tidak ditemukan.'});
 db.prepare('DELETE FROM photo_filters WHERE id = ?').run(old.id); recordAuditLog(req,'DELETE_FILTER','FILTER',old.id,{name:old.name},null);
 return res.json({message:'Filter dihapus.'});
});
export default router;
