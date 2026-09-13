import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useLanguage, confirmAction, toast, Dialog } from '@pixellift/ui';
import { api } from '../services/api';
import { SimulatedMembershipModal } from '../components/SimulatedMembershipModal';
import {
  Crown,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Printer,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Download,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { t } = useLanguage();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions();
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user]);

  // Calculate validity date and days remaining
  const tier = user?.membership || 'Free';
  const expiresAt = user?.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null;
  const now = new Date();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

  const handleCancelSubscription = async () => {
    if (
      await confirmAction(
        'Apakah Anda yakin ingin membatalkan langganan aktif? Akun Anda akan kembali ke paket Free setelah periode berakhir.'
      )
    ) {
      toast.info('Permintaan pembatalan diterima. Anda tetap dapat menikmati fasilitas Pro hingga akhir periode.');
    }
  };

  return (
    <div className="studio-layout">
      <Navbar />

      <main className="studio-main">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
          {/* Page Heading */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="studio-eyebrow">BILLING & SUBSCRIPTION</span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('subscription', 'Riwayat Langganan & Masa Berlaku')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informasi status keanggotaan aktif, batas masa berlaku, kuota pemrosesan, dan arsip faktur pembayaran.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPlansModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 shadow-md shadow-indigo-500/25 transition-all"
            >
              <Crown className="w-4 h-4" />
              <span>{t('upgradePlan', 'Upgrade / Ganti Paket')}</span>
            </button>
          </div>

          {/* Active Plan Card */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-950/30 to-slate-900/60 border border-indigo-500/30 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Crown className="w-48 h-48 text-amber-400" />
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      tier === 'Pro'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : tier === 'Unlimited'
                        ? 'bg-indigo-400/20 text-indigo-300 border border-indigo-400/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    Paket {tier}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aktif</span>
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white">
                  {tier === 'Free' ? 'Gratis Selamanya' : tier === 'Pro' ? '$12 / bulan' : '$29 / bulan'}
                </h2>
                <p className="text-xs text-slate-300">
                  {tier === 'Free'
                    ? '10 AI background removal/hari dengan fitur editor penting.'
                    : tier === 'Pro'
                    ? '250 AI background removal/hari, batch cepat, dan filter resolusi tinggi.'
                    : 'Akses tanpa batas, semua model AI RMBG & U2Net, dan prioritas server.'}
                </p>
              </div>

              {/* Validity details */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>{t('validUntil', 'Masa Berlaku')}</span>
                </div>
                <div className="text-base font-bold text-white">
                  {tier === 'Free'
                    ? t('lifetime', 'Berlaku Selamanya (Life-Time)')
                    : expiresAt
                    ? expiresAt.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Aktif 30 Hari'}
                </div>
                {daysLeft !== null && tier !== 'Free' && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {daysLeft} {t('daysLeft', 'hari tersisa')}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPlansModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow transition-all text-center"
                >
                  Ubah / Perpanjang Paket
                </button>
                {tier !== 'Free' && (
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    className="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 transition-all text-center"
                  >
                    {t('cancelSubscription', 'Batalkan Langganan')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Billing & Invoice History */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span>{t('billingHistory', 'Riwayat Faktur & Pembayaran')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar seluruh transaksi simulasi yang pernah dilakukan oleh akun Anda.
                </p>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {transactions.length} Faktur
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3">Nomor Faktur</th>
                    <th className="p-3">Paket</th>
                    <th className="p-3">Nominal</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Memuat data transaksi...
                      </td>
                    </tr>
                  ) : !transactions.length ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Belum ada riwayat transaksi. Upgrade ke Pro untuk menikmati fasilitas premium.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/20">
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {tx.invoiceNumber}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">Pixelift {tx.tier}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">${tx.amount}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{tx.paymentMethod}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'Paid'
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950 text-amber-500 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveInvoice(tx)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-brand-600" />
                            <span>{t('viewInvoice', 'Lihat Faktur')}</span>
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
      </main>

      {/* Plans Modal */}
      <SimulatedMembershipModal
        isOpen={plansModalOpen}
        onClose={() => {
          setPlansModalOpen(false);
          loadTransactions();
          refreshProfile();
        }}
      />

      {/* Invoice Modal */}
      {activeInvoice && (
        <Dialog
          title={`Faktur Pembayaran — ${activeInvoice.invoiceNumber}`}
          description="Rincian resmi bukti transaksi langganan Pixelift Lite."
          onClose={() => setActiveInvoice(null)}
        >
          <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
            {/* Invoice Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">PIXELIFT LITE STUDIO</div>
                <p className="text-[11px] text-slate-500">Free AI Background Remover & Light Editor</p>
                <p className="text-[11px] text-slate-500">support@pixellift.test</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {activeInvoice.invoiceNumber}
                </span>
                <p className="text-[11px] text-slate-500">
                  {new Date(activeInvoice.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Bill to */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Ditagihkan Kepada:</span>
                <div className="font-bold text-slate-900 dark:text-white">{activeInvoice.userName || user?.name}</div>
                <div className="text-slate-500">{user?.email}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Metode & Status:</span>
                <div className="font-medium text-slate-900 dark:text-white">{activeInvoice.paymentMethod}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Lunas (Paid)
                </span>
              </div>
            </div>

            {/* Item Table */}
            <table className="w-full border-t border-b border-slate-200 dark:border-slate-800 my-2">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px]">
                  <th className="py-2 text-left">Deskripsi Layanan</th>
                  <th className="py-2 text-center">Durasi</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                <tr>
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">
                    Langganan Pixelift Lite — Paket {activeInvoice.tier}
                  </td>
                  <td className="py-3 text-center">30 Hari</td>
                  <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                    ${activeInvoice.amount}.00
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Transaksi simulasi tervalidasi oleh sistem.</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
