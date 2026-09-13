import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { toast, useLanguage } from '@pixellift/ui';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { AnalyticsPage } from './AnalyticsPage';

export const OverviewPage: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const { t, language } = useLanguage();
  const [metrics, setMetrics] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [kind, setKind] = useState('projects');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  const canInspect = ['Super Admin', 'Admin', 'Analyst'].includes(adminUser?.role || '');

  useEffect(() => {
    let active = true;
    adminApi
      .getOverview()
      .then((d) => {
        if (active) setMetrics(d);
      })
      .catch((e) => toast.error(e.message));
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!canInspect) return;
    let active = true;
    setBusy(true);
    const params = { search, page: String(page), limit: '8' };
    const request =
      kind === 'projects'
        ? adminApi.getProjects(params)
        : kind === 'users'
        ? adminApi.getUsers(params)
        : adminApi.getProcesses(params);

    request
      .then((d) => {
        if (active) {
          setRows(d.data || []);
          setTotal(d.pagination?.total || 0);
          setPages(d.pagination?.totalPages || 1);
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [kind, search, page, refresh, canInspect]);

  const cards: [string, string, string, string][] = [
    ['totalUsers', 'Pengguna', 'Users', '/users'],
    ['totalProjects', 'Proyek tersimpan', 'Saved Projects', '/projects'],
    ['imagesProcessed', 'Proses gambar', 'Images Processed', '/background-removal'],
    ['backgroundRemovals', 'Proses berhasil', 'Successful Processes', '/background-removal'],
    ['failedProcessing', 'Proses gagal', 'Failed Processes', '/background-removal'],
    ['pendingTickets', 'Tiket terbuka', 'Open Tickets', '/support-tickets'],
  ];

  const dateLocale = language === 'en' ? 'en-US' : 'id-ID';

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="studio-eyebrow">PIXELIFT CONTROL CENTER</span>
          <h1>{t('Ringkasan aplikasi', 'Application Overview')}</h1>
          <p>
            {t(
              'Data pengguna, proyek, proses AI, dan bantuan dari database yang sama.',
              'User data, projects, AI processing, and support from the unified database.'
            )}
          </p>
        </div>
        <button className="pl-btn" onClick={() => setRefresh((x) => x + 1)}>
          <RefreshCw size={16} />
          {t('Perbarui', 'Refresh')}
        </button>
      </div>

      <div className="admin-metrics">
        {cards.map(([key, label, fallback, url]) => (
          <Link to={url} className="pl-card admin-metric" key={key}>
            <span>
              {t(label, fallback)}
              <ArrowUpRight size={15} />
            </span>
            <strong>{metrics?.[key]?.label ?? '...'}</strong>
            <small>
              {metrics?.[key]?.trend == null
                ? t('Belum ada periode pembanding', 'No comparison period yet')
                : t(`${metrics[key].trend}% dibanding 7 hari sebelumnya`)}
            </small>
          </Link>
        ))}
      </div>

      <AnalyticsPage compact={false} key={refresh} />

      {canInspect && (
        <section className="pl-card">
          <div className="admin-filterbar">
            <div className="admin-tabs">
              {[
                ['projects', 'Proyek', 'Projects'],
                ['users', 'Pengguna', 'Users'],
                ['processes', 'Proses AI', 'AI Processes'],
              ].map(([id, label, fallback]) => (
                <button
                  key={id}
                  aria-pressed={kind === id}
                  onClick={() => {
                    setKind(id);
                    setPage(1);
                    setSearch('');
                  }}
                >
                  {t(label, fallback)}
                </button>
              ))}
            </div>
            <input
              aria-label={t('Cari data ringkasan', 'Search overview data')}
              className="pl-input"
              style={{ maxWidth: 280 }}
              placeholder={t('Cari nama...', 'Search name...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="analytics-table overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>{t('Nama', 'Name')}</th>
                  <th>{kind === 'users' ? t('Email', 'Email') : t('Pengguna', 'User')}</th>
                  <th>{t('Status', 'Status')}</th>
                  <th>{t('Tanggal', 'Date')}</th>
                  <th>{t('Kelola', 'Manage')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name || row.fileName}</td>
                    <td>{row.email || row.userName || t('Tamu', 'Guest')}</td>
                    <td>
                      <span className="pl-badge">{t(row.status) || row.status}</span>
                    </td>
                    <td>{new Date(row.createdAt).toLocaleDateString(dateLocale)}</td>
                    <td>
                      <Link
                        className="pl-btn"
                        to={kind === 'projects' ? '/projects' : kind === 'users' ? '/users' : '/background-removal'}
                      >
                        {t('Detail', 'Details')}
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="p-5 pl-muted">
                {busy
                  ? t('Memuat...', 'Loading...')
                  : t('Tidak ada data yang cocok.', 'No matching data found.')}
              </p>
            )}
          </div>

          <div className="admin-pagination p-4">
            <span>
              {total} {t('data', 'records')} &middot; {t('Halaman', 'Page')} {page} / {Math.max(1, pages)}
            </span>
            <div>
              <button
                className="pl-btn"
                disabled={page <= 1 || busy}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('Sebelumnya', 'Previous')}
              </button>
              <button
                className="pl-btn"
                disabled={page >= pages || busy}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('Berikutnya', 'Next')}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
