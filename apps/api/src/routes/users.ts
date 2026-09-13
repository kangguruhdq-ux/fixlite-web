import { z } from 'zod';
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authenticateJwt, AuthRequest, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();
const userSchema = z.object({
 name:z.string().trim().min(2).max(100), email:z.string().trim().email().transform(v=>v.toLowerCase()),
 password:z.string().min(6).max(128), role:z.enum(['Super Admin','Admin','Support Admin','Content Admin','Analyst','User']).default('User'),
 membership:z.enum(['Free','Pro','Unlimited']).default('Free'), status:z.enum(['Active','Suspended','Pending']).default('Active')
});
const updateSchema = userSchema.partial().extend({ membershipExpiresAt:z.string().datetime().nullable().optional(), avatarUrl:z.string().optional() }).strict();
function protectedTarget(req: AuthRequest, target: any, nextRole?: string, nextStatus?: string, deleting = false) {
 if (req.user!.role !== 'Super Admin' && (target.role !== 'User' || (nextRole && nextRole !== 'User'))) return 'Hanya Super Admin dapat mengelola akun administrator.';
 if (target.id === req.user!.id && (deleting || (nextRole && nextRole !== target.role) || (nextStatus && nextStatus !== 'Active'))) return 'Anda tidak dapat menghapus, menonaktifkan, atau mengubah peran akun sendiri.';
 if (target.role === 'Super Admin' && target.status === 'Active' && (deleting || (nextRole && nextRole !== 'Super Admin') || (nextStatus && nextStatus !== 'Active'))) {
   const remaining = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Super Admin' AND status = 'Active' AND id != ?").get(target.id) as any;
   if (!remaining.count) return 'Minimal satu Super Admin aktif harus tersedia.';
 }
 return null;
}


