import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { toast, confirmAction } from '@pixellift/ui';
import { Search, ShieldCheck, Download, Trash2, RefreshCw, AlertTriangle, Filter } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({ action: actionFilter, limit: '50' });
      setAuditLogs(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat catatan audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleDeleteLog = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Rekaman Audit Log',
      message: 'Apakah Anda yakin ingin menghapus catatan audit trail ini dari database?',
      confirmText: 'Hapus Log',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await adminApi.deleteAuditLog(id);
      toast.success('Rekaman log berhasil dihapus.');
      setAuditLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus log');
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirmAction({
      title: 'Bersihkan Seluruh Audit Trail',
      message: 'PERINGATAN: Seluruh rekaman jejak audit sistem akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Bersihkan Semua',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await adminApi.clearAuditLogs();
      toast.success('Seluruh catatan audit trail berhasil dibersihkan.');
      setAuditLogs([]);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membersihkan audit logs');
    }
  };

  const handleExportCsv = async () => {
    try {
      await adminApi.exportAuditLogsCsv();
      toast.success('Audit trail CSV berhasil diunduh.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor CSV');
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.adminName?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.resource?.toLowerCase().includes(q) ||
      l.newValue?.toLowerCase().includes(q) ||
      l.ipAddress?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            <span>Sistem Audit Trail & Jejak Aktivitas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Catatan kepatuhan dan keamanan dari setiap tindakan administratif untuk transparansi dan investigasi insiden.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Semua</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari admin, aksi, resource, atau rincian nilai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14132b] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14132b] text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Semua Kategori Aksi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
          </select>

          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14132b] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Admin Pelaksana</th>
                <th className="p-3">Aksi</th>
                <th className="p-3">Resource Target</th>
                <th className="p-3">Detail Nilai / Parameter</th>
                <th className="p-3">IP Address</th>
                <th className="p-3 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">Tidak ada log aktivitas yang cocok.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{l.adminName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                        l.action?.includes('DELETE')
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                          : l.action?.includes('CREATE')
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : l.action?.includes('LOGIN')
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300 font-medium">{l.resource}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 truncate max-w-[240px] font-mono text-[11px]" title={l.newValue}>
                      {l.newValue || '-'}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{l.ipAddress || '127.0.0.1'}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(l.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Hapus Log Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
