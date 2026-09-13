import { toast, confirmAction } from '@pixellift/ui';
import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { Search, Flag, Check, Edit2, Trash2, AlertCircle } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getReports({ status: statusFilter, type: typeFilter });
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter, typeFilter]);

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;
    try {
      await adminApi.updateReport(activeReport.id, {
        status: newStatus || activeReport.status,
        resolutionNote,
      });
      toast.success('Laporan berhasil diperbarui');
      setActiveReport(null);
      loadReports();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui laporan');
    }
  };

  const handleDeleteReport = async (id: string, title: string) => {
    if (await confirmAction(`Hapus laporan "${title}"?`)) {
      try {
        await adminApi.deleteReport(id);
        toast.success('Laporan berhasil dihapus.');
        loadReports();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus laporan');
      }
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!search) return true;
    return (
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <span className="studio-eyebrow">QUALITY ASSURANCE & FEEDBACK</span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Kendala & Inakurasi AI</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tinjau laporan bug dari pengguna atau kasus segmentasi AI yang perlu disempurnakan.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul, penjelasan, pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
          >
            <option value="">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Investigating">Investigating</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
          >
            <option value="">Semua Tipe</option>
            <option value="Bug aplikasi">Bug aplikasi</option>
            <option value="Inakurasi AI">Inakurasi AI</option>
            <option value="Performa & Lemot">Performa & Lemot</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <span className="text-slate-400 text-xs">{filteredReports.length} Laporan ditemukan</span>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="p-3">Tipe Masalah</th>
                <th className="p-3">Judul Laporan</th>
                <th className="p-3">Pengguna</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Catatan Resolusi</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Memuat data laporan...
                  </td>
                </tr>
              ) : !filteredReports.length ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada laporan kendala yang cocok.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/20">
                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">{r.type}</td>
                    <td className="p-3 text-slate-900 dark:text-white font-medium max-w-[200px] truncate" title={r.title}>
                      {r.title}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{r.userName || 'Guest'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Resolved'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                            : r.status === 'Investigating'
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-500 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                      {r.resolutionNote || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReport(r);
                            setResolutionNote(r.resolutionNote || '');
                            setNewStatus(r.status);
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-colors"
                        >
                          Tinjau
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(r.id, r.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Hapus Laporan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#181832] w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tinjau Laporan Kendala</h3>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{activeReport.title}</div>
              <p className="text-slate-600 dark:text-slate-400">{activeReport.description}</p>
              {activeReport.imageUrl && (
                <div className="pt-2">
                  <span className="text-[10px] text-slate-400">Lampiran Gambar:</span>
                  <img
                    src={activeReport.imageUrl}
                    alt="Lampiran"
                    className="max-h-36 rounded-lg object-contain mt-1 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateReport} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Status Resolusi:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Catatan Resolusi Admin:</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan tindakan perbaikan atau penjelasan resolusi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReport(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Simpan Resolusi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
