import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateJwt, AuthRequest, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    periodDays: 365,
    dailyBgRemovalLimit: 10,
    features: [
      '10 remove background per hari',
      'Editor foto dasar (Basic & Color)',
      'Export PNG & JPG',
      'Proyek akun tersimpan di server',
      'Tanpa watermark seumur hidup',
    ],
    isActive: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    periodDays: 30,
    dailyBgRemovalLimit: 250,
    features: [
      '250 remove background per hari',
      'Pemrosesan batch cepat',
      'Semua filter preset premium',
      'Export kualitas tinggi & WEBP',
      'Riwayat cloud & project tanpa batas',
      'Prioritas pemrosesan server AI',
    ],
    isActive: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 29,
    periodDays: 30,
    dailyBgRemovalLimit: 9999,
    features: [
      'Unlimited remove background',
      'Pemrosesan model U2Net asli',
      'Export resolusi 4K Ultra-HD',
      'Dukungan prioritas tiket langsung',
      'Akses fitur-fitur baru lebih awal',
    ],
    isActive: true,
  },
];

function getStoredPlans(): any[] {
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'membership_plans'").get() as any;
    if (row && row.value) {
      return JSON.parse(row.value);
    }
  } catch (e) {
    console.error('Failed to parse stored plans:', e);
  }
  return DEFAULT_PLANS;
}

function saveStoredPlans(plans: any[]) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('membership_plans', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(JSON.stringify(plans), now);
}

// GET /memberships/plans
router.get('/plans', (req, res: Response) => {
  return res.json(getStoredPlans());
});