// GET /users with search, filters, pagination
router.get('/', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Analyst']), (req: AuthRequest, res: Response) => {
  try {
    const {
      search = '',
      role = '',
      status = '',
      membership = '',
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT id, name, email, role, membership, membership_expires_at, status, avatar_url, total_projects, total_processes, last_active_at, created_at, updated_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (membership) {
      query += ' AND membership = ?';
      params.push(membership);
    }

    const countQuery = query.replace('SELECT id, name, email, role, membership, membership_expires_at, status, avatar_url, total_projects, total_processes, last_active_at, created_at, updated_at', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    const safeSortBy = ['created_at', 'name', 'last_active_at', 'total_projects'].includes(sortBy) ? sortBy : 'created_at';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortBy} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const users = db.prepare(query).all(...params);

    return res.json({
      data: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        membership: u.membership,
        membershipExpiresAt: u.membership_expires_at,
        status: u.status,
        avatarUrl: u.avatar_url,
        totalProjects: u.total_projects,
        totalProcesses: u.total_processes,
        lastActiveAt: u.last_active_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
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

// Export CSV
router.get('/export/csv', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const users = db.prepare('SELECT name, email, role, membership, status, total_projects, total_processes, last_active_at, created_at FROM users ORDER BY created_at DESC').all() as any[];

    const headers = ['Name', 'Email', 'Role', 'Membership', 'Status', 'Total Projects', 'Total Processes', 'Last Active', 'Registered Date'];
    const rows = users.map(u => [
      `"${(/^[=+@\-\t\r]/.test(u.name) ? "'" + u.name : u.name).replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${u.role}"`,
      `"${u.membership}"`,
      `"${u.status}"`,
      u.total_projects,
      u.total_processes,
      `"${u.last_active_at}"`,
      `"${u.created_at}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pixellift-users-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /users/:id
router.get('/:id', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user!.id !== id && !['Super Admin','Admin','Analyst'].includes(req.user!.role)) return res.status(403).json({ error:'Forbidden' });
    const user = db.prepare('SELECT id, name, email, role, membership, membership_expires_at, status, avatar_url, total_projects, total_processes, last_active_at, created_at, updated_at FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(id);
    const processes = db.prepare('SELECT * FROM background_processes WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(id);
    const tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(id);
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(id);

    return res.json({
      user,
      stats: {
        projects,
        processes,
        tickets,
        transactions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /users (Admin Create User)
router.post('/', authenticateJwt, requireRole(['Super Admin', 'Admin']), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error:'Nama minimal 2 karakter, email valid, dan sandi minimal 6 karakter diperlukan.' });
    const { name, email, password, role, membership, status } = parsed.data;
    if (req.user!.role !== 'Super Admin' && role !== 'User') return res.status(403).json({ error:'Hanya Super Admin dapat membuat administrator.' });
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, membership, status, total_projects, total_processes, last_active_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `).run(id, name, email, passwordHash, role, membership, status, now, now, now);

    recordAuditLog(req, 'CREATE_USER', 'USER', id, null, { name, email, role, membership, status });

    return res.status(201).json({ id, name, email, role, membership, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /users/:id (Admin Update User)
router.patch('/:id', authenticateJwt, requireRole(['Super Admin', 'Admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!oldUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error:'Data pengguna tidak valid.' });
    const { name, email, role, status, membership, membershipExpiresAt, password, avatarUrl } = parsed.data;
    const blocked = protectedTarget(req,oldUser,role,status);
    if (blocked) return res.status(403).json({ error:blocked });
    if (email && db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(email,id)) return res.status(409).json({ error:'Email sudah digunakan.' });
    const updates: string[] = [];
    const params: any[] = [];

    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (membership !== undefined) { updates.push('membership = ?'); params.push(membership); }
    if (membershipExpiresAt !== undefined) { updates.push('membership_expires_at = ?'); params.push(membershipExpiresAt); }
    if (avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(avatarUrl); }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    recordAuditLog(req, 'UPDATE_USER', 'USER', id, { name:oldUser.name, email:oldUser.email, role:oldUser.role, status:oldUser.status, membership:oldUser.membership }, { name, email, role, status, membership, passwordChanged:Boolean(password) });

    const updated = db.prepare('SELECT id, name, email, role, membership, membership_expires_at, status, avatar_url, total_projects, total_processes, last_active_at, created_at, updated_at FROM users WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id
router.delete('/:id', authenticateJwt, requireRole(['Super Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const old = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(id);
    if (!old) {
      return res.status(404).json({ error: 'User not found' });
    }

    const blocked = protectedTarget(req,old,undefined,undefined,true);
    if (blocked) return res.status(403).json({ error:blocked });
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    recordAuditLog(req, 'DELETE_USER', 'USER', id, old, null);

    return res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /users/bulk
router.post('/bulk', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { ids, action } = req.body as { ids: string[]; action: 'suspend' | 'activate' | 'delete' };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of user ids required' });
    }

    if (ids.length > 100 || ids.some(id=>typeof id !== 'string')) return res.status(400).json({ error:'Pilih 1 hingga 100 pengguna.' });
    if (action === 'delete' && req.user!.role !== 'Super Admin') return res.status(403).json({ error:'Hanya Super Admin dapat menghapus pengguna.' });
    for (const id of ids) {
      const target = db.prepare('SELECT id, role, status FROM users WHERE id = ?').get(id);
      if (!target) return res.status(404).json({ error:'Pengguna tidak ditemukan.' });
      const blocked = protectedTarget(req,target,undefined,action === 'suspend' ? 'Suspended' : 'Active',action === 'delete');
      if (blocked) return res.status(403).json({ error:blocked });
    }
    if (action === 'suspend') {
      for (const id of ids) {
        db.prepare("UPDATE users SET status = 'Suspended', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      }
      recordAuditLog(req, 'BULK_SUSPEND', 'USER', null, null, ids);
    } else if (action === 'activate') {
      for (const id of ids) {
        db.prepare("UPDATE users SET status = 'Active', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      }
      recordAuditLog(req, 'BULK_ACTIVATE', 'USER', null, null, ids);
    } else if (action === 'delete') {
      for (const id of ids) {
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
      }
      recordAuditLog(req, 'BULK_DELETE', 'USER', null, null, ids);
    } else {
      return res.status(400).json({ error: 'Invalid bulk action' });
    }

    return res.json({ message: `Bulk action '${action}' completed on ${ids.length} users` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
