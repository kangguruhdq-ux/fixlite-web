import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateJwt, AuthRequest, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();


const staff=['Super Admin','Admin','Support Admin','Content Admin','Analyst'] as any;
const count=(table:string,where='1=1')=>Number(db.prepare('SELECT COUNT(*) AS n FROM '+table+' WHERE '+where).get()?.n||0);
router.get('/overview',authenticateJwt,requireRole(staff),(req:AuthRequest,res:Response)=>{
 const metric=(table:string,where='1=1')=>{
  const value=count(table,where),now=Date.now(),start=new Date(now-7*86400000).toISOString(),prior=new Date(now-14*86400000).toISOString();
  const current=Number(db.prepare('SELECT COUNT(*) n FROM '+table+' WHERE '+where+' AND created_at >= ?').get(start)?.n||0);
  const previous=Number(db.prepare('SELECT COUNT(*) n FROM '+table+' WHERE '+where+' AND created_at >= ? AND created_at < ?').get(prior,start)?.n||0);
  return {value,label:value.toLocaleString('id-ID'),trend:previous?Math.round((current-previous)/previous*1000)/10:null,isPositive:current>=previous,sparkline:[]};
 };
 const revenue=Number(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM transactions WHERE status = 'Paid'").get()?.n||0);
 res.json({totalUsers:metric('users'),totalProjects:metric('projects'),imagesProcessed:metric('background_processes'),backgroundRemovals:metric('background_processes',"status = 'Completed'"),failedProcessing:metric('background_processes',"status = 'Failed'"),pendingReports:metric('reports',"status = 'Pending'"),pendingTickets:metric('support_tickets',"status NOT IN ('Closed','Resolved')"),activeMemberships:{free:count('users',"membership = 'Free'"),pro:count('users',"membership = 'Pro'"),unlimited:count('users',"membership = 'Unlimited'")},revenueSimulation:{value:revenue,label:'$'+revenue.toLocaleString(),trend:null,sparkline:[]}});
});
router.get('/analytics',authenticateJwt,requireRole(staff),(req:AuthRequest,res:Response)=>{
 const days=({'7d':7,'30d':30,'90d':90,'1y':365} as Record<string,number>)[String(req.query.range)]||30;
 const dates=Array.from({length:days},(_,i)=>new Date(Date.now()-(days-1-i)*86400000).toISOString().slice(0,10));
 const start=dates[0]+'T00:00:00.000Z',end=dates[dates.length-1]+'T23:59:59.999Z';
 const rows=(table:string)=>db.prepare('SELECT * FROM '+table+' WHERE created_at >= ? AND created_at <= ?').all(start,end) as any[];
 const users=rows('users'),processes=rows('background_processes'),transactions=rows('transactions'),tickets=rows('support_tickets'),exports=rows('export_events');
 const userGrowth=dates.map(date=>({date,dailyNew:users.filter(x=>x.created_at.startsWith(date)).length,active:new Set([...processes,...exports].filter(x=>x.user_id&&x.created_at.startsWith(date)).map(x=>x.user_id)).size}));
 const imageProcessing=dates.map(name=>({name,successful:processes.filter(x=>x.created_at.startsWith(name)&&x.status==='Completed').length,failed:processes.filter(x=>x.created_at.startsWith(name)&&x.status==='Failed').length}));
 const exportFormats=['PNG','JPG','WEBP'].map((name,i)=>({name,value:exports.filter(x=>x.format===name).length,color:['#6366f1','#06b6d4','#a855f7'][i]}));
 const revenueSimulation=[...new Set(dates.map(x=>x.slice(0,7)))].map(month=>({month,...Object.fromEntries(['Paid','Pending','Failed'].map(status=>[status.toLowerCase(),transactions.filter(x=>x.created_at.startsWith(month)&&x.status===status).reduce((sum,x)=>sum+Number(x.amount),0)]))}));
 const ticketDistribution=['Pending','In Progress','Waiting for User','Resolved','Closed'].map((name,i)=>({name,count:tickets.filter(x=>x.status===name).length,color:['#f59e0b','#3b82f6','#8b5cf6','#10b981','#64748b'][i]}));
 const errors=processes.filter(x=>x.status==='Failed');
 const errorRate=[...new Set(errors.map(x=>x.error_message||'Tidak tercatat'))].map(category=>({category,count:errors.filter(x=>(x.error_message||'Tidak tercatat')===category).length}));
 const completed=processes.filter(x=>x.status==='Completed').length;
 const systemInsight=processes.length?completed+' dari '+processes.length+' proses berhasil dalam '+days+' hari. '+exports.length+' ekspor tercatat.':'Belum ada pemrosesan pada periode ini.';

 const models = [
   { key: 'ISNet', name: 'IS-Net DIS5K', color: '#6366f1', defaultLatency: 2200 },
   { key: 'BiRefNet', name: 'BiRefNet Swin', color: '#a855f7', defaultLatency: 5200 },
   { key: 'U2NetHumanSeg', name: 'U2Net Portrait', color: '#06b6d4', defaultLatency: 950 },
   { key: 'U2Net', name: 'U2Net Standard', color: '#10b981', defaultLatency: 1500 },
 ];

 const modelUsage = models.map(m => {
   const matching = processes.filter(x => {
     const u = (x.model_used || '').toLowerCase();
     if (m.key === 'ISNet') return u.includes('isnet') || u.includes('is-net');
     if (m.key === 'BiRefNet') return u.includes('birefnet');
     if (m.key === 'U2NetHumanSeg') return u.includes('human') || u.includes('portrait');
     return u.includes('u2net') && !u.includes('human');
   });
   const count = matching.length;
   const avgLatencyMs = count
     ? Math.round(matching.reduce((acc, cur) => acc + (cur.processing_time_ms || m.defaultLatency), 0) / count)
     : m.defaultLatency;
   return {
     name: m.name,
     count,
     avgLatencyMs,
     color: m.color,
   };
 });

 res.json({userGrowth,imageProcessing,exportFormats,revenueSimulation,ticketDistribution,errorRate,modelUsage,systemInsight,period:{start,end},activeDefinition:'Pengguna yang menjalankan proses AI atau ekspor pada hari tersebut'});
});

// GET /admin/audit-logs
router.get('/audit-logs', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Analyst']), (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '10', action, resource } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (resource) {
      query += ' AND resource = ?';
      params.push(resource);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const logs = db.prepare(query).all(...params);

    return res.json({
      data: logs.map((l: any) => ({
        id: l.id,
        adminId: l.admin_id,
        adminName: l.admin_name,
        action: l.action,
        resource: l.resource,
        resourceId: l.resource_id,
        oldValue: l.old_value,
        newValue: l.new_value,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        createdAt: l.created_at,
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

// GET /admin/audit-logs/export/csv
router.get('/audit-logs/export/csv', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const logs = db.prepare('SELECT created_at, admin_name, action, resource, resource_id, new_value, ip_address FROM audit_logs ORDER BY created_at DESC LIMIT 500').all() as any[];
    const headers = ['Waktu', 'Admin', 'Aksi', 'Resource', 'Resource ID', 'Nilai Baru', 'IP Address'];
    const rows = logs.map(l => [
      `"${l.created_at}"`,
      `"${(l.admin_name || '').replace(/"/g, '""')}"`,
      `"${l.action}"`,
      `"${l.resource}"`,
      `"${l.resource_id || ''}"`,
      `"${(l.new_value || '').replace(/"/g, '""')}"`,
      `"${l.ip_address || ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pixellift-audit-logs-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/audit-logs/:id
router.delete('/audit-logs/:id', authenticateJwt, requireRole(['Super Admin']), (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM audit_logs WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Log audit berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/audit-logs/clear
router.post('/audit-logs/clear', authenticateJwt, requireRole(['Super Admin']), (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM audit_logs').run();
    recordAuditLog(req, 'CLEAR_AUDIT_LOGS', 'AUDIT_LOG', null, null, 'Cleared all logs');
    return res.json({ message: 'Seluruh riwayat audit log telah dibersihkan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /admin/settings
router.get('/settings', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Analyst']), (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[];
    const settings: Record<string, any> = {};
    for (const r of rows) {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    }
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/settings/reset
router.post('/settings/reset', authenticateJwt, requireRole(['Super Admin']), (req: AuthRequest, res: Response) => {
  try {
    const defaults: Record<string, any> = {
      appName: 'Pixelift Lite Studio',
      contactEmail: 'support@pixellift.test',
      activeModel: 'ISNet',
      mockMode: false,
      maxUploadSizeMb: 10,
      confidenceThreshold: 50,
      jwtExpiryDays: 7,
      allowRegistration: true,
      darkModeDefault: true,
    };
    const now = new Date().toISOString();
    for (const [key, val] of Object.entries(defaults)) {
      const valStr = JSON.stringify(val);
      const existing = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
      if (existing) {
        db.prepare('UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?').run(valStr, now, key);
      } else {
        db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, valStr, now);
      }
    }
    recordAuditLog(req, 'RESET_SETTINGS', 'APP_SETTINGS', null, null, defaults);
    return res.json({ message: 'Pengaturan berhasil direset ke standar', settings: defaults });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/settings
router.patch('/settings', authenticateJwt, requireRole(['Super Admin']), (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    const now = new Date().toISOString();

    for (const [key, val] of Object.entries(updates)) {
      const valStr = JSON.stringify(val);
      const existing = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
      if (existing) {
        db.prepare('UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?').run(valStr, now, key);
      } else {
        db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, valStr, now);
      }
    }

    recordAuditLog(req, 'UPDATE_SETTINGS', 'APP_SETTINGS', null, null, updates);
    return res.json({ message: 'Pengaturan berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /admin/notifications
router.get('/notifications', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Support Admin']), (req: AuthRequest, res: Response) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20').all();
    return res.json(notifications);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/notifications (Broadcast notification)
router.post('/notifications', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { title, content, link, target = 'All' } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const id = `notif_${Date.now()}`;
    const now = new Date().toISOString();

    if (!['All','Free','Pro','Unlimited'].includes(target) || typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim() || title.length > 120 || content.length > 2000) return res.status(400).json({ error:'Judul, pesan, atau target tidak valid.' });
    const targetCount = target === 'All'
      ? db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'Active'").get().count
      : db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'Active' AND membership = ?").get(target).count;

    db.prepare(`
      INSERT INTO notifications (id, title, content, link, target, status, sent_count, created_at)
      VALUES (?, ?, ?, ?, ?, 'Sent', ?, ?)
    `).run(id, title, content, link || null, target, targetCount, now);

    recordAuditLog(req, 'BROADCAST_NOTIFICATION', 'NOTIFICATION', id, null, { title, target });
    return res.status(201).json({ id, title, target, sentCount: targetCount, status: 'Sent', createdAt: now });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


router.patch('/notifications/:id', authenticateJwt, requireRole(['Super Admin','Admin']), (req:AuthRequest,res:Response) => {
 const {title,content,target}=req.body;
 if(typeof title!=='string'||!title.trim()||title.length>120||typeof content!=='string'||!content.trim()||content.length>2000||!['All','Free','Pro','Unlimited'].includes(target))return res.status(400).json({error:'Pengumuman tidak valid.'});
 const old=db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
 if(!old)return res.status(404).json({error:'Pengumuman tidak ditemukan.'});
 const count=target==='All'?db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'Active'").get().count:db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'Active' AND membership = ?").get(target).count;
 db.prepare('UPDATE notifications SET title = ?, content = ?, target = ?, sent_count = ? WHERE id = ?').run(title.trim(),content.trim(),target,count,req.params.id);
 recordAuditLog(req,'UPDATE_NOTIFICATION','NOTIFICATION',req.params.id,old,{title,content,target});
 return res.json({message:'Pengumuman diperbarui.'});
});
router.delete('/notifications/:id', authenticateJwt, requireRole(['Super Admin','Admin']), (req:AuthRequest,res:Response) => {
 const old=db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
 if(!old)return res.status(404).json({error:'Pengumuman tidak ditemukan.'});
 db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
 recordAuditLog(req,'DELETE_NOTIFICATION','NOTIFICATION',req.params.id,old,null);
 return res.json({message:'Pengumuman dihapus.'});
});
export default router;
