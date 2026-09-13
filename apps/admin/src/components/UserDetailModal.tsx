import { toast } from '@pixellift/ui';
import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { X, User, Shield, Crown, Activity, Check, Save } from 'lucide-react';
import { RoleType, UserStatus, MembershipTier } from '@pixellift/types';

interface UserDetailModalProps {
  userId: string | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  userId,
  onClose,
  onUserUpdated,
}) => {
  const [data, setData] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleType>('User');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [membership, setMembership] = useState<MembershipTier>('Free');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setData(null);
    setPassword('');
    let active=true;
    const currentId = userId;
    async function load() {
      try {
        const res = await adminApi.getUser(currentId);
        const found = res.user;
        if (found && active) {
          setData(found);
          setName(found.name);
          setRole(found.role);
          setStatus(found.status);
          setMembership(found.membership);
        }
      } catch (err) {
        console.error('Failed to load user details:', err);
      }
    }
    load();
    return()=>{active=false;};
  }, [userId]);

  if (!userId || !data) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { name, role, status, membership };
      if (password) payload.password = password;
      await adminApi.updateUser(userId, payload);
      toast.success('Data pengguna berhasil diperbarui');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#181832] w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <img
              src={data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={data.name}
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500/40"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{data.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{data.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Data pengguna berhasil diperbarui!</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nama Lengkap:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Role Akses:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Support Admin">Support Admin</option>
                <option value="Content Admin">Content Admin</option>
                <option value="Analyst">Analyst</option>
                <option value="User">User</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Status Akun:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Paket Membership:</label>
              <select
                value={membership}
                onChange={(e) => setMembership(e.target.value as MembershipTier)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Free">Free</option>
                <option value="Pro">Pro</option>
                <option value="Unlimited">Unlimited</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Reset Password (opsional):
            </label>
            <input
              type="password"
              placeholder="Masukkan password baru untuk reset..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Activity summary pills */}
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Statistik Aktivitas
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{data.totalProjects || 0}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Project</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{data.totalProcesses || 0}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Proses AI</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">
                  {new Date(data.lastActiveAt).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Last Active</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                  {new Date(data.createdAt).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Terdaftar</div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-800"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-slate-900 dark:text-white shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
