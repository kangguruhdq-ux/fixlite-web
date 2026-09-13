import { Router, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { db } from '../db';
import { optionalJwt, AuthRequest, authenticateJwt, requireRole } from '../middleware/auth';
import { getBackgroundRemovalService } from '@pixellift/services';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap gunakan JPG, PNG, atau WEBP.'));
    }
  },
});

// POST /background/remove
router.post('/remove', optionalJwt, upload.single('image'), async (req: AuthRequest, res: Response) => {
  let fileBuffer: Buffer | null = null;
  let originalName = 'upload.png';
  let fileSize = 0;

  if (req.file) {
    fileBuffer = req.file.buffer;
    originalName = req.file.originalname;
    fileSize = req.file.size;
  } else if (req.body.imageBase64) {
    const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    fileBuffer = Buffer.from(base64Data, 'base64');
    fileSize = fileBuffer.length;
    originalName = req.body.fileName || 'web_canvas_upload.png';
  } else {
    return res.status(400).json({ error: 'Tidak ada file gambar yang dikirim' });
  }

  if(fileSize>10*1024*1024)return res.status(400).json({error:'Ukuran file maksimal 10 MB.'});
  // Validate resolution
  try {
    const meta = await sharp(fileBuffer,{limitInputPixels:25000000}).metadata();
    if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) {
      return res.status(400).json({ error: 'Resolusi gambar terlalu kecil. Minimal 200 x 200 piksel.' });
    }
  } catch (err: any) {
    return res.status(400).json({ error: 'Gambar rusak atau tidak dapat dibaca: ' + err.message });
  }

  const procId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const userId = req.user?.id || null;
  const userName = req.user?.name || 'Guest User';

  // Read AI settings from database
  let activeModel = 'ISNet';
  let mockMode = false;
  let confidenceThreshold = 0.5;
  try {
    const modelSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'activeModel'").get() as any;
    const mockSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'mockMode'").get() as any;
    const confSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'confidenceThreshold'").get() as any;
    if (modelSetting) activeModel = JSON.parse(modelSetting.value);
    if (mockSetting) mockMode = JSON.parse(mockSetting.value);
    if (confSetting) confidenceThreshold = JSON.parse(confSetting.value);
  } catch {}

  // Prioritize requested model from client if specified
  const requestedModel = req.body.model || activeModel;
  const service = getBackgroundRemovalService(requestedModel, false);
  const modelName = service.name;

  // Record initial process
  db.prepare(`
    INSERT INTO background_processes (id, user_id, user_name, file_name, file_size, model_used, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Processing', ?, ?)
  `).run(procId, userId, userName, originalName, fileSize, modelName, now, now);

  db.prepare('INSERT INTO process_inputs (process_id,image_data) VALUES (?,?)').run(procId,fileBuffer.toString('base64'));
  try {
    const confThresh = req.body.confidenceThreshold !== undefined && req.body.confidenceThreshold !== ''
      ? Number(req.body.confidenceThreshold)
      : confidenceThreshold;

    const result = await service.removeBackground(fileBuffer, {
      confidenceThreshold: confThresh,
      refinementLevel: (req.body.refinementLevel as any) || 'high',
      edgeFeathering: req.body.edgeFeathering ? Number(req.body.edgeFeathering) : undefined,
    });

    const base64Result = `data:image/png;base64,${result.resultBuffer.toString('base64')}`;

    db.prepare(`
      UPDATE background_processes
      SET status = 'Completed', processing_time_ms = ?, result_url = ?, log = ?, updated_at = ?
      WHERE id = ?
    `).run(
      result.executionTimeMs,
      base64Result,
      `Background removed successfully using ${result.modelUsed} via local ONNX inference.`,
      new Date().toISOString(),
      procId
    );

    // Update user process count if authenticated
    if (userId) {
      db.prepare('UPDATE users SET total_processes = total_processes + 1 WHERE id = ?').run(userId);
    }

    return res.json({
      processId: procId,
      resultImageUrl: base64Result,
      executionTimeMs: result.executionTimeMs,
      confidence: result.confidence,
      modelUsed: result.modelUsed,
      isMock: false,
    });
  } catch (err: any) {
    db.prepare(`
      UPDATE background_processes
      SET status = 'Failed', error_message = ?, updated_at = ?
      WHERE id = ?
    `).run(err.message, new Date().toISOString(), procId);

    return res.status(500).json({
      error: 'Gagal memproses gambar: ' + err.message,
      processId: procId,
    });
  }
});

