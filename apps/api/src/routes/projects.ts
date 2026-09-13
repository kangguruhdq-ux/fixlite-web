import { z } from 'zod';
import { Router, Response } from 'express';
import { db } from '../db';
import { optionalJwt, authenticateJwt, AuthRequest, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// GET /projects
router.get('/', optionalJwt, (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = '1', limit = '12' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const isAdmin = req.user && ['Super Admin', 'Admin', 'Analyst'].includes(req.user.role);

    let query = `
      SELECT p.*, u.name as user_name 
      FROM projects p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!isAdmin || req.query.scope === 'mine') {
      if (!req.user) {
        return res.json({ data: [], pagination: { page: 1, limit: limitNum, total: 0, totalPages: 0 } });
      }
      query += ' AND p.user_id = ?';
      params.push(req.user.id);
    }

    if (search) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    const countQuery = query.replace('SELECT p.*, u.name as user_name', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const projects = db.prepare(query).all(...params);

    return res.json({
      data: projects.map(projectResponse),
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

// POST /projects
router.post('/', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { name, originalImageUrl, processedImageUrl, thumbnailUrl, format = 'png', width = 800, height = 800, settings, status = 'Completed' } = req.body;
    if (!name || !originalImageUrl) {
      return res.status(400).json({ error: 'Name and original image are required' });
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, user_id, name, original_image_url, processed_image_url, thumbnail_url, format, width, height, status, settings_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user!.id,
      name,
      originalImageUrl,
      processedImageUrl || null,
      thumbnailUrl || originalImageUrl,
      format,
      width,
      height,
      status,
      settings ? JSON.stringify(settings) : null,
      now,
      now
    );

    db.prepare('UPDATE users SET total_projects = total_projects + 1 WHERE id = ?').run(req.user!.id);

    return res.status(201).json({ id, name, status, createdAt: now });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /projects/:id
router.delete('/:id', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isAdmin = ['Super Admin', 'Admin'].includes(req.user!.role);
    if (!isAdmin && project.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    db.prepare('UPDATE users SET total_projects = MAX(0, total_projects - 1) WHERE id = ?').run(project.user_id);

    if (isAdmin) {
      recordAuditLog(req, 'DELETE_PROJECT', 'PROJECT', id, project.name, null);
    }

    return res.json({ message: 'Project deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /projects/bulk-delete
router.post('/bulk-delete', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Array of project ids required' });
    }

    for (const id of ids) {
      db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    }

    db.prepare('UPDATE users SET total_projects = (SELECT COUNT(*) FROM projects WHERE user_id = users.id)').run();
    recordAuditLog(req, 'BULK_DELETE_PROJECTS', 'PROJECT', null, null, ids);
    return res.json({ message: `${ids.length} projects deleted successfully` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


const updateProjectSchema = z.object({ name:z.string().trim().min(1).max(120).optional(), status:z.enum(['Draft','Completed','Pending','In Progress']).optional() }).strict();
router.patch('/:id', authenticateJwt, (req:AuthRequest,res:Response) => {
 const parsed = updateProjectSchema.safeParse(req.body);
 if(!parsed.success || !Object.keys(parsed.data).length) return res.status(400).json({ error:'Nama atau status proyek tidak valid.' });
 const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
 if(!project) return res.status(404).json({ error:'Proyek tidak ditemukan.' });
 if(project.user_id !== req.user!.id && !['Super Admin','Admin'].includes(req.user!.role)) return res.status(403).json({ error:'Forbidden' });
 const now = new Date().toISOString(), { name = project.name, status = project.status } = parsed.data;
 db.prepare('UPDATE projects SET name = ?, status = ?, updated_at = ? WHERE id = ?').run(name,status,now,project.id);
 recordAuditLog(req,'UPDATE_PROJECT','PROJECT',project.id,{name:project.name,status:project.status},{name,status});
 return res.json({ id:project.id,name,status,updatedAt:now });
});

const syncSchema=z.object({
 id:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),name:z.string().trim().min(1).max(120),
 originalImageUrl:z.string().min(1).max(16000000),processedImageUrl:z.string().max(20000000).nullable().optional(),
 thumbnailUrl:z.string().max(16000000),maskData:z.string().max(20000000).nullable().optional(),favorite:z.boolean().optional(),
 format:z.enum(['png','jpg','jpeg','webp']).default('png'),width:z.number().int().positive().max(25000),height:z.number().int().positive().max(25000),
 status:z.enum(['Draft','Completed','Pending','In Progress']),settings:z.record(z.unknown()).nullable().optional()
});
router.put('/sync/:id',authenticateJwt,(req:AuthRequest,res:Response)=>{
 const parsed=syncSchema.safeParse(req.body);if(!parsed.success||parsed.data.id!==req.params.id)return res.status(400).json({error:'Data proyek tidak valid.'});
 const p=parsed.data,old=db.prepare('SELECT * FROM projects WHERE id = ?').get(p.id) as any;
 if(old&&old.user_id!==req.user!.id)return res.status(403).json({error:'Proyek milik akun lain.'});
 const now=new Date().toISOString();
 const settings=JSON.stringify({...p.settings,_storage:{maskData:p.maskData||null,favorite:p.favorite||false}});
 db.prepare('INSERT OR REPLACE INTO projects (id,user_id,name,original_image_url,processed_image_url,thumbnail_url,format,width,height,status,settings_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(p.id,req.user!.id,p.name,p.originalImageUrl,p.processedImageUrl||null,p.thumbnailUrl,p.format,p.width,p.height,p.status,settings,old?.created_at||now,now);
 db.prepare('UPDATE users SET total_projects = (SELECT COUNT(*) FROM projects WHERE user_id = ?) WHERE id = ?').run(req.user!.id,req.user!.id);
 return res.json({id:p.id,createdAt:old?.created_at||now,updatedAt:now});
});
router.get('/:id',authenticateJwt,(req:AuthRequest,res:Response)=>{
 const p=db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
 if(!p)return res.status(404).json({error:'Proyek tidak ditemukan.'});
 if(p.user_id!==req.user!.id&&!['Super Admin','Admin','Analyst'].includes(req.user!.role))return res.status(403).json({error:'Forbidden'});
 return res.json(projectResponse(p));
});
function projectResponse(p:any) {
 const settings=p.settings_json?JSON.parse(p.settings_json):null;
 const { _storage,...editorSettings }=settings||{};
 return {id:p.id,userId:p.user_id,userName:p.user_name,name:p.name,originalImageUrl:p.original_image_url,originalImageData:p.original_image_url,processedImageUrl:p.processed_image_url,processedImageData:p.processed_image_url,thumbnailUrl:p.thumbnail_url,format:p.format,width:p.width,height:p.height,status:p.status,settings:editorSettings,maskData:_storage?.maskData||null,favorite:_storage?.favorite||false,createdAt:p.created_at,updatedAt:p.updated_at};
}

export default router;
