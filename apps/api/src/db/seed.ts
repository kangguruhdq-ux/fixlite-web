import bcrypt from 'bcryptjs';
import { db, initDatabase } from './index';

export async function seedDatabase() {
  await initDatabase();
  seedSupportCatalog();
  if(!db.prepare("SELECT value FROM app_settings WHERE key='segmentationEngineV3'").get()) {
   const date=new Date().toISOString();
   db.prepare("INSERT OR REPLACE INTO app_settings (key,value,updated_at) VALUES ('activeModel',?,?)").run(JSON.stringify('ISNet'),date);
   db.prepare("INSERT OR REPLACE INTO app_settings (key,value,updated_at) VALUES ('confidenceThreshold',?,?)").run(JSON.stringify(50),date);
   db.prepare("INSERT INTO app_settings (key,value,updated_at) VALUES ('segmentationEngineV3','true',?)").run(date);
  }

  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (count.cnt > 0) {
    refreshUserCounts();
    return; // Already seeded
  }

  console.log('Seeding Pixelift Lite database...');

  const passwordHash = await bcrypt.hash('Demo123!', 10);
  const now = new Date().toISOString();
  const pastDate = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, membership, membership_expires_at, status, avatar_url, total_projects, total_processes, last_active_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    {
      id: 'usr_super_admin',
      name: 'Super Admin',
      email: 'admin@pixellift.test',
      role: 'Super Admin',
      membership: 'Unlimited',
      expires: null,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      projects: 20,
      processes: 68,
      lastActive: now,
      created: pastDate(90),
    },
    {
      id: 'usr_admin',
      name: 'Admin',
      email: 'admin2@pixellift.test',
      role: 'Admin',
      membership: 'Pro',
      expires: pastDate(-180),
      status: 'Suspended',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      projects: 14,
      processes: 42,
      lastActive: pastDate(2),
      created: pastDate(60),
    },
    {
      id: 'usr_john_doe',
      name: 'John Doe',
      email: 'john@pixellift.test',
      role: 'Support Admin',
      membership: 'Pro',
      expires: pastDate(-120),
      status: 'Suspended',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      projects: 5,
      processes: 19,
      lastActive: pastDate(1),
      created: pastDate(45),
    },
    {
      id: 'usr_chian_resin',
      name: 'Chian Resin',
      email: 'chian@pixellift.test',
      role: 'Support Admin',
      membership: 'Pro',
      expires: pastDate(-90),
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      projects: 8,
      processes: 31,
      lastActive: now,
      created: pastDate(30),
    },
    {
      id: 'usr_chian_broom',
      name: 'Chian Broom',
      email: 'broom@pixellift.test',
      role: 'Support Admin',
      membership: 'Pro',
      expires: pastDate(-90),
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      projects: 12,
      processes: 55,
      lastActive: now,
      created: pastDate(25),
    },
    {
      id: 'usr_sarah',
      name: 'Sarah Jenkins',
      email: 'user@pixellift.test',
      role: 'User',
      membership: 'Pro',
      expires: pastDate(-30),
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      projects: 18,
      processes: 45,
      lastActive: now,
      created: pastDate(15),
    },
    {
      id: 'usr_alex',
      name: 'Alex Rivera',
      email: 'alex@pixellift.test',
      role: 'User',
      membership: 'Free',
      expires: null,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      projects: 3,
      processes: 9,
      lastActive: pastDate(3),
      created: pastDate(10),
    },
  ];

  for (const u of users) {
    insertUser.run(
      u.id,
      u.name,
      u.email,
      passwordHash,
      u.role,
      u.membership,
      u.expires,
      u.status,
      u.avatar,
      u.projects,
      u.processes,
      u.lastActive,
      u.created,
      u.lastActive
    );
  }

  // 2. Seed Background Presets
  const insertPreset = db.prepare(`
    INSERT INTO presets (id, name, type, value, blur_level, preview_url, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const solidColors = [
    { id: 'pre_white', name: 'White', type: 'solid', value: '#FFFFFF' },
    { id: 'pre_black', name: 'Black', type: 'solid', value: '#0F172A' },
    { id: 'pre_gray', name: 'Light Gray', type: 'solid', value: '#E2E8F0' },
    { id: 'pre_blue', name: 'Blue', type: 'solid', value: '#3B82F6' },
    { id: 'pre_green', name: 'Green', type: 'solid', value: '#22C55E' },
    { id: 'pre_violet', name: 'Violet', type: 'solid', value: '#8B5CF6' },
    { id: 'pre_beige', name: 'Beige', type: 'solid', value: '#F5E6D3' },
  ];

  const gradients = [
    { id: 'pre_grad_indigo', name: 'Indigo Dream', type: 'gradient', value: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
    { id: 'pre_grad_sunset', name: 'Sunset Glow', type: 'gradient', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
    { id: 'pre_grad_ocean', name: 'Ocean Breeze', type: 'gradient', value: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' },
    { id: 'pre_grad_mint', name: 'Mint Fresh', type: 'gradient', value: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
    { id: 'pre_grad_studio', name: 'Studio Soft', type: 'gradient', value: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' },
  ];

  for (const p of [...solidColors, ...gradients]) {
    insertPreset.run(p.id, p.name, p.type, p.value, 0, null, 1, now);
  }

  // 3. Seed Photo Filters
  const insertFilter = db.prepare(`
    INSERT INTO photo_filters (id, name, category, settings_json, preview_url, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const filters = [
    {
      id: 'filt_natural',
      name: 'Natural',
      settings: { basic: { exposure: 0, brightness: 0, contrast: 5, highlights: 0, shadows: 0, whites: 0, blacks: 0 }, color: { temperature: 0, tint: 0, saturation: 5, vibrance: 10, hue: 0, colorIntensity: 10 }, detail: { sharpness: 10, clarity: 5, blur: 0, grain: 0, vignette: 0 } },
    },
    {
      id: 'filt_bright',
      name: 'Bright',
      settings: { basic: { exposure: 15, brightness: 10, contrast: 10, highlights: -10, shadows: 15, whites: 10, blacks: 5 }, color: { temperature: 2, tint: 0, saturation: 10, vibrance: 15, hue: 0, colorIntensity: 15 }, detail: { sharpness: 15, clarity: 10, blur: 0, grain: 0, vignette: 0 } },
    },
    {
      id: 'filt_warm',
      name: 'Warm',
      settings: { basic: { exposure: 5, brightness: 5, contrast: 8, highlights: -5, shadows: 10, whites: 5, blacks: 0 }, color: { temperature: 25, tint: 5, saturation: 12, vibrance: 15, hue: 0, colorIntensity: 20 }, detail: { sharpness: 10, clarity: 5, blur: 0, grain: 5, vignette: 10 } },
    },
    {
      id: 'filt_cool',
      name: 'Cool',
      settings: { basic: { exposure: 0, brightness: 5, contrast: 12, highlights: 5, shadows: 0, whites: 0, blacks: -5 }, color: { temperature: -25, tint: -5, saturation: 5, vibrance: 10, hue: 0, colorIntensity: 15 }, detail: { sharpness: 15, clarity: 15, blur: 0, grain: 0, vignette: 5 } },
    },
    {
      id: 'filt_film',
      name: 'Film',
      settings: { basic: { exposure: -5, brightness: 0, contrast: -10, highlights: -20, shadows: 25, whites: -15, blacks: 20 }, color: { temperature: 10, tint: 10, saturation: -15, vibrance: 0, hue: 5, colorIntensity: 10 }, detail: { sharpness: 5, clarity: -5, blur: 0, grain: 35, vignette: 25 } },
    },
    {
      id: 'filt_mono',
      name: 'Mono',
      settings: { basic: { exposure: 0, brightness: 0, contrast: 30, highlights: 10, shadows: -15, whites: 15, blacks: -20 }, color: { temperature: 0, tint: 0, saturation: -100, vibrance: -100, hue: 0, colorIntensity: 0 }, detail: { sharpness: 25, clarity: 20, blur: 0, grain: 15, vignette: 20 } },
    },
    {
      id: 'filt_vintage',
      name: 'Vintage',
      settings: { basic: { exposure: 5, brightness: 5, contrast: -15, highlights: -30, shadows: 20, whites: -20, blacks: 25 }, color: { temperature: 30, tint: 15, saturation: -20, vibrance: -10, hue: 10, colorIntensity: 15 }, detail: { sharpness: 5, clarity: -10, blur: 0, grain: 40, vignette: 35 } },
    },
    {
      id: 'filt_high_contrast',
      name: 'High Contrast',
      settings: { basic: { exposure: 10, brightness: 0, contrast: 45, highlights: 15, shadows: -30, whites: 20, blacks: -25 }, color: { temperature: 0, tint: 0, saturation: 20, vibrance: 25, hue: 0, colorIntensity: 25 }, detail: { sharpness: 30, clarity: 25, blur: 0, grain: 0, vignette: 15 } },
    },
  ];

  for (const f of filters) {
    insertFilter.run(f.id, f.name, 'General', JSON.stringify(f.settings), null, 1, now);
  }

  // 4. Seed Aspect Ratios
  const insertRatio = db.prepare(`
    INSERT INTO aspect_ratios (id, name, ratio, width, height, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const ratios = [
    { id: 'ar_orig', name: 'Original', ratio: 'orig', width: 0, height: 0 },
    { id: 'ar_1_1', name: '1:1', ratio: '1:1', width: 1, height: 1 },
    { id: 'ar_4_5', name: '4:5', ratio: '4:5', width: 4, height: 5 },
    { id: 'ar_3_4', name: '3:4', ratio: '3:4', width: 3, height: 4 },
    { id: 'ar_9_16', name: '9:16', ratio: '9:16', width: 9, height: 16 },
    { id: 'ar_16_9', name: '16:9', ratio: '16:9', width: 16, height: 9 },
  ];

  for (const r of ratios) {
    insertRatio.run(r.id, r.name, r.ratio, r.width, r.height, 1);
  }

  // 5. Seed Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (id, user_id, name, original_image_url, processed_image_url, thumbnail_url, format, width, height, status, settings_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleProjects = [
    {
      id: 'proj_1',
      userId: 'usr_super_admin',
      name: 'Super Admin Portrait',
      orig: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      format: 'png',
      width: 1200,
      height: 1200,
      status: 'Completed',
      created: pastDate(3),
    },
    {
      id: 'proj_2',
      userId: 'usr_sarah',
      name: 'Sarah Profile Photo',
      orig: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80',
      thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      format: 'png',
      width: 1080,
      height: 1080,
      status: 'Completed',
      created: pastDate(2),
    },
    {
      id: 'proj_3',
      userId: 'usr_alex',
      name: 'Alex Product Shot',
      orig: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      thumb: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80',
      format: 'jpg',
      width: 1000,
      height: 1000,
      status: 'In Progress',
      created: pastDate(1),
    },
  ];

  for (const p of sampleProjects) {
    insertProject.run(
      p.id,
      p.userId,
      p.name,
      p.orig,
      p.orig,
      p.thumb,
      p.format,
      p.width,
      p.height,
      p.status,
      null,
      p.created,
      p.created
    );
  }

  // 6. Seed Background Processes
  const insertProcess = db.prepare(`
    INSERT INTO background_processes (id, user_id, user_name, file_name, file_size, model_used, processing_time_ms, status, error_message, log, result_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const processes = [
    {
      id: 'proc_101',
      userId: 'usr_sarah',
      userName: 'Sarah Jenkins',
      fileName: 'portrait_headshot.jpg',
      fileSize: 2450000,
      model: 'RMBG-1.4 (Bria AI)',
      time: 680,
      status: 'Completed',
      error: null,
      log: 'Segmentation complete. Contours smoothed with alpha threshold 0.98.',
      result: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80',
      created: pastDate(1),
    },
    {
      id: 'proc_102',
      userId: 'usr_alex',
      userName: 'Alex Rivera',
      fileName: 'shoes_product_white.png',
      fileSize: 4120000,
      model: 'U2Net (rembg)',
      time: 920,
      status: 'Completed',
      error: null,
      log: 'Alpha mask extracted in 920ms.',
      result: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      created: pastDate(2),
    },
    {
      id: 'proc_103',
      userId: 'usr_alex',
      userName: 'Alex Rivera',
      fileName: 'complex_wireframe_art.png',
      fileSize: 8200000,
      model: 'RMBG-1.4',
      time: 3200,
      status: 'Failed',
      error: 'Low edge contrast, segmentation threshold timeout',
      log: '[ERROR] Pixel variance too low for background thresholding. Subject mask ambivalence > 0.45.',
      result: null,
      created: pastDate(0.5),
    },
    {
      id: 'proc_104',
      userId: 'usr_john_doe',
      userName: 'John Doe',
      fileName: 'family_gathering_outdoors.jpg',
      fileSize: 5200000,
      model: 'RMBG-1.4',
      time: null,
      status: 'Queued',
      error: null,
      log: 'Job queued for background removal worker.',
      result: null,
      created: now,
    },
  ];

  for (const proc of processes) {
    insertProcess.run(
      proc.id,
      proc.userId,
      proc.userName,
      proc.fileName,
      proc.fileSize,
      proc.model,
      proc.time,
      proc.status,
      proc.error,
      proc.log,
      proc.result,
      proc.created,
      proc.created
    );
  }

  // 7. Seed Transactions
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, user_id, user_name, tier, amount, status, payment_method, invoice_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const txs = [
    {
      id: 'tx_101',
      userId: 'usr_sarah',
      userName: 'Sarah Jenkins',
      tier: 'Pro',
      amount: 12.0,
      status: 'Paid',
      method: 'Credit Card (Simulated)',
      invoice: 'INV-2026-001',
      created: pastDate(15),
    },
    {
      id: 'tx_102',
      userId: 'usr_chian_resin',
      userName: 'Chian Resin',
      tier: 'Pro',
      amount: 12.0,
      status: 'Paid',
      method: 'E-Wallet (Simulated)',
      invoice: 'INV-2026-002',
      created: pastDate(28),
    },
    {
      id: 'tx_103',
      userId: 'usr_alex',
      userName: 'Alex Rivera',
      tier: 'Unlimited',
      amount: 29.0,
      status: 'Pending',
      method: 'Bank Transfer (Simulated)',
      invoice: 'INV-2026-003',
      created: pastDate(1),
    },
    {
      id: 'tx_104',
      userId: 'usr_john_doe',
      userName: 'John Doe',
      tier: 'Pro',
      amount: 12.0,
      status: 'Failed',
      method: 'Card Expired (Simulated)',
      invoice: 'INV-2026-004',
      created: pastDate(5),
    },
  ];

  for (const t of txs) {
    insertTx.run(
      t.id,
      t.userId,
      t.userName,
      t.tier,
      t.amount,
      t.status,
      t.method,
      t.invoice,
      t.created,
      t.created
    );
  }

  // 8. Seed Support Tickets & Messages
  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (id, user_id, user_name, user_email, subject, category, priority, assigned_admin_id, assigned_admin_name, status, last_message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tickets = [
    {
      id: '3825',
      userId: 'usr_sarah',
      userName: 'Sarah Jenkins',
      userEmail: 'user@pixellift.test',
      subject: 'Background removal artifact on fine hair strands',
      category: 'Background removal error',
      priority: 'Urgent',
      adminId: 'usr_super_admin',
      adminName: 'Super Admin',
      status: 'Pending',
      lastMessage: 'Halo, pada foto berambut keriting bagian samping terlihat sedikit terpotong.',
      created: pastDate(1),
    },
    {
      id: '3826',
      userId: 'usr_alex',
      userName: 'Alex Rivera',
      userEmail: 'alex@pixellift.test',
      subject: 'Payment verification for Pro plan',
      category: 'Payment',
      priority: 'Medium',
      adminId: 'usr_chian_resin',
      adminName: 'Chian Resin',
      status: 'In Progress',
      lastMessage: 'Status pembayaran saya masih pending padahal sudah konfirmasi.',
      created: pastDate(2),
    },
    {
      id: '3827',
      userId: 'usr_john_doe',
      userName: 'John Doe',
      userEmail: 'john@pixellift.test',
      subject: 'High resolution WEBP export not downloading',
      category: 'Export error',
      priority: 'High',
      adminId: 'usr_super_admin',
      adminName: 'Super Admin',
      status: 'In Progress',
      lastMessage: 'Tombol download WEBP sempat loading lama di Safari iOS.',
      created: pastDate(3),
    },
    {
      id: '3828',
      userId: 'usr_alex',
      userName: 'Alex Rivera',
      userEmail: 'alex@pixellift.test',
      subject: 'Request new background presets for jewelry photography',
      category: 'Preset',
      priority: 'Low',
      adminId: 'usr_chian_broom',
      adminName: 'Chian Broom',
      status: 'Resolved',
      lastMessage: 'Preset marmer dan studio velvet sudah ditambahkan!',
      created: pastDate(5),
    },
  ];

  for (const tk of tickets) {
    insertTicket.run(
      tk.id,
      tk.userId,
      tk.userName,
      tk.userEmail,
      tk.subject,
      tk.category,
      tk.priority,
      tk.adminId,
      tk.adminName,
      tk.status,
      tk.lastMessage,
      tk.created,
      tk.created
    );
  }

  // Messages for ticket 3825
  const insertMessage = db.prepare(`
    INSERT INTO support_messages (id, ticket_id, sender_id, sender_name, sender_role, message, attachment_url, is_internal_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMessage.run(
    'msg_1',
    '3825',
    'usr_sarah',
    'Sarah Jenkins',
    'User',
    'Halo admin, saya mencoba remove background portrait saya tapi ujung rambut terlihat agak blur dan kepotong.',
    null,
    0,
    pastDate(1)
  );

  insertMessage.run(
    'msg_2',
    '3825',
    'usr_super_admin',
    'Super Admin',
    'Super Admin',
    'Halo Sarah! Terima kasih laporannya. Anda dapat menggunakan fitur Manual Refinement dengan kuas Restore di panel kiri editor untuk mengembalikan helai rambut yang terpotong secara presisi.',
    null,
    0,
    pastDate(0.5)
  );

  // 9. Seed Reports
  const insertReport = db.prepare(`
    INSERT INTO reports (id, user_id, user_name, type, title, description, image_url, status, assigned_admin_id, resolution_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const reports = [
    {
      id: 'rep_1',
      userId: 'usr_sarah',
      userName: 'Sarah Jenkins',
      type: 'AI salah mengenali objek',
      title: 'Kacamata terpotong saat menghapus latar belakang',
      desc: 'Frame kacamata transparan ikut terhapus bersama background.',
      status: 'Reviewing',
      adminId: 'usr_super_admin',
      created: pastDate(2),
    },
    {
      id: 'rep_2',
      userId: 'usr_alex',
      userName: 'Alex Rivera',
      type: 'Bug aplikasi',
      title: 'Slider exposure meloncat di layar sentuh Android',
      desc: 'Saat menggeser slider cepat pada ponsel Android layar 90Hz, nilai exposure kadang reset ke 0.',
      status: 'Pending',
      adminId: null,
      created: pastDate(1),
    },
  ];

  for (const r of reports) {
    insertReport.run(
      r.id,
      r.userId,
      r.userName,
      r.type,
      r.title,
      r.desc,
      null,
      r.status,
      r.adminId,
      null,
      r.created,
      r.created
    );
  }

  // 10. Seed Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, admin_id, admin_name, action, resource, resource_id, old_value, new_value, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const auditLogs = [
    {
      id: 'aud_1',
      adminId: 'usr_super_admin',
      adminName: 'Super Admin',
      action: 'LOGIN',
      resource: 'AUTH',
      resourceId: null,
      oldVal: null,
      newVal: 'Success (JWT issued)',
      ip: '192.168.1.101',
      created: pastDate(0.2),
    },
    {
      id: 'aud_2',
      adminId: 'usr_super_admin',
      adminName: 'Super Admin',
      action: 'UPDATE_STATUS',
      resource: 'USER',
      resourceId: 'usr_admin',
      oldVal: 'Active',
      newVal: 'Suspended',
      ip: '192.168.1.101',
      created: pastDate(1),
    },
    {
      id: 'aud_3',
      adminId: 'usr_chian_resin',
      adminName: 'Chian Resin',
      action: 'REPLY_TICKET',
      resource: 'SUPPORT_TICKET',
      resourceId: '3826',
      oldVal: 'Pending',
      newVal: 'In Progress',
      ip: '192.168.1.108',
      created: pastDate(2),
    },
  ];

  for (const a of auditLogs) {
    insertAudit.run(
      a.id,
      a.adminId,
      a.adminName,
      a.action,
      a.resource,
      a.resourceId,
      a.oldVal,
      a.newVal,
      a.ip,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      a.created
    );
  }

  // 11. Seed App Settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  const defaultSettings = {
    appName: 'Pixelift Lite',
    logoUrl: '/brand-logo.svg',
    faviconUrl: '/favicon.ico',
    description: 'Free background remover and light photo editor for online sellers and creators.',
    language: 'id',
    timezone: 'Asia/Jakarta',
    maxFileSizeMb: 10,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    dailyFreeLimit: 10,
    tempRetentionHours: 24,
    activeModel: 'BiRefNet',
    mockMode: false,
    confidenceThreshold: 0.85,
    retryLimit: 3,
    processingTimeoutSec: 15,
    defaultTier: 'Free',
    proPriceMonthly: 12.0,
    unlimitedPriceMonthly: 29.0,
    jwtExpiresIn: '7d',
    sessionTimeoutMinutes: 60,
    rateLimitPerMinute: 120,
    maintenanceMode: false,
    allowedAdminDomains: ['pixellift.test', 'gmail.com'],
    primaryColor: '#4F46E5',
    defaultTheme: 'system',
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, JSON.stringify(v), now);
  }

  refreshUserCounts();
  console.log('Database seeded successfully!');
}

function seedSupportCatalog() {
 if(db.prepare("SELECT value FROM app_settings WHERE key = 'supportCatalogV1'").get()) return;
 const now=new Date().toISOString();
 const pastDate=(days:number)=>new Date(Date.now()-days*86400000).toISOString();
  // 12. Seed Coupons
  const insertCoupon = db.prepare(`
    INSERT OR IGNORE INTO coupons (id, code, discount_percent, discount_amount, max_uses, used_count, expires_at, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const defaultCoupons = [
    { id: 'cpn_sellerbaru', code: 'SELLERBARU', percent: 30, amount: 0, maxUses: 500, expires: pastDate(-60) },
    { id: 'cpn_hemat50', code: 'HEMAT50', percent: 50, amount: 0, maxUses: 200, expires: pastDate(-30) },
    { id: 'cpn_potongan5', code: 'POTONGAN5', percent: 0, amount: 5, maxUses: 300, expires: pastDate(-45) },
    { id: 'cpn_promo100', code: 'PROMO100', percent: 100, amount: 0, maxUses: 50, expires: pastDate(-14) },
  ];

  for (const c of defaultCoupons) {
    insertCoupon.run(c.id, c.code, c.percent, c.amount, c.maxUses, 0, c.expires, 1, now);
  }

  // 13. Seed FAQs
  const insertFaq = db.prepare(`
    INSERT OR IGNORE INTO faqs (id, question, answer, category, order_index, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const defaultFaqs = [
    {
      id: 'faq_1',
      question: 'Bagaimana cara kerja penghapus background AI Pixelift Lite?',
      answer: 'Pixelift Lite menggunakan model AI deep learning U2Net untuk mendeteksi objek utama (produk, orang, hewan, perhiasan) secara otomatis dan memisahkan latar belakang dengan akurasi tepi yang presisi dengan waktu proses sesuai ukuran foto dan kapasitas server.',
      category: 'Fitur Utama',
      order: 1,
    },
    {
      id: 'faq_2',
      question: 'Apakah ada batasan jumlah foto yang bisa diproses per hari?',
      answer: 'Akun Free mendapatkan kuota 10 proses per hari secara gratis. Untuk kebutuhan toko online dan kreator, paket Pro menyediakan 250 proses/hari dan paket Unlimited menyediakan pemrosesan tanpa batas.',
      category: 'Akun & Kuota',
      order: 2,
    },
    {
      id: 'faq_3',
      question: 'Format file apa saja yang didukung untuk upload dan export?',
      answer: 'Kami mendukung format upload JPEG, PNG, dan WEBP hingga ukuran 10MB. Hasil akhir dapat diexport sebagai PNG transparan atau JPEG berkualitas tinggi dengan preset ukuran sosmed & marketplace.',
      category: 'Format & File',
      order: 3,
    },
    {
      id: 'faq_4',
      question: 'Bagaimana cara memproses banyak foto sekaligus (Batch)?',
      answer: 'Klik menu "Batch AI (Massal)" di navigasi atas, pilih atau seret hingga 20 foto produk sekaligus. Sistem akan memproses seluruh antrean dan Anda bisa mengunduh semuanya dalam 1 file ZIP.',
      category: 'Fitur Utama',
      order: 4,
    },
    {
      id: 'faq_5',
      question: 'Bagaimana cara menambahkan bayangan studio pada foto produk?',
      answer: 'Di panel editor foto, buka tab "Bayangan & Studio". Anda dapat mengaktifkan Drop Shadow atau Floor Shadow untuk memberikan efek kontak bayangan realistis di lantai agar produk tidak tampak melayang.',
      category: 'Editor Foto',
      order: 5,
    },
    {
      id: 'faq_6',
      question: 'Bagaimana cara menghubungi tim bantuan dan melampirkan bukti screenshot?',
      answer: 'Buka tab "Tiket Bantuan", klik "Kirim Tiket Baru", lalu unggah gambar screenshot kendala Anda melalui tombol unggah lampiran. Tim kami akan merespons melalui obrolan tiket melalui halaman tiket.',
      category: 'Bantuan & Tiket',
      order: 6,
    },
  ];

  for (const f of defaultFaqs) {
    insertFaq.run(f.id, f.question, f.answer, f.category, f.order, 1, now, now);
  }

  // 14. Seed Chatbot Knowledge Base
  const insertChatbot = db.prepare(`
    INSERT OR IGNORE INTO chatbot_knowledge (id, keyword, title, response, action_type, action_payload, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const defaultChatbot = [
    {
      id: 'cb_1',
      keyword: 'cara hapus background',
      title: 'Cara Hapus Background',
      response: 'Cukup unggah foto produk Anda di halaman Studio Editor, lalu klik tombol "Remove Background AI". Setelah proses AI selesai, background Anda akan terhapus bersih secara otomatis!',
      actionType: 'navigate',
      actionPayload: '/editor',
    },
    {
      id: 'cb_2',
      keyword: 'format file',
      title: 'Format File Didukung',
      response: 'Pixelift Lite mendukung format file JPEG, PNG, dan WEBP hingga 10MB. Anda dapat mengunduh hasil cutout transparan beresolusi tinggi.',
      actionType: 'info',
      actionPayload: '',
    },
    {
      id: 'cb_3',
      keyword: 'kuota limit',
      title: 'Limit & Kuota Akun',
      response: 'Akun gratis mendapatkan 10 remove background per hari. Anda dapat upgrade ke paket Pro (250/hari) atau Unlimited (tanpa batas) untuk kuota lebih besar.',
      actionType: 'navigate',
      actionPayload: '/subscription',
    },
    {
      id: 'cb_4',
      keyword: 'tiket bantuan support',
      title: 'Hubungi Tim Support',
      response: 'Tim bantuan teknis kami siap mendampingi Anda. Silakan buat tiket bantuan baru dan lampirkan screenshot kendala untuk penanganan cepat.',
      actionType: 'action',
      actionPayload: 'open_ticket_tab',
    },
    {
      id: 'cb_5',
      keyword: 'batch hapus massal',
      title: 'Hapus Background Massal (Batch)',
      response: 'Fitur Batch AI memungkinkan Anda mengunggah hingga 20 foto produk sekaligus dan mengunduh seluruh hasilnya dalam 1 arsip ZIP.',
      actionType: 'action',
      actionPayload: 'open_batch_modal',
    },
  ];

  for (const c of defaultChatbot) {
    insertChatbot.run(c.id, c.keyword, c.title, c.response, c.actionType, c.actionPayload, 1, now);
  }


 db.prepare("INSERT OR REPLACE INTO app_settings (key,value,updated_at) VALUES ('supportCatalogV1','true',?)").run(now);
 db.prepare("INSERT OR REPLACE INTO app_settings (key,value,updated_at) VALUES ('activeModel',?,?)").run(JSON.stringify('U2Net'),now);
 db.prepare("INSERT OR REPLACE INTO app_settings (key,value,updated_at) VALUES ('mockMode','false',?)").run(now);
}

function refreshUserCounts() {
 db.prepare("UPDATE users SET total_projects=(SELECT COUNT(*) FROM projects WHERE user_id=users.id), total_processes=(SELECT COUNT(*) FROM background_processes WHERE user_id=users.id AND status='Completed')").run();
}