// GET /background/processes
router.get('/processes', authenticateJwt, requireRole(['Super Admin', 'Admin', 'Analyst']), (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM background_processes WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (file_name LIKE ? OR user_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const processes = db.prepare(query).all(...params);

    return res.json({
      data: processes.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        userName: p.user_name,
        fileName: p.file_name,
        fileSize: p.file_size,
        modelUsed: p.model_used,
        processingTimeMs: p.processing_time_ms,
        status: p.status,
        errorMessage: p.error_message,
        log: p.log,
        resultUrl: p.result_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
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


router.post('/processes/:id/retry',authenticateJwt,requireRole(['Super Admin','Admin']),async(req:AuthRequest,res:Response)=>{
 const id=req.params.id,proc=db.prepare('SELECT * FROM background_processes WHERE id = ?').get(id) as any;
 if(!proc)return res.status(404).json({error:'Proses tidak ditemukan.'});
 if(proc.status==='Processing')return res.status(409).json({error:'Proses masih berjalan.'});
 const input=db.prepare('SELECT image_data FROM process_inputs WHERE process_id = ?').get(id) as any;
 if(!input)return res.status(409).json({error:'Foto sumber proses lama tidak tersedia. Unggah ulang foto melalui editor.'});
 db.prepare("UPDATE background_processes SET status='Processing',error_message=NULL WHERE id=?").run(id);
 try{
  const result=await getBackgroundRemovalService().removeBackground(Buffer.from(input.image_data,'base64'));
  const url='data:image/png;base64,'+result.resultBuffer.toString('base64');
  db.prepare("UPDATE background_processes SET status='Completed',result_url=?,model_used=?,processing_time_ms=?,log=?,updated_at=? WHERE id=?").run(url,result.modelUsed,result.executionTimeMs,'Inferensi neural ulang oleh admin.',new Date().toISOString(),id);
  if(proc.user_id&&proc.status!=='Completed')db.prepare('UPDATE users SET total_processes=total_processes+1 WHERE id=?').run(proc.user_id);
  res.json({id,message:'Pemrosesan ulang selesai.',resultImageUrl:url});
 }catch(error:any){db.prepare("UPDATE background_processes SET status='Failed',error_message=?,updated_at=? WHERE id=?").run(error.message,new Date().toISOString(),id);res.status(503).json({error:error.message});}
});
router.post('/exports',optionalJwt,(req:AuthRequest,res:Response)=>{
 const {id,format,width,height}=req.body;
 if(typeof id!=='string'||id.length>100||!['PNG','JPG','WEBP'].includes(format)||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)return res.status(400).json({error:'Data ekspor tidak valid.'});
 db.prepare('INSERT OR IGNORE INTO export_events (id,user_id,format,width,height,created_at) VALUES (?,?,?,?,?,?)').run(id,req.user?.id||null,format,width,height,new Date().toISOString());
 res.status(201).json({id});
});

// DELETE /background/processes/:id
router.delete('/processes/:id', authenticateJwt, requireRole(['Super Admin', 'Admin']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const proc = db.prepare('SELECT * FROM background_processes WHERE id = ?').get(id) as any;
    if (!proc) return res.status(404).json({ error: 'Proses tidak ditemukan' });

    db.prepare('DELETE FROM process_inputs WHERE process_id = ?').run(id);
    db.prepare('DELETE FROM background_processes WHERE id = ?').run(id);
    return res.json({ message: 'Riwayat proses berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/processes/mock',authenticateJwt,requireRole(['Super Admin','Admin']),(_req,res)=>res.status(410).json({error:'Simulasi dinonaktifkan. Unggah foto melalui editor untuk menjalankan model U2Net.'}));
export default router;
