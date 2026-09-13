import { db } from '../db';
import { AuthRequest } from './auth';

export function recordAuditLog(
  req: AuthRequest,
  action: string,
  resource: string,
  resourceId?: string | null,
  oldValue?: any,
  newValue?: any
) {
  try {
    const adminId = req?.user?.id || 'system';
    const adminName = req?.user?.name || 'System';
    const ipAddress = (req?.headers?.['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown';
    const logId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const oldStr = oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null;
    const newStr = newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null;

    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, action, resource, resource_id, old_value, new_value, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      adminId,
      adminName,
      action,
      resource,
      resourceId || null,
      oldStr,
      newStr,
      ipAddress,
      userAgent,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}
