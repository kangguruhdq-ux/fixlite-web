import { toast, confirmAction, useLanguage } from '@pixellift/ui';
import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { Search, Plus, Download, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { UserDetailModal } from '../components/UserDetailModal';

export const UsersPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy,setBusy] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // New user modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('User');
  const [newMembership, setNewMembership] = useState('Free');

  const loadUsers = async () => {
    try {
      const res = await adminApi.getUsers({
        search,
        role: roleFilter,
        status: statusFilter,
        membership: membershipFilter,
        page: page.toString(),
        limit: '10',
      });
      setUsers(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalUsers(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter, membershipFilter, page]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    try {
      await adminApi.createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        membership: newMembership,
      });
      toast.success('Pengguna baru berhasil ditambahkan');
      setIsAddOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat pengguna');
    } finally { setBusy(false); }
  };

  const handleBulkAction = async (action: 'suspend' | 'activate' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (await confirmAction(`Jalankan aksi '${action}' pada ${selectedIds.length} user?`)) {
      try { await adminApi.bulkUsers(selectedIds, action); toast.success("Perubahan pengguna berhasil disimpan."); } catch(e) { toast.error((e as Error).message); return; }
      setSelectedIds([]);
      loadUsers();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('Manajemen Pengguna', 'User Management')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Kelola seluruh akun pengguna, peran, status langganan, dan riwayat aktivitas.', 'Manage all user accounts, roles, subscription statuses, and activity history.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adminApi.exportUsersCsv().then(()=>toast.success(t("Ekspor CSV dimulai.", "CSV export started."))).catch(e=>toast.error(e.message))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('Export CSV', 'Export CSV')}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Tambah User', 'Add User')}</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder={t('Cari nama atau email...', 'Search name or email...')}
              value={search}
              onChange={(e) => {setSearch(e.target.value);setPage(1);setSelectedIds([]);}}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {setRoleFilter(e.target.value);setPage(1);setSelectedIds([]);}}
            className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
          >
            <option value="">{t('Semua Role', 'All Roles')}</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="Support Admin">Support Admin</option>
            <option value="Content Admin">Content Admin</option>
            <option value="Analyst">Analyst</option>
            <option value="User">User</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {setStatusFilter(e.target.value);setPage(1);setSelectedIds([]);}}
            className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
          >
            <option value="">{t('Semua Status', 'All Statuses')}</option>
            <option value="Active">{t('Active', 'Active')}</option>
            <option value="Suspended">{t('Suspended', 'Suspended')}</option>
            <option value="Pending">{t('Pending', 'Pending')}</option>
          </select>

          <select
            value={membershipFilter}
            onChange={(e) => {setMembershipFilter(e.target.value);setPage(1);setSelectedIds([]);}}
            className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
          >
            <option value="">{t('Semua Paket', 'All Plans')}</option>
            <option value="Free">Free</option>
            <option value="Pro">Pro</option>
            <option value="Unlimited">Unlimited</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBulkAction('suspend')}
              className="px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            >
              {t('Tangguhkan', 'Suspend')} ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('activate')}
              className="px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
            >
              {t('Aktifkan', 'Activate')}
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('delete')}
              className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
            >
              {t('Hapus', 'Delete')}
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(users.map((u) => u.id));
                      else setSelectedIds([]);
                    }}
                    checked={selectedIds.length === users.length && users.length > 0}
                    className="rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-indigo-600"
                  />
                </th>
                <th className="p-3">{t('Pengguna', 'User')}</th>
                <th className="p-3">{t('Email', 'Email')}</th>
                <th className="p-3">{t('Role', 'Role')}</th>
                <th className="p-3">{t('Membership', 'Membership')}</th>
                <th className="p-3">{t('Status', 'Status')}</th>
                <th className="p-3">{t('Proyek', 'Projects')}</th>
                <th className="p-3">{t('Terakhir Aktif', 'Last Active')}</th>
                <th className="p-3">{t('Aksi', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {!users.length && <tr><td colSpan={9} className="p-8 text-center">{t('Tidak ada pengguna yang cocok.', 'No matching users found.')}</td></tr>}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(u.id) ? prev.filter((i) => i !== u.id) : [...prev, u.id]
                        )
                      }
                      className="rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-indigo-600"
                    />
                  </td>
                  <td className="p-3 flex items-center gap-2.5">
                    <img
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={u.name}
                      className="w-7 h-7 rounded-xl object-cover ring-1 ring-slate-700"
                    />
                    <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">{u.name}</span>
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role.includes('Admin')
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-semibold ${
                        u.membership === 'Pro'
                          ? 'text-amber-400'
                          : u.membership === 'Unlimited'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {u.membership}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{u.totalProjects}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                    {new Date(u.lastActiveAt).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID')}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveUserId(u.id)}
                        className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-800"
                        title={t("Edit User", "Edit User")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirmAction(t("Hapus pengguna", "Delete user") + ` ${u.name}?`)) {
                            adminApi.deleteUser(u.id).then(() => { toast.success(t('Akun berhasil dihapus.', 'Account deleted successfully.')); loadUsers(); }).catch(e=>toast.error(e.message));
                          }
                        }}
                        className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title={t("Hapus", "Delete")}
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

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>{t('Menampilkan', 'Showing')} {users.length} {t('dari total', 'of total')} {totalUsers} {t('pengguna', 'users')}</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
            >
              {t('Sebelumnya', 'Prev')}
            </button>
            <span className="px-2 font-bold text-slate-900 dark:text-white">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
            >
              {t('Berikutnya', 'Next')}
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#181832] w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('Tambah Pengguna Baru', 'Add New User')}</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">{t('Nama Lengkap:', 'Full Name:')}</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">{t('Email:', 'Email:')}</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">{t('Password:', 'Password:')}</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">{t('Role:', 'Role:')}</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                    <option value="Support Admin">Support Admin</option>
                    <option value="Content Admin">Content Admin</option>
                    <option value="Analyst">Analyst</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">{t('Membership:', 'Membership:')}</label>
                  <select
                    value={newMembership}
                    onChange={(e) => setNewMembership(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Unlimited">Unlimited</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  {t('Batal', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-slate-900 dark:text-white shadow-md"
                >
                  {busy ? t("Menyimpan...", "Saving...") : t("Simpan User", "Save User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Edit Modal */}
      <UserDetailModal
        userId={activeUserId}
        onClose={() => setActiveUserId(null)}
        onUserUpdated={loadUsers}
      />
    </div>
  );
};
