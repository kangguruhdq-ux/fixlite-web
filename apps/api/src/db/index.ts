import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const dbPath = path.join(DB_DIR, 'pixellift.sqlite');

let sqlJsDb: SqlJsDatabase | null = null;

export async function getDbInstance(): Promise<SqlJsDatabase> {
  if (sqlJsDb) return sqlJsDb;

  const SQL = await initSqlJs();
  if (process.env.NODE_ENV !== 'test' && fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlJsDb = new SQL.Database(fileBuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }
  return sqlJsDb;
}

export function saveDb() {
  if (sqlJsDb && process.env.NODE_ENV !== 'test') {
    const data = sqlJsDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

/**
 * Convenient better-sqlite3-like wrapper interface over sql.js
 */
export const db = {
  exec(sql: string) {
    if (!sqlJsDb) throw new Error('Database not initialized. Call initDatabase() first.');
    sqlJsDb.run(sql);
    saveDb();
  },

  prepare(sql: string) {
    if (!sqlJsDb) throw new Error('Database not initialized. Call initDatabase() first.');
    return {
      run(...params: any[]) {
        if (!sqlJsDb) throw new Error('Database not initialized');
        sqlJsDb.run(sql, params);
        saveDb();
        return { changes: 1 };
      },

      get(...params: any[]) {
        if (!sqlJsDb) throw new Error('Database not initialized');
        const stmt = sqlJsDb.prepare(sql);
        try {
          stmt.bind(params);
          if (stmt.step()) {
            return stmt.getAsObject() as any;
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...params: any[]) {
        if (!sqlJsDb) throw new Error('Database not initialized');
        const stmt = sqlJsDb.prepare(sql);
        const results: any[] = [];
        try {
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      },
    };
  },
};

export async function initDatabase() {
  await getDbInstance();

  db.exec(`
    CREATE TABLE IF NOT EXISTS export_events (id TEXT PRIMARY KEY,user_id TEXT,format TEXT NOT NULL,width INTEGER,height INTEGER,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS process_inputs (process_id TEXT PRIMARY KEY,image_data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'User',
      membership TEXT NOT NULL DEFAULT 'Free',
      membership_expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      avatar_url TEXT,
      total_projects INTEGER NOT NULL DEFAULT 0,
      total_processes INTEGER NOT NULL DEFAULT 0,
      last_active_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      original_image_url TEXT NOT NULL,
      processed_image_url TEXT,
      thumbnail_url TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'png',
      width INTEGER NOT NULL DEFAULT 800,
      height INTEGER NOT NULL DEFAULT 800,
      status TEXT NOT NULL DEFAULT 'Draft',
      settings_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS background_processes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      model_used TEXT NOT NULL,
      processing_time_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'Queued',
      error_message TEXT,
      log TEXT,
      result_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      blur_level INTEGER DEFAULT 0,
      preview_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photo_filters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      settings_json TEXT NOT NULL,
      preview_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS aspect_ratios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ratio TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      tier TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      payment_method TEXT NOT NULL,
      invoice_number TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      assigned_admin_id TEXT,
      assigned_admin_name TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      last_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      attachment_url TEXT,
      is_internal_note INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      assigned_admin_id TEXT,
      resolution_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      link TEXT,
      target TEXT NOT NULL DEFAULT 'All',
      target_user_id TEXT,
      status TEXT NOT NULL DEFAULT 'Sent',
      sent_count INTEGER NOT NULL DEFAULT 0,
      scheduled_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 100,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Umum',
      order_index INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chatbot_knowledge (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      title TEXT NOT NULL,
      response TEXT NOT NULL,
      action_type TEXT,
      action_payload TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);
}
