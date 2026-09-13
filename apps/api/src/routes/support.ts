import { Router, Response } from 'express';
import { db } from '../db';
import { optionalJwt, authenticateJwt, AuthRequest, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// GET /support/tickets
router.get('/tickets', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, category, search, page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const isAdmin = ['Super Admin', 'Admin', 'Support Admin', 'Analyst'].includes(req.user!.role);

    let query = 'SELECT * FROM support_tickets WHERE 1=1';
    const params: any[] = [];

    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(req.user!.id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (subject LIKE ? OR user_name LIKE ? OR id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const tickets = db.prepare(query).all(...params);

    return res.json({
      data: tickets.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        userName: t.user_name,
        userEmail: t.user_email,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        assignedAdminId: t.assigned_admin_id,
        assignedAdminName: t.assigned_admin_name,
        status: t.status,
        lastMessage: t.last_message,
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

// POST /support/tickets (Create Ticket)
router.post('/tickets', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { subject, category = 'Other', priority = 'Medium', initialMessage, attachmentUrl } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const id = `${Math.floor(3000 + Math.random() * 7000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_tickets (id, user_id, user_name, user_email, subject, category, priority, status, last_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)
    `).run(id, req.user!.id, req.user!.name, req.user!.email, subject, category, priority, initialMessage || '(Lampiran Gambar Bukti)', now, now);

    if (initialMessage || attachmentUrl) {
      const msgId = `msg_${Date.now()}`;
      db.prepare(`
        INSERT INTO support_messages (id, ticket_id, sender_id, sender_name, sender_role, message, attachment_url, is_internal_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(msgId, id, req.user!.id, req.user!.name, req.user!.role, initialMessage || 'Melampirkan bukti tangkapan layar kendala.', attachmentUrl || null, now);
    }

    return res.status(201).json({ id, subject, status: 'Pending', createdAt: now, attachmentUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /support/tickets/:id
router.get('/tickets/:id', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as any;
    if (!ticket) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan' });
    }

    const isAdmin = ['Super Admin', 'Admin', 'Support Admin', 'Analyst'].includes(req.user!.role);
    if (!isAdmin && ticket.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let messagesQuery = 'SELECT * FROM support_messages WHERE ticket_id = ?';
    if (!isAdmin) {
      messagesQuery += ' AND is_internal_note = 0';
    }
    messagesQuery += ' ORDER BY created_at ASC';

    const messages = db.prepare(messagesQuery).all(id);

    return res.json({
      ticket: {
        id: ticket.id,
        userId: ticket.user_id,
        userName: ticket.user_name,
        userEmail: ticket.user_email,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        assignedAdminId: ticket.assigned_admin_id,
        assignedAdminName: ticket.assigned_admin_name,
        status: ticket.status,
        lastMessage: ticket.last_message,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
      },
      messages: messages.map((m: any) => ({
        id: m.id,
        ticketId: m.ticket_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        message: m.message,
        attachmentUrl: m.attachment_url,
        isInternalNote: Boolean(m.is_internal_note),
        createdAt: m.created_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /support/tickets/:id/messages
router.post('/tickets/:id/messages', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { message, attachmentUrl, isInternalNote = false } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    }

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as any;
    if (!ticket) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan' });
    }

    const isAdmin = ['Super Admin', 'Admin', 'Support Admin'].includes(req.user!.role);
    if (!isAdmin && ticket.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const msgId = `msg_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_id, sender_name, sender_role, message, attachment_url, is_internal_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(msgId, id, req.user!.id, req.user!.name, req.user!.role, message, attachmentUrl || null, isInternalNote ? 1 : 0, now);

    // Update ticket status & last message
    const newStatus = isAdmin && ticket.status === 'Pending' ? 'In Progress' : ticket.status;
    db.prepare('UPDATE support_tickets SET last_message = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(message, newStatus, now, id);

    if (isAdmin) {
      recordAuditLog(req, 'REPLY_TICKET', 'SUPPORT_TICKET', id, ticket.status, newStatus);
    }

    return res.status(201).json({
      id: msgId,
      ticketId: id,
      senderId: req.user!.id,
      senderName: req.user!.name,
      senderRole: req.user!.role,
      message,
      attachmentUrl: attachmentUrl || null,
      isInternalNote,
      createdAt: now,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /support/tickets/:id/status
router.patch('/tickets/:id/status', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedAdminId, assignedAdminName } = req.body;
    const old = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as any;
    if (!old) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (assignedAdminId !== undefined) {
      updates.push('assigned_admin_id = ?');
      params.push(assignedAdminId);
      updates.push('assigned_admin_name = ?');
      params.push(assignedAdminName || 'Admin');
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      db.prepare(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    recordAuditLog(req, 'UPDATE_TICKET', 'SUPPORT_TICKET', id, old, req.body);
    return res.json({ message: 'Tiket diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /support/tickets/:id/close
router.patch('/tickets/:id/close', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as any;
    if (!ticket) return res.status(404).json({ error: 'Tiket tidak ditemukan' });

    const isAdmin = ['Super Admin', 'Admin', 'Support Admin'].includes(req.user!.role);
    if (!isAdmin && ticket.user_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

    const now = new Date().toISOString();
    db.prepare("UPDATE support_tickets SET status = 'Closed', updated_at = ? WHERE id = ?").run(now, id);
    if (isAdmin) recordAuditLog(req, 'CLOSE_TICKET', 'SUPPORT_TICKET', id, ticket.status, 'Closed');

    return res.json({ message: 'Tiket berhasil ditutup', status: 'Closed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /support/tickets/:id
router.delete('/tickets/:id', authenticateJwt, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as any;
    if (!ticket) return res.status(404).json({ error: 'Tiket tidak ditemukan' });

    const isAdmin = ['Super Admin', 'Admin', 'Support Admin'].includes(req.user!.role);
    if (!isAdmin && ticket.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('DELETE FROM support_messages WHERE ticket_id = ?').run(id);
    db.prepare('DELETE FROM support_tickets WHERE id = ?').run(id);

    if (isAdmin) recordAuditLog(req, 'DELETE_TICKET', 'SUPPORT_TICKET', id, ticket, null);

    return res.json({ message: 'Tiket berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FAQ ENDPOINTS
// ==========================================

// GET /support/faqs
router.get('/faqs', optionalJwt, (req: AuthRequest, res: Response) => {
  try {
    const { all } = req.query;
    let query = 'SELECT * FROM faqs';
    if (!(all === 'true' && req.user && ['Super Admin','Admin','Support Admin'].includes(req.user.role))) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY order_index ASC, created_at ASC';
    const faqs = db.prepare(query).all();
    return res.json(faqs.map((f: any) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      orderIndex: f.order_index,
      isActive: Boolean(f.is_active),
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memuat FAQ' });
  }
});

// POST /support/faqs (Admin)
router.post('/faqs', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { question, answer, category = 'Umum', orderIndex = 0, isActive = true } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Pertanyaan dan jawaban wajib diisi' });
    }

    const id = 'faq_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO faqs (id, question, answer, category, order_index, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, question.trim(), answer.trim(), category.trim(), Number(orderIndex) || 0, isActive ? 1 : 0, now, now);

    recordAuditLog(req, 'CREATE_FAQ', 'FAQ', id, null, question);

    const created = db.prepare('SELECT * FROM faqs WHERE id = ?').get(id) as any;
    return res.status(201).json({
      id: created.id,
      question: created.question,
      answer: created.answer,
      category: created.category,
      orderIndex: created.order_index,
      isActive: Boolean(created.is_active),
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menambah FAQ' });
  }
});

// PATCH /support/faqs/:id (Admin)
router.patch('/faqs/:id', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM faqs WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'FAQ tidak ditemukan' });

    const { question, answer, category, orderIndex, isActive } = req.body;
    const now = new Date().toISOString();

    const nextQ = question !== undefined ? question.trim() : existing.question;
    const nextA = answer !== undefined ? answer.trim() : existing.answer;
    const nextCat = category !== undefined ? category.trim() : existing.category;
    const nextOrder = orderIndex !== undefined ? Number(orderIndex) : existing.order_index;
    const nextActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE faqs
      SET question = ?, answer = ?, category = ?, order_index = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(nextQ, nextA, nextCat, nextOrder, nextActive, now, id);

    recordAuditLog(req, 'UPDATE_FAQ', 'FAQ', id, existing.question, nextQ);

    const updated = db.prepare('SELECT * FROM faqs WHERE id = ?').get(id) as any;
    return res.json({
      id: updated.id,
      question: updated.question,
      answer: updated.answer,
      category: updated.category,
      orderIndex: updated.order_index,
      isActive: Boolean(updated.is_active),
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memperbarui FAQ' });
  }
});

// DELETE /support/faqs/:id (Admin)
router.delete('/faqs/:id', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM faqs WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'FAQ tidak ditemukan' });

    db.prepare('DELETE FROM faqs WHERE id = ?').run(id);
    recordAuditLog(req, 'DELETE_FAQ', 'FAQ', id, existing.question, null);

    return res.json({ success: true, message: 'FAQ berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menghapus FAQ' });
  }
});

// ==========================================
// CHATBOT KNOWLEDGE BASE ENDPOINTS
// ==========================================

// GET /support/chatbot-knowledge
router.get('/chatbot-knowledge', optionalJwt, (req: AuthRequest, res: Response) => {
  try {
    const { all } = req.query;
    let query = 'SELECT * FROM chatbot_knowledge';
    if (!(all === 'true' && req.user && ['Super Admin','Admin','Support Admin'].includes(req.user.role))) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY created_at ASC';
    const items = db.prepare(query).all();
    return res.json(items.map((c: any) => ({
      id: c.id,
      keyword: c.keyword,
      title: c.title,
      response: c.response,
      actionType: c.action_type,
      actionPayload: c.action_payload,
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memuat pengetahuan chatbot' });
  }
});

// POST /support/chatbot-knowledge (Admin)
router.post('/chatbot-knowledge', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { keyword, title, response, actionType = 'info', actionPayload = '', isActive = true } = req.body;
    if (!keyword || !title || !response) {
      return res.status(400).json({ error: 'Keyword, judul, dan respon chatbot wajib diisi' });
    }

    const id = 'cb_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO chatbot_knowledge (id, keyword, title, response, action_type, action_payload, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, keyword.trim().toLowerCase(), title.trim(), response.trim(), actionType, actionPayload, isActive ? 1 : 0, now);

    recordAuditLog(req, 'CREATE_CHATBOT_KNOWLEDGE', 'CHATBOT', id, null, title);

    const created = db.prepare('SELECT * FROM chatbot_knowledge WHERE id = ?').get(id) as any;
    return res.status(201).json({
      id: created.id,
      keyword: created.keyword,
      title: created.title,
      response: created.response,
      actionType: created.action_type,
      actionPayload: created.action_payload,
      isActive: Boolean(created.is_active),
      createdAt: created.created_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menambah pengetahuan chatbot' });
  }
});

// PATCH /support/chatbot-knowledge/:id (Admin)
router.patch('/chatbot-knowledge/:id', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM chatbot_knowledge WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Pengetahuan chatbot tidak ditemukan' });

    const { keyword, title, response, actionType, actionPayload, isActive } = req.body;

    const nextK = keyword !== undefined ? keyword.trim().toLowerCase() : existing.keyword;
    const nextT = title !== undefined ? title.trim() : existing.title;
    const nextR = response !== undefined ? response.trim() : existing.response;
    const nextType = actionType !== undefined ? actionType : existing.action_type;
    const nextPayload = actionPayload !== undefined ? actionPayload : existing.action_payload;
    const nextActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE chatbot_knowledge
      SET keyword = ?, title = ?, response = ?, action_type = ?, action_payload = ?, is_active = ?
      WHERE id = ?
    `).run(nextK, nextT, nextR, nextType, nextPayload, nextActive, id);

    recordAuditLog(req, 'UPDATE_CHATBOT_KNOWLEDGE', 'CHATBOT', id, existing.title, nextT);

    const updated = db.prepare('SELECT * FROM chatbot_knowledge WHERE id = ?').get(id) as any;
    return res.json({
      id: updated.id,
      keyword: updated.keyword,
      title: updated.title,
      response: updated.response,
      actionType: updated.action_type,
      actionPayload: updated.action_payload,
      isActive: Boolean(updated.is_active),
      createdAt: updated.created_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memperbarui pengetahuan chatbot' });
  }
});

// DELETE /support/chatbot-knowledge/:id (Admin)
router.delete('/chatbot-knowledge/:id', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM chatbot_knowledge WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Pengetahuan chatbot tidak ditemukan' });

    db.prepare('DELETE FROM chatbot_knowledge WHERE id = ?').run(id);
    recordAuditLog(req, 'DELETE_CHATBOT_KNOWLEDGE', 'CHATBOT', id, existing.title, null);

    return res.json({ success: true, message: 'Pengetahuan chatbot berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menghapus pengetahuan chatbot' });
  }
});

export default router;
