import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../services/api';
import { toast, useLanguage } from '@pixellift/ui';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Brush,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from 'recharts';
import {
  RefreshCw,
  Download,
  Table2,
  BarChart3,
  Activity,
  MousePointer2,
  TrendingUp,
  Users,
  Cpu,
  CreditCard,
  Layers,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AnalyticsPageProps {
  compact?: boolean;
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#3b82f6'];

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ compact = false }) => {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<string>('30d');
  const [busy, setBusy] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [activeChartTypes, setActiveChartTypes] = useState<Record<string, string>>({
    userGrowth: 'area',
    imageProcessing: 'stack',
    revenueSimulation: 'area',
  });

  useEffect(() => {
    let active = true;
    setBusy(true);
    adminApi
      .getAnalytics(range)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => toast.error(err.message || 'Gagal memuat analitik'))
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  // Toggle series visibility in chart
  const toggleSeries = (key: any) => {
    if (!key) return;
    const strKey = String(key);
    setHiddenSeries((prev) => (prev.includes(strKey) ? prev.filter((k) => k !== strKey) : [...prev, strKey]));
  };

  // Switch chart representation (e.g. area vs line, stack vs grouped)
  const toggleChartType = (chartKey: string, nextType: string) => {
    setActiveChartTypes((prev) => ({ ...prev, [chartKey]: nextType }));
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      [t('Kategori'), t('Tanggal') + '/' + t('Nama'), t('Metrik'), t('Nilai')],
    ];

    // User growth
    (data.userGrowth || []).forEach((r: any) => {
      rows.push([t('Pertumbuhan & pengguna aktif'), r.date, t('Pengguna baru'), String(r.dailyNew ?? 0)]);
      rows.push([t('Pertumbuhan & pengguna aktif'), r.date, t('Pengguna aktif'), String(r.active ?? 0)]);
    });

    // Image processing
    (data.imageProcessing || []).forEach((r: any) => {
      rows.push([t('Pemrosesan AI berhasil vs gagal'), r.name, t('Berhasil'), String(r.successful ?? 0)]);
      rows.push([t('Pemrosesan AI berhasil vs gagal'), r.name, t('Gagal'), String(r.failed ?? 0)]);
    });

    // Model usage
    (data.modelUsage || []).forEach((r: any) => {
      rows.push([t('Penggunaan Model AI'), r.name, t('Volume Pemrosesan'), String(r.count ?? 0)]);
      rows.push([t('Penggunaan Model AI'), r.name, t('Rata-rata Latensi') + ' (ms)', String(r.avgLatencyMs ?? 0)]);
    });

    // Export formats
    (data.exportFormats || []).forEach((r: any) => {
      rows.push([t('Format ekspor'), r.name, t('Ekspor'), String(r.value ?? 0)]);
    });

    // Revenue
    (data.revenueSimulation || []).forEach((r: any) => {
      rows.push([t('Transaksi berdasarkan status'), r.month, t('Dibayar') + ' ($)', String(r.paid ?? 0)]);
      rows.push([t('Transaksi berdasarkan status'), r.month, t('Menunggu') + ' ($)', String(r.pending ?? 0)]);
    });

    // Tickets
    (data.ticketDistribution || []).forEach((r: any) => {
      rows.push([t('Distribusi tiket bantuan'), r.name, t('Tiket'), String(r.count ?? 0)]);
    });

    const csvContent = '\uFEFF' + rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixellift-analytics-${range}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('Ekspor CSV dimulai.'));
  };

  // KPI calculations
  const kpis = useMemo(() => {
    if (!data) return null;
    const totalUsersCount = (data.userGrowth || []).reduce((sum: number, r: any) => sum + (r.dailyNew || 0), 0);
    const totalProcessesCount = (data.imageProcessing || []).reduce((sum: number, r: any) => sum + (r.successful || 0) + (r.failed || 0), 0);
    const successfulProcessesCount = (data.imageProcessing || []).reduce((sum: number, r: any) => sum + (r.successful || 0), 0);
    const successRate = totalProcessesCount > 0 ? Math.round((successfulProcessesCount / totalProcessesCount) * 100) : 100;
    const totalExports = (data.exportFormats || []).reduce((sum: number, r: any) => sum + (r.value || 0), 0);
    const totalRevenue = (data.revenueSimulation || []).reduce((sum: number, r: any) => sum + (r.paid || 0), 0);
    return {
      totalUsersCount,
      totalProcessesCount,
      successRate,
      totalExports,
      totalRevenue,
    };
  }, [data]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl text-white text-xs min-w-[170px] space-y-1.5 animate-fadeIn">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <Activity size={12} className="text-indigo-400" />
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{t(entry.name)}:</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {typeof entry.value === 'number' && entry.name.toLowerCase().includes('latensi')
                    ? `${entry.value} ms`
                    : typeof entry.value === 'number' && (entry.dataKey === 'paid' || entry.dataKey === 'pending' || entry.dataKey === 'failed')
                    ? `$${entry.value.toLocaleString()}`
                    : entry.value?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className={`admin-page analytics-page ${compact ? 'analytics-compact' : ''} space-y-5`}>
      {/* Top Header & Range Switcher */}
      <div className="admin-page-heading flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="studio-eyebrow flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <Sparkles size={14} />
            {t('DATA APLIKASI', 'APPLICATION DATA')}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {compact ? t('Aktivitas & insight', 'Activity & Insights') : t('Analitik & laporan', 'Analytics & Reports')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
            <MousePointer2 size={13} className="text-indigo-500" />
            <span>{t('Klik legenda untuk sembunyikan seri, klik donut untuk detail, atau geser rentang.', 'Click legend to toggle series, click donut for details, or drag to zoom range.')}</span>
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Range Selector */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex flex-wrap items-center gap-1 border border-slate-200 dark:border-slate-700/60 max-w-full">
            {[
              ['7d', '7 hari', '7 Days'],
              ['30d', '30 hari', '30 Days'],
              ['90d', '90 hari', '90 Days'],
              ['1y', '1 tahun', '1 Year'],
            ].map(([val, lbl, fallback]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRange(val)}
                className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === val
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t(lbl, fallback)}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pl-btn !px-3 !py-2 rounded-xl text-xs flex items-center gap-1.5"
            disabled={busy}
            onClick={() => setRefreshKey((x) => x + 1)}
            title={t('Muat ulang analitik', 'Reload analytics')}
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('Perbarui', 'Refresh')}</span>
          </button>

          <button
            type="button"
            className="pl-btn !px-3 !py-2 rounded-xl text-xs flex items-center gap-1.5"
            onClick={() => setShowTable(!showTable)}
          >
            {showTable ? <BarChart3 size={14} /> : <Table2 size={14} />}
            <span className="hidden sm:inline">
              {showTable ? t('Grafik Analitik', 'Analytics Chart') : t('Tabel Analitik', 'Analytics Table')}
            </span>
          </button>

          <button
            type="button"
            className="pl-btn pl-btn-primary !px-3 !py-2 rounded-xl text-xs flex items-center gap-1.5"
            onClick={handleExportCsv}
          >
            <Download size={14} />
            <span className="hidden sm:inline">{t('Unduh CSV', 'Export CSV')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="pl-card p-4 rounded-2xl flex items-center justify-between border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-white to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/10">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('Pengguna baru', 'New Users')}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {kpis.totalUsersCount.toLocaleString()}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <TrendingUp size={12} /> {t('30 hari', '30 Days')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users size={20} />
            </div>
          </div>

          <div className="pl-card p-4 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-950/60 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('Tingkat Keberhasilan', 'Success Rate')}
              </span>
              <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {kpis.successRate}%
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {kpis.totalProcessesCount} {t('Proses gambar', 'Images Processed')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Cpu size={20} />
            </div>
          </div>

          <div className="pl-card p-4 rounded-2xl flex items-center justify-between border border-amber-100 dark:border-amber-950/60 bg-gradient-to-br from-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/10">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('Total Pendapatan', 'Total Revenue')}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                ${kpis.totalRevenue.toLocaleString()}
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Buku Besar Transaksi', 'Transactions Ledger')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <CreditCard size={20} />
            </div>
          </div>

          <div className="pl-card p-4 rounded-2xl flex items-center justify-between border border-cyan-100 dark:border-cyan-950/60 bg-gradient-to-br from-white to-cyan-50/20 dark:from-slate-900 dark:to-cyan-950/10">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('Format ekspor', 'Export Formats')}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {kpis.totalExports.toLocaleString()}
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                PNG &middot; JPG &middot; WEBP
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Layers size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Status banner */}
      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>{busy ? t('Memuat data...') : data?.systemInsight || t('Sesuai data aktual database.')}</span>
        <span className="text-[11px] font-mono text-slate-400">{t('Waktu dikelompokkan berdasarkan UTC.')}</span>
      </p>

      {/* Grid of Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        {/* CHART 1: Pertumbuhan Pengguna & Pengguna Aktif */}
        <article className="pl-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                <span>{t('Pertumbuhan & pengguna aktif', 'User Growth & Active Users')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Pengguna yang menjalankan proses AI atau ekspor pada hari tersebut', 'Users who ran AI processes or exported on that day')}
              </p>
            </div>
            {/* Toggle Area vs Line */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => toggleChartType('userGrowth', 'area')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  activeChartTypes.userGrowth === 'area'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => toggleChartType('userGrowth', 'line')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  activeChartTypes.userGrowth === 'line'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Line
              </button>
            </div>
          </div>

          <div className="w-full overflow-hidden" style={{ height: 290, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.userGrowth || []} margin={{ top: 10, right: 15, left: -10, bottom: 10 }}>
                <defs>
                  <linearGradient id="userGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="userGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--pl-line)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: 'var(--pl-muted)', fontSize: 10 }} tickMargin={6} />
                <YAxis tick={{ fill: 'var(--pl-muted)', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 12, cursor: 'pointer' }}
                  onClick={(e) => toggleSeries(e.dataKey)}
                />
                <Area
                  type="monotone"
                  dataKey="dailyNew"
                  name={t('Pengguna baru', 'New Users')}
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill={activeChartTypes.userGrowth === 'area' ? 'url(#userGrad1)' : 'transparent'}
                  hide={hiddenSeries.includes('dailyNew')}
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  name={t('Pengguna aktif', 'Active Users')}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill={activeChartTypes.userGrowth === 'area' ? 'url(#userGrad2)' : 'transparent'}
                  hide={hiddenSeries.includes('active')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* CHART 2: Pemrosesan AI Berhasil vs Gagal */}
        <article className="pl-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu size={16} className="text-emerald-500" />
                <span>{t('Pemrosesan AI berhasil vs gagal', 'AI Processing Success vs Failed')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Rasio keberhasilan dan kegagalan pemrosesan background', 'Success vs failure ratio of background removals')}
              </p>
            </div>
            {/* Stack vs Grouped Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => toggleChartType('imageProcessing', 'stack')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  activeChartTypes.imageProcessing === 'stack'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Stack
              </button>
              <button
                type="button"
                onClick={() => toggleChartType('imageProcessing', 'group')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  activeChartTypes.imageProcessing === 'group'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Group
              </button>
            </div>
          </div>

          <div className="w-full overflow-hidden" style={{ height: 290, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.imageProcessing || []} margin={{ top: 10, right: 15, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="var(--pl-line)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: 'var(--pl-muted)', fontSize: 10 }} tickMargin={6} />
                <YAxis tick={{ fill: 'var(--pl-muted)', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 12, cursor: 'pointer' }}
                  onClick={(e) => toggleSeries(e.dataKey)}
                />
                <Bar
                  dataKey="successful"
                  name={t('Berhasil', 'Success')}
                  fill="#10b981"
                  stackId={activeChartTypes.imageProcessing === 'stack' ? 'a' : undefined}
                  radius={activeChartTypes.imageProcessing === 'stack' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  hide={hiddenSeries.includes('successful')}
                />
                <Bar
                  dataKey="failed"
                  name={t('Gagal', 'Failed')}
                  fill="#f43f5e"
                  stackId={activeChartTypes.imageProcessing === 'stack' ? 'a' : undefined}
                  radius={[4, 4, 0, 0]}
                  hide={hiddenSeries.includes('failed')}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* CHART 3: Distribusi Format Ekspor (Donut / Pie) */}
        <article className="pl-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-amber-500" />
                <span>{t('Format ekspor', 'Export Formats')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Proporsi unduhan gambar (PNG, JPG, WEBP)', 'Image download ratio (PNG, JPG, WEBP)')}
              </p>
            </div>
          </div>

          <div style={{ height: 280, minWidth: 0 }} className="w-full overflow-hidden relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={data?.exportFormats || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius="50%"
                  outerRadius="78%"
                  paddingAngle={5}
                  onClick={(entry: any) => toast.info(`${entry.name}: ${entry.value} ${t('Ekspor', 'Exports')}`)}
                >
                  {(data?.exportFormats || []).map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {kpis?.totalExports || 0}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('Ekspor', 'Exports')}</span>
            </div>
          </div>
        </article>

        {/* CHART 4: Transaksi & Pendapatan Finansial */}
        <article className="pl-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-500" />
                <span>{t('Transaksi berdasarkan status', 'Transactions by Status')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Akumulasi nilai transaksi (USD) per bulan', 'Accumulated transaction value (USD) per month')}
              </p>
            </div>
          </div>

          <div className="w-full overflow-hidden" style={{ height: 290, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueSimulation || []} margin={{ top: 10, right: 15, left: -5, bottom: 10 }}>
                <defs>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--pl-line)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: 'var(--pl-muted)', fontSize: 10 }} tickMargin={6} />
                <YAxis
                  tick={{ fill: 'var(--pl-muted)', fontSize: 10 }}
                  tickFormatter={(v) => `$${v}`}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 12, cursor: 'pointer' }}
                  onClick={(e) => toggleSeries(e.dataKey)}
                />
                <Area
                  type="monotone"
                  dataKey="paid"
                  name={t('Dibayar', 'Paid')}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#paidGrad)"
                  hide={hiddenSeries.includes('paid')}
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  name={t('Menunggu', 'Pending')}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#pendingGrad)"
                  hide={hiddenSeries.includes('pending')}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name={t('Gagal', 'Failed')}
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  fill="transparent"
                  hide={hiddenSeries.includes('failed')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* CHART 5: Penggunaan Model AI & Kecepatan Latensi (Bar + Line Composed) */}
        <article className="pl-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu size={16} className="text-cyan-500" />
                <span>{t('Penggunaan Model AI & Latensi', 'AI Model Usage & Latency')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Volume eksekusi dan rata-rata kecepatan waktu proses', 'Execution volume and average processing latency')}
              </p>
            </div>
          </div>

          <div className="w-full overflow-hidden" style={{ height: 290, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.modelUsage || []} margin={{ top: 10, right: 15, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="var(--pl-line)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: 'var(--pl-muted)', fontSize: 10 }} tickMargin={6} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'var(--pl-muted)', fontSize: 10 }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: 'var(--pl-muted)', fontSize: 10 }}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 12 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  name={t('Volume Pemrosesan', 'Processing Volume')}
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                >
                  {(data?.modelUsage || []).map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgLatencyMs"
                  name={t('Rata-rata Latensi', 'Average Latency (ms)')}
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* CHART 6: Distribusi Tiket Bantuan */}
        <article className="pl-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle size={16} className="text-purple-500" />
                <span>{t('Distribusi tiket bantuan', 'Support Ticket Distribution')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Tiket support berdasarkan status penanganan operasional', 'Support tickets grouped by operational status')}
              </p>
            </div>
          </div>

          <div className="w-full overflow-hidden" style={{ height: 290, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data?.ticketDistribution || []}
                margin={{ top: 10, right: 25, left: 10, bottom: 10 }}
              >
                <CartesianGrid stroke="var(--pl-line)" horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: 'var(--pl-muted)', fontSize: 10 }} allowDecimals={false} tickMargin={6} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: 'var(--pl-muted)', fontSize: 10 }}
                  tickFormatter={(v) => t(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name={t('Tiket', 'Tickets')}
                  fill="#8b5cf6"
                  radius={[0, 6, 6, 0]}
                >
                  {(data?.ticketDistribution || []).map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      {/* Raw Data Table View if Toggle Pressed */}
      {showTable && data && (
        <div className="pl-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t('Tabel')} {t('Analitik & laporan')}</h4>
            <span className="text-xs text-slate-500">{t('Periode analitik')}: {range}</span>
          </div>
          <div className="analytics-table overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">{t('Tanggal')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Pengguna baru')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Pengguna aktif')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Proses berhasil')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Proses gagal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(data.userGrowth || []).slice(-15).reverse().map((r: any, i: number) => {
                  const proc = (data.imageProcessing || []).find((x: any) => x.name === r.date) || {};
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono">{r.date}</td>
                      <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{r.dailyNew}</td>
                      <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{r.active}</td>
                      <td className="py-2 px-3 text-emerald-600 font-mono">{proc.successful ?? 0}</td>
                      <td className="py-2 px-3 text-rose-600 font-mono">{proc.failed ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