// PATCH /memberships/plans/:id (Admin protected - Change pricing/quotas)
router.patch('/plans/:id', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { price, dailyBgRemovalLimit, periodDays, features, isActive, name } = req.body;

    const plans = getStoredPlans();
    const index = plans.findIndex(
      (p) => p.id.toLowerCase() === id.toLowerCase() || p.name.toLowerCase() === id.toLowerCase()
    );
    if (index === -1) {
      return res.status(404).json({ error: 'Paket langganan tidak ditemukan' });
    }

    const oldPlan = { ...plans[index] };
    if (price !== undefined) plans[index].price = Number(price);
    if (dailyBgRemovalLimit !== undefined) plans[index].dailyBgRemovalLimit = Number(dailyBgRemovalLimit);
    if (periodDays !== undefined) plans[index].periodDays = Number(periodDays);
    if (features !== undefined && Array.isArray(features)) plans[index].features = features;
    if (isActive !== undefined) plans[index].isActive = Boolean(isActive);
    if (name !== undefined) plans[index].name = String(name);

    saveStoredPlans(plans);
    recordAuditLog(req, 'UPDATE_PLAN_PRICING', 'MEMBERSHIP_PLAN', id, JSON.stringify(oldPlan), JSON.stringify(plans[index]));

    return res.json({ message: 'Paket membership berhasil diperbarui', plan: plans[index], plans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /transactions
router.get('/transactions', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const isAdmin = ['Super Admin', 'Admin', 'Analyst'].includes(req.user!.role);

    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(req.user!.id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (invoice_number LIKE ? OR user_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const txs = db.prepare(query).all(...params);

    return res.json({
      data: txs.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        userName: t.user_name,
        tier: t.tier,
        amount: t.amount,
        status: t.status,
        paymentMethod: t.payment_method,
        invoiceNumber: t.invoice_number,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
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

// POST /transactions (Simulate Checkout)
router.post('/transactions', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { tier, couponCode, paymentMethod = 'Simulated Card', simulateStatus = 'Paid' } = req.body;
    const plan=getStoredPlans().find(p=>p.name===tier&&p.isActive);
    if(!plan||!['Paid','Pending','Failed','Cancelled'].includes(simulateStatus))return res.status(400).json({error:'Paket atau status transaksi tidak valid.'});
    let amount=Number(plan.price),coupon:any=null;
    if(couponCode) {
     if(typeof couponCode!=='string')return res.status(400).json({error:'Kode promo tidak valid.'});
     coupon=db.prepare('SELECT * FROM coupons WHERE code = ?').get(couponCode.trim().toUpperCase()) as any;
     if(!coupon||!coupon.is_active||(coupon.max_uses>0&&coupon.used_count>=coupon.max_uses)||(coupon.expires_at&&new Date(coupon.expires_at).getTime()<Date.now()))return res.status(400).json({error:'Kupon tidak tersedia, habis, atau kedaluwarsa.'});
     amount=Math.max(0,Math.round((amount-(coupon.discount_percent>0?amount*coupon.discount_percent/100:coupon.discount_amount))*100)/100);
    }
    if (!tier || amount === undefined) {
      return res.status(400).json({ error: 'Tier and amount are required' });
    }

    const id = `tx_${Date.now()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO transactions (id, user_id, user_name, tier, amount, status, payment_method, invoice_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.id, req.user!.name, tier, amount, simulateStatus, paymentMethod, invoiceNumber, now, now);

    if (simulateStatus === 'Paid') {
      if(coupon)db.prepare('UPDATE coupons SET used_count=used_count+1 WHERE id=?').run(coupon.id);
      const expires = new Date(Date.now() + Number(plan.periodDays || 30) * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET membership = ?, membership_expires_at = ?, updated_at = ? WHERE id = ?')
        .run(tier, expires, now, req.user!.id);
    }

    return res.status(201).json({
      id,
      invoiceNumber,
      tier,
      amount,
      status: simulateStatus,
      paymentMethod,
      createdAt: now,
      message: simulateStatus === 'Paid' ? 'Pembayaran simulasi berhasil! Membership aktif.' : 'Transaksi dicatat.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /transactions/export/csv
router.get('/transactions/export/csv', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const txs = db.prepare('SELECT invoice_number, user_name, tier, amount, payment_method, status, created_at FROM transactions ORDER BY created_at DESC').all() as any[];
    const headers = ['Invoice', 'User', 'Tier', 'Amount', 'Payment Method', 'Status', 'Date'];
    const rows = txs.map(t => [
      `"${t.invoice_number}"`,
      `"${(t.user_name || '').replace(/"/g, '""')}"`,
      `"${t.tier}"`,
      t.amount,
      `"${t.payment_method}"`,
      `"${t.status}"`,
      `"${t.created_at}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pixellift-transactions-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /transactions/:id
router.get('/transactions/:id', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const isAdmin = ['Super Admin', 'Admin', 'Analyst'].includes(req.user!.role);
    if (!isAdmin && tx.user_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

    return res.json({
      id: tx.id,
      userId: tx.user_id,
      userName: tx.user_name,
      tier: tx.tier,
      amount: tx.amount,
      status: tx.status,
      paymentMethod: tx.payment_method,
      invoiceNumber: tx.invoice_number,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /transactions/manual (Admin Create Transaction)
router.post('/transactions/manual', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { userId, userName, tier = 'Pro', amount = 12, paymentMethod = 'Manual Admin', status = 'Paid', invoiceNumber } = req.body;
    if(!userId)return res.status(400).json({error:'Pilih akun pengguna untuk transaksi ini.'});
    let targetUserId = userId;
    let targetUserName = userName;

    if (userId) {
      const u = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId) as any;
      if(!u)return res.status(404).json({error:'Pengguna tidak ditemukan.'});
      if (u) {
        targetUserId = u.id;
        targetUserName = u.name;
      }
    } else if (!targetUserName) {
      targetUserName = 'Customer';
    }

    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const finalInvoice = invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO transactions (id, user_id, user_name, tier, amount, status, payment_method, invoice_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, targetUserId || null, targetUserName, tier, amount, status, paymentMethod, finalInvoice, now, now);

    if (status === 'Paid' && targetUserId) {
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET membership = ?, membership_expires_at = ?, updated_at = ? WHERE id = ?')
        .run(tier, expires, now, targetUserId);
    }

    recordAuditLog(req, 'CREATE_TRANSACTION_MANUAL', 'TRANSACTION', id, null, { tier, amount, status, targetUserName });

    return res.status(201).json({
      id,
      invoiceNumber: finalInvoice,
      tier,
      amount,
      status,
      paymentMethod,
      userName: targetUserName,
      createdAt: now,
      message: 'Transaksi manual berhasil dicatat.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /transactions/:id (Admin Update Transaction)
router.patch('/transactions/:id', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tier, amount, paymentMethod, status } = req.body;
    const old = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const updates: string[] = [];
    const params: any[] = [];
    if (tier !== undefined) { updates.push('tier = ?'); params.push(tier); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(Number(amount)); }
    if (paymentMethod !== undefined) { updates.push('payment_method = ?'); params.push(paymentMethod); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length > 0) {
      const now = new Date().toISOString();
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      if (status === 'Paid' && old.user_id) {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare('UPDATE users SET membership = ?, membership_expires_at = ?, updated_at = ? WHERE id = ?')
          .run(tier || old.tier, expires, now, old.user_id);
      }
      recordAuditLog(req, 'UPDATE_TRANSACTION', 'TRANSACTION', id, old, req.body);
    }

    return res.json({ message: 'Transaksi berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /transactions/:id
router.delete('/transactions/:id', authenticateJwt, requireRole(['Super Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const old = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    recordAuditLog(req, 'DELETE_TRANSACTION', 'TRANSACTION', id, old, null);

    return res.json({ message: 'Transaksi berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /transactions/:id/status
router.patch('/transactions/:id/status', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const old = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!old) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    if (status === 'Paid') {
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET membership = ?, membership_expires_at = ?, updated_at = ? WHERE id = ?')
        .run(old.tier, expires, now, old.user_id);
    }

    recordAuditLog(req, 'UPDATE_TRANSACTION_STATUS', 'TRANSACTION', id, old.status, status);

    return res.json({ message: 'Status transaksi berhasil diperbarui', status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
