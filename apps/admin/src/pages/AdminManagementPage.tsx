import { toast, confirmAction } from '@pixellift/ui';
import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { ShieldCheck, Plus, Trash2, Edit2, Shield } from 'lucide-react';
import { UserDetailModal } from '../components/UserDetailModal';

export const AdminManagementPage: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [activeAdminId, setActiveAdminId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');

  const loadAdmins = async () => {
    try {
      const res = await adminApi.getUsers({ limit: '50' });
      // Filter out regular users
      const adminList = (res.data || []).filter((u: any) => u.role !== 'User');
      setAdmins(adminList);
    } catch (err) {
      console.error('Failed to load admins:', err);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createUser({
        name,
        email,
        password,
        role,
        membership: 'Unlimited',
      });
      toast.success('Admin baru berhasil ditambahkan');
      setIsAddOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      loadAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan admin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Management & Hak Akses Role</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola staf administrator, penugasan role (Super Admin, Admin, Support, Content, Analyst).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Staf Admin</span>
        </button>
      </div>

      {/* Role Matrix Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="font-bold text-indigo-600 dark:text-indigo-400">Super Admin</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Akses penuh semua menu, kelola admin, hapus data.</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="font-bold text-indigo-700 dark:text-indigo-300">Admin</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Kelola pengguna, project, transaksi, dan laporan.</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="font-bold text-indigo-200">Support Admin</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Kelola tiket bantuan, balas live chat pelanggan.</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="font-bold text-indigo-200">Content Admin</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Kelola background presets, filter Lightroom, rasio.</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="font-bold text-slate-500 dark:text-slate-400">Analyst</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Hanya melihat dashboard dan grafik analitik.</p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="p-3">Admin</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Active</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {admins.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-800/30">
                  <td className="p-3 flex items-center gap-2.5">
                    <img
                      src={adm.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                      alt={adm.name}
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-indigo-500/40"
                    />
                    <span className="font-semibold text-slate-900 dark:text-white">{adm.name}</span>
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{adm.email}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {adm.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        adm.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {adm.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                    {new Date(adm.lastActiveAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveAdminId(adm.id)}
                        className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Edit Admin"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirmAction(`Hapus admin ${adm.name}?`)) {
                            adminApi.deleteUser(adm.id).then(() => { toast.success('Akun berhasil dihapus.'); loadAdmins(); }).catch(e=>toast.error(e.message));
                          }
                        }}
                        className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="Hapus Admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Admin Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#181832] w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Staf Admin Baru</h3>
            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Email:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Role Penugasan:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Support Admin">Support Admin</option>
                  <option value="Content Admin">Content Admin</option>
                  <option value="Analyst">Analyst</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-slate-900 dark:text-white shadow-md"
                >
                  Simpan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UserDetailModal
        userId={activeAdminId}
        onClose={() => setActiveAdminId(null)}
        onUserUpdated={loadAdmins}
      />
    </div>
  );
};
