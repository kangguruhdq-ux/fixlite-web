import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, FolderOpen, Scissors, Pencil, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { Dialog, toast, confirmAction, useLanguage } from '@pixellift/ui';
import { adminApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

export function ProjectsPage() {
  const location = useLocation();
  const { hasPermission } = useAdminAuth();
  const { t } = useLanguage();
  const canWrite = hasPermission(['Admin']);

  const [tab, setTab] = useState(location.pathname === '/background-removal' ? 'queue' : 'projects');
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [projectStatus, setProjectStatus] = useState('Draft');

  const request = useRef(0);

  const load = async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const params = { search, status, page: String(page), limit: '12' };
      const result = tab === 'projects' ? await adminApi.getProjects(params) : await adminApi.getProcesses(params);
      if (id !== request.current) return;
      setRows(result.data || []);
      setPages(Math.max(1, result.pagination?.totalPages || 1));
      setTotal(result.pagination?.total || 0);
      setError('');
      if (result.pagination?.totalPages && page > result.pagination.totalPages) {
        setPage(result.pagination.totalPages);
      }
    } catch (e) {
      if (id === request.current) setError((e as Error).message);
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  useEffect(() => {
    setTab(location.pathname === '/background-removal' ? 'queue' : 'projects');
    setPage(1);
    setStatus('');
  }, [location.pathname]);

  useEffect(() => {
    const timer = setTimeout(load, 180);
    return () => {
      clearTimeout(timer);
      request.current++;
    };
  }, [tab, search, status, page]);

  const run = async (action: () => Promise<any>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: any) => {
    if (await confirmAction(t('Hapus proyek', 'Delete project') + ` "${p.name}"?`)) {
      await run(() => adminApi.deleteProject(p.id), t('Proyek dihapus.', 'Project deleted.'));
    }
  };

  const removeProcess = async (p: any) => {
    if (await confirmAction(t('Hapus riwayat proses', 'Delete process record') + ` "${p.fileName}"?`)) {
      await run(() => adminApi.deleteProcess(p.id), t('Riwayat proses dihapus.', 'Process record deleted.'));
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="studio-eyebrow">IMAGE OPERATIONS</span>
          <h1>
            {tab === 'projects'
              ? t('Proyek pengguna', 'User Projects')
              : t('Monitor pemrosesan', 'Processing Monitor')}
          </h1>
          <p>
            {tab === 'projects'
              ? t(
                  'Kelola proyek yang tersimpan di server dan status pengerjaannya.',
                  'Manage projects stored on the server and their workflow status.'
                )
              : t(
                  'Pantau hasil pemrosesan gambar dan tindak lanjuti proses gagal.',
                  'Monitor image processing results and follow up on failed processes.'
                )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="pl-btn"
            href="http://localhost:5173/editor"
            target="_blank"
            rel="noreferrer"
          >
            <Scissors size={15} />
            {t('Buka Editor', 'Open Editor')}
          </a>
          <button className="pl-btn" disabled={loading} onClick={load}>
            <RefreshCw size={16} />
            {t('Muat ulang', 'Reload')}
          </button>
        </div>
      </div>

      <div className="admin-filterbar pl-card">
        <div className="admin-tabs">
          <button
            aria-pressed={tab === 'projects'}
            onClick={() => {
              setTab('projects');
              setStatus('');
              setPage(1);
            }}
          >
            <FolderOpen size={16} />
            {t('Proyek', 'Projects')}
          </button>
          <button
            aria-pressed={tab === 'queue'}
            onClick={() => {
              setTab('queue');
              setStatus('');
              setPage(1);
            }}
          >
            <Scissors size={16} />
            {t('Pemrosesan', 'Processing')}
          </button>
        </div>
        <div className="admin-search-field">
          <Search size={16} />
          <input
            className="pl-input"
            placeholder={t('Cari nama file...', 'Search file name...')}
            aria-label={t('Cari proyek admin', 'Search admin projects')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="pl-input"
          style={{ width: 'auto' }}
          aria-label={t('Status proyek', 'Project status')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t('Semua status', 'All statuses')}</option>
          {(tab === 'projects'
            ? ['Draft', 'Completed', 'Pending', 'In Progress']
            : ['Queued', 'Processing', 'Completed', 'Failed']
          ).map((s) => (
            <option key={s} value={s}>
              {t(s) || s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="pl-skeleton" />
      ) : error ? (
        <div className="pl-empty">
          <p>{error}</p>
          <button className="pl-btn" onClick={load}>
            {t('Coba lagi', 'Try again')}
          </button>
        </div>
      ) : !rows.length ? (
        <div className="pl-empty pl-card">
          <FolderOpen size={36} />
          <h3>{t('Tidak ada data yang cocok', 'No matching data found')}</h3>
          <p>
            {t(
              'Ubah pencarian atau filter untuk melihat data lainnya.',
              'Adjust your search or filter to see other records.'
            )}
          </p>
        </div>
      ) : tab === 'projects' ? (
        <div className="admin-project-grid">
          {rows.map((p) => (
            <article className="pl-card admin-project-card" key={p.id}>
              <img src={p.thumbnailUrl || p.originalImageUrl} alt={p.name} loading="lazy" />
              <div>
                <h3 title={p.name}>{p.name}</h3>
                <p>
                  {p.userName || t('Tamu', 'Guest')} · {p.width} × {p.height} px
                </p>
                <div className="admin-card-actions">
                  <span className="pl-badge">{t(p.status) || p.status}</span>
                  {canWrite && (
                    <>
                      <button
                        className="pl-icon-btn"
                        aria-label={t('Edit', 'Edit') + ' ' + p.name}
                        onClick={() => {
                          setEditing(p);
                          setName(p.name);
                          setProjectStatus(p.status);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        disabled={busy}
                        className="pl-icon-btn"
                        aria-label={t('Hapus', 'Delete') + ' ' + p.name}
                        onClick={() => remove(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pl-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                {[
                  ['Nama file', 'File name'],
                  ['Pengguna', 'User'],
                  ['Model', 'Model'],
                  ['Durasi', 'Duration'],
                  ['Status', 'Status'],
                  ['Catatan', 'Notes'],
                  ['Aksi', 'Action'],
                ].map(([idStr, enStr]) => (
                  <th key={idStr} className="p-4">
                    {t(idStr, enStr)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--pl-line)' }}>
                  <td className="p-4">{p.fileName}</td>
                  <td className="p-4">{p.userName || t('Tamu', 'Guest')}</td>
                  <td className="p-4">{p.modelUsed}</td>
                  <td className="p-4">{p.processingTimeMs ? p.processingTimeMs + ' ms' : '—'}</td>
                  <td className="p-4">
                    <span className="pl-badge">{t(p.status) || p.status}</span>
                  </td>
                  <td className="p-4 pl-muted" style={{ maxWidth: 240 }}>
                    {p.errorMessage || p.log || '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {p.status === 'Failed' && canWrite && (
                        <button
                          disabled={busy}
                          className="pl-btn"
                          onClick={() =>
                            run(
                              () => adminApi.retryProcess(p.id),
                              t('Proses dikirim ulang.', 'Process resubmitted.')
                            )
                          }
                        >
                          <RotateCcw size={14} />
                          {t('Retry', 'Retry')}
                        </button>
                      )}
                      {canWrite && (
                        <button
                          disabled={busy}
                          className="pl-icon-btn text-rose-500"
                          title={t('Hapus Proses', 'Delete Process')}
                          onClick={() => removeProcess(p)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-pagination">
        <span>
          {total} {t('data', 'records')} · {t('Halaman', 'Page')} {page} {t('dari', 'of')}{' '}
          {pages}
        </span>
        <div>
          <button
            className="pl-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('Sebelumnya', 'Previous')}
          </button>
          <button
            className="pl-btn"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('Berikutnya', 'Next')}
          </button>
        </div>
      </div>

      {editing && (
        <Dialog
          title={t('Edit proyek', 'Edit Project')}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            className="pl-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await adminApi.updateProject(editing.id, {
                  name: name.trim(),
                  status: projectStatus,
                });
                setEditing(null);
              }, t('Proyek diperbarui.', 'Project updated.'));
            }}
          >
            <label className="pl-field">
              {t('Nama proyek', 'Project Name')}
              <input
                className="pl-input"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="pl-field">
              {t('Status', 'Status')}
              <select
                className="pl-input"
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
              >
                {['Draft', 'Completed', 'Pending', 'In Progress'].map((s) => (
                  <option key={s} value={s}>
                    {t(s) || s}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="pl-btn pl-btn-primary"
              disabled={busy || !name.trim()}
            >
              {busy ? t('Menyimpan...', 'Saving...') : t('Simpan perubahan', 'Save Changes')}
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}

