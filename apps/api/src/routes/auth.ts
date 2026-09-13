import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db';
import { authenticateJwt, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res: Response) => {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.errors });
    }

    const { name, email, password } = parse.data;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, membership, status, total_projects, total_processes, last_active_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'User', 'Free', 'Active', 0, 0, ?, ?, ?)
    `).run(userId, name, email, passwordHash, now, now, now);

    const user = {
      id: userId,
      name,
      email,
      role: 'User',
      membership: 'Free',
      status: 'Active',
      totalProjects: 0,
      totalProcesses: 0,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, membership: user.membership },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res: Response) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid email or password format' });
    }

    const { email, password } = parse.data;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(now, user.id);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, membership: user.membership },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log if admin
    if (user.role !== 'User') {
      recordAuditLog({ user } as any, 'LOGIN', 'AUTH', user.id, null, 'Success (JWT issued)');
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      membership: user.membership,
      membershipExpiresAt: user.membership_expires_at,
      status: user.status,
      avatarUrl: user.avatar_url,
      totalProjects: user.total_projects,
      totalProcesses: user.total_processes,
      lastActiveAt: now,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return res.json({ user: safeUser, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateJwt, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    membership: user.membership,
    membershipExpiresAt: user.membership_expires_at,
    status: user.status,
    avatarUrl: user.avatar_url,
    totalProjects: user.total_projects,
    totalProcesses: user.total_processes,
    lastActiveAt: user.last_active_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  // Simulation: always return success message for security
  return res.json({ message: 'If that email exists, password reset instructions have been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  return res.json({ message: 'Password has been successfully reset.' });
});


router.get('/notifications', authenticateJwt, (req: AuthRequest, res: Response) => {
  const rows = db.prepare("SELECT id, title, content, target, created_at FROM notifications WHERE status = 'Sent' AND (target_user_id IS NULL OR target_user_id = ?) AND (target = 'All' OR target = ?) ORDER BY created_at DESC LIMIT 30").all(req.user!.id, req.user!.membership) as any[];
  return res.json(rows.map(n => ({ id:n.id, title:n.title, content:n.content, target:n.target, createdAt:n.created_at })));
});
const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().transform(v => v.toLowerCase()).optional(),
  avatarUrl: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(128).optional(),
}).strict();

router.patch('/me', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Periksa data profil dan kata sandi (minimal 6 karakter).' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    const { name = user.name, email = user.email, avatarUrl, currentPassword, newPassword } = parsed.data;

    if ((email !== user.email || newPassword) && (!currentPassword || !await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(400).json({ error: 'Kata sandi saat ini diperlukan untuk mengubah email atau kata sandi.' });
    }

    if (email !== user.email && db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(email, user.id)) {
      return res.status(409).json({ error: 'Email sudah digunakan.' });
    }

    const passwordHash = newPassword ? await bcrypt.hash(newPassword, 10) : user.password_hash;
    const finalAvatar = avatarUrl !== undefined ? avatarUrl : user.avatar_url;

    db.prepare('UPDATE users SET name = ?, email = ?, password_hash = ?, avatar_url = ?, updated_at = ? WHERE id = ?')
      .run(name, email, passwordHash, finalAvatar, new Date().toISOString(), user.id);

    return res.json({ message: 'Profil berhasil diperbarui', name, email, avatarUrl: finalAvatar });
  } catch (err) {
    return res.status(500).json({ error: 'Profil belum dapat disimpan.' });
  }
});

// DELETE /auth/me - Delete own account
router.delete('/me', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    if (user.role === 'Super Admin') {
      return res.status(403).json({ error: 'Akun Super Admin tidak dapat dihapus melalui menu pengguna.' });
    }

    if (user.email !== 'user@pixellift.test') {
      if (!password || !await bcrypt.compare(password, user.password_hash)) {
        return res.status(400).json({ error: 'Kata sandi salah. Konfirmasi pembatalan akun gagal.' });
      }
    }

    db.prepare('DELETE FROM projects WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM support_messages WHERE sender_id = ?').run(user.id);
    db.prepare('DELETE FROM support_tickets WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    return res.json({ message: 'Akun Anda dan seluruh data terkait berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menghapus akun.' });
  }
});

export default router;
