import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateJwt, AuthRequest, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// 1. GET /coupons (Admin only)
router.get('/', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Analyst']), (req: AuthRequest, res: Response) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
    return res.json(coupons);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memuat daftar kupon' });
  }
});

// 2. POST /coupons (Admin only)
router.post('/', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { code, discountPercent, discountAmount, maxUses, expiresAt, isActive } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Kode kupon wajib diisi' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM coupons WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({ error: `Kode kupon "${cleanCode}" sudah digunakan` });
    }

    const id = 'cpn_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO coupons (id, code, discount_percent, discount_amount, max_uses, used_count, expires_at, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      id,
      cleanCode,
      Number(discountPercent) || 0,
      Number(discountAmount) || 0,
      Number(maxUses) || 100,
      expiresAt || null,
      isActive !== false ? 1 : 0,
      now
    );

    recordAuditLog(req, 'CREATE', 'COUPON', id, null, cleanCode);

    const created = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal membuat kupon baru' });
  }
});

// 3. PATCH /coupons/:id (Admin only)
router.patch('/:id', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, discountPercent, discountAmount, maxUses, expiresAt, isActive } = req.body;

    const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Kupon tidak ditemukan' });
    }

    let cleanCode = existing.code;
    if (code && typeof code === 'string') {
      cleanCode = code.trim().toUpperCase();
      if (cleanCode !== existing.code) {
        const duplicate = db.prepare('SELECT id FROM coupons WHERE code = ? AND id != ?').get(cleanCode, id);
        if (duplicate) {
          return res.status(400).json({ error: `Kode kupon "${cleanCode}" sudah digunakan` });
        }
      }
    }

    const nextPercent = discountPercent !== undefined ? Number(discountPercent) : existing.discount_percent;
    const nextAmount = discountAmount !== undefined ? Number(discountAmount) : existing.discount_amount;
    const nextMaxUses = maxUses !== undefined ? Number(maxUses) : existing.max_uses;
    const nextExpires = expiresAt !== undefined ? expiresAt : existing.expires_at;
    const nextActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE coupons
      SET code = ?, discount_percent = ?, discount_amount = ?, max_uses = ?, expires_at = ?, is_active = ?
      WHERE id = ?
    `).run(cleanCode, nextPercent, nextAmount, nextMaxUses, nextExpires, nextActive, id);

    recordAuditLog(req, 'UPDATE', 'COUPON', id, existing, { code: cleanCode, discountPercent: nextPercent });

    const updated = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memperbarui kupon' });
  }
});

// 4. DELETE /coupons/:id (Admin only)
router.delete('/:id', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Kupon tidak ditemukan' });
    }

    db.prepare('DELETE FROM coupons WHERE id = ?').run(id);

    recordAuditLog(req, 'DELETE', 'COUPON', id, existing.code, null);

    return res.json({ success: true, message: 'Kupon berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menghapus kupon' });
  }
});

// 5. POST /coupons/validate (Public or Logged-in user)
router.post('/validate', (req, res: Response) => {
  try {
    const { code, originalPrice } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Masukkan kode promo' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(cleanCode) as any;

    if (!coupon) {
      return res.status(404).json({ error: 'Kode promo tidak valid atau tidak ditemukan' });
    }

    if (!coupon.is_active) {
      return res.status(400).json({ error: 'Kode promo ini sudah tidak aktif' });
    }

    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Kuota penggunaan kupon promo ini sudah habis' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Kode promo telah melewati masa berlaku' });
    }

    const basePrice = Number(originalPrice) || 0;
    let discountValue = 0;

    if (coupon.discount_percent > 0) {
      discountValue = (basePrice * coupon.discount_percent) / 100;
    } else if (coupon.discount_amount > 0) {
      discountValue = coupon.discount_amount;
    }

    const finalPrice = Math.max(0, basePrice - discountValue);

    return res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountPercent: coupon.discount_percent,
        discountAmount: coupon.discount_amount,
      },
      originalPrice: basePrice,
      discountValue: Math.round(discountValue * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      message: `Kupon "${coupon.code}" berhasil diterapkan!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memvalidasi kupon' });
  }
});

export default router;
