import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { toast, confirmAction, Dialog } from '@pixellift/ui';
import {
  Search,
  Plus,
  Download,
  CreditCard,
  Edit2,
  Trash2,
  FileText,
  Printer,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sliders,
  Crown,
  Sparkles,
  Tag,
  Check,
  Loader2,
} from 'lucide-react';

export const MembershipsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [viewingTx, setViewingTx] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  // Create Form State
  const [newUserName, setNewUserName] = useState('');
  const [newTier, setNewTier] = useState('Pro');
  const [newAmount, setNewAmount] = useState('12');
  const [newMethod, setNewMethod] = useState('Manual Admin');
  const [newStatus, setNewStatus] = useState('Paid');

  // Edit Form State
  const [editTier, setEditTier] = useState('Pro');
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editStatus, setEditStatus] = useState('Paid');

  // Plan Management State
  const [plans, setPlans] = useState<any[]>([]);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('0');
  const [planLimit, setPlanLimit] = useState('10');
  const [planPeriod, setPlanPeriod] = useState('30');
  const [planFeatures, setPlanFeatures] = useState('');
  const [planIsActive, setPlanIsActive] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);

  const loadPlans = async () => {
    try {
      const data = await adminApi.getPlans();
      if (Array.isArray(data) && data.length > 0) {
        setPlans(data);
        if (!editingPlan) {
          handleSelectEditPlan(data[1] || data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const handleSelectEditPlan = (p: any) => {
    setEditingPlan(p);
    setPlanName(p.name || '');
    setPlanPrice(String(p.price ?? 0));
    setPlanLimit(String(p.dailyBgRemovalLimit ?? 10));
    setPlanPeriod(String(p.periodDays ?? 30));
    setPlanFeatures(Array.isArray(p.features) ? p.features.join('\n') : '');
    setPlanIsActive(p.isActive !== false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSavingPlan(true);
    try {
      const payload = {
        name: planName.trim(),
        price: Number(planPrice),
        dailyBgRemovalLimit: Number(planLimit),
        periodDays: Number(planPeriod),
        features: planFeatures
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        isActive: planIsActive,
      };
      await adminApi.updatePlan(editingPlan.id, payload);
      toast.success(`Paket ${planName} berhasil diperbarui! Perubahan langsung aktif.`);
      await loadPlans();
      setEditingPlan({ ...editingPlan, ...payload });
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan perubahan paket');
    } finally {
      setSavingPlan(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getTransactions({ search, status: statusFilter });
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [search, statusFilter]);

  useEffect(() => {
    loadPlans();
  }, []);

  const [transactionUsers,setTransactionUsers]=useState<any[]>([]);
  const [newUserId,setNewUserId]=useState('');
  useEffect(()=>{adminApi.getUsers({limit:'100'}).then(r=>setTransactionUsers(r.data||[])).catch(()=>{});},[]);
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      toast.error('Nama pelanggan wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      await adminApi.createTransactionManual({
        userName: newUserName.trim(),
        userId:newUserId,
        tier: newTier,
        amount: Number(newAmount),
        paymentMethod: newMethod,
        status: newStatus,
      });
      toast.success('Transaksi manual berhasil dicatat.');
      setIsAddOpen(false);
      setNewUserName('');
      loadTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat transaksi');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setBusy(true);
    try {
      await adminApi.updateTransaction(editingTx.id, {
        tier: editTier,
        amount: Number(editAmount),
        paymentMethod: editMethod,
        status: editStatus,
      });
      toast.success('Data transaksi berhasil diperbarui.');
      setEditingTx(null);
      loadTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui transaksi');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTransaction = async (id: string, invoice: string) => {
    if (await confirmAction(`Hapus rekaman transaksi ${invoice}? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await adminApi.deleteTransaction(id);
        toast.success('Transaksi berhasil dihapus.');
        loadTransactions();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus transaksi');
      }
    }
  };

  const handleStatusUpdate = async (id: string, nextStatus: string) => {
    try {
      await adminApi.updateTransactionStatus(id, nextStatus);
      toast.success('Status transaksi diubah menjadi ' + nextStatus);
      loadTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status transaksi');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="studio-eyebrow">REVENUE & SUBSCRIPTION LEDGER</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Membership & Transaksi Simulasi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola faktur, pembukuan langganan simulasi (Free, Pro, Unlimited), dan pencatatan manual admin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (plans.length > 0 && !editingPlan) {
                handleSelectEditPlan(plans[1] || plans[0]);
              }
              setIsPlansModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Kelola Harga & Kuota Paket</span>
          </button>

          <button
            type="button"
            onClick={() => adminApi.exportTransactionsCsv().then(() => toast.success('Ekspor CSV transaksi dimulai.')).catch((e) => toast.error(e.message))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi Manual</span>
          </button>
        </div>
      </div>

      {/* Plans Overview Cards (Dynamic from API) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(plans.length > 0
          ? plans
          : [
              { id: 'free', name: 'Free', price: 0, dailyBgRemovalLimit: 10, periodDays: 365 },
              { id: 'pro', name: 'Pro', price: 12, dailyBgRemovalLimit: 250, periodDays: 30 },
              { id: 'unlimited', name: 'Unlimited', price: 29, dailyBgRemovalLimit: 9999, periodDays: 30 },
            ]
        ).map((p) => {
          const isPro = p.name?.toLowerCase() === 'pro';
          const isUnlimited = p.name?.toLowerCase() === 'unlimited';
          const priceStr = p.price === 0 ? '$0' : `$${p.price} / ${p.periodDays || 30} hari`;
          const limitStr =
            p.dailyBgRemovalLimit >= 9000
              ? 'Unlimited background removal'
              : `${p.dailyBgRemovalLimit} background removal/hari`;

          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl bg-white dark:bg-[#14132b] border shadow-sm space-y-3 relative overflow-hidden transition-all ${
                isPro
                  ? 'border-indigo-500/40 hover:border-indigo-500'
                  : isUnlimited
                  ? 'border-amber-500/40 hover:border-amber-500'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isPro
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                        : isUnlimited
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {p.name} Tier
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {p.isActive !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {priceStr}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {limitStr} • Durasi {p.periodDays || 30} hari
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {(p.features || []).length} fitur disertakan
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectEditPlan(p);
                    setIsPlansModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Ubah Harga & Limit</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transactions Ledger Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Buku Besar Transaksi</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {transactions.length} invoice
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor invoice / nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              <option value="">Semua Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Pengguna</th>
                <th className="p-3">Paket</th>
                <th className="p-3">Nominal</th>
                <th className="p-3">Metode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Ubah Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : !transactions.length ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Tidak ada transaksi yang cocok.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/20">
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {tx.invoiceNumber}
                    </td>
                    <td className="p-3 text-slate-900 dark:text-white font-semibold">{tx.userName}</td>
                    <td className="p-3">{tx.tier}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">${tx.amount}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{tx.paymentMethod}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'Paid'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : tx.status === 'Pending'
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <select
                        value={tx.status}
                        onChange={(e) => handleStatusUpdate(tx.id, e.target.value)}
                        className="py-1 px-2 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Failed">Failed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingTx(tx)}
                          className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Lihat Faktur"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(tx);
                            setEditTier(tx.tier);
                            setEditAmount(String(tx.amount));
                            setEditMethod(tx.paymentMethod);
                            setEditStatus(tx.status);
                          }}
                          className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-800"
                          title="Edit Transaksi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id, tx.invoiceNumber)}
                          className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Hapus Transaksi"
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

      {/* Modal: Create Manual Transaction */}
      {isAddOpen && (
        <Dialog
          title="Catat Transaksi Manual"
          description="Tambahkan transaksi langganan manual untuk pengguna."
          onClose={() => setIsAddOpen(false)}
        >
          <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Pengguna:</label>
              <select required aria-label="Pengguna transaksi" value={newUserId} onChange={e=>{setNewUserId(e.target.value);setNewUserName(transactionUsers.find(u=>u.id===e.target.value)?.name||'');}} className="pl-input"><option value="">Pilih pengguna...</option>{transactionUsers.map(u=><option value={u.id} key={u.id}>{u.name} ({u.email})</option>)}</select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Paket Membership:</label>
                <select
                  value={newTier}
                  onChange={(e) => {
                    setNewTier(e.target.value);
                    setNewAmount(e.target.value === 'Pro' ? '12' : e.target.value === 'Unlimited' ? '29' : '0');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Unlimited">Unlimited</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal ($):</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Metode Pembayaran:</label>
                <input
                  type="text"
                  required
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Pembayaran:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Modal: Edit Transaction */}
      {editingTx && (
        <Dialog
          title={`Edit Transaksi — ${editingTx.invoiceNumber}`}
          description={`Perbarui rincian transaksi untuk pelanggan ${editingTx.userName}.`}
          onClose={() => setEditingTx(null)}
        >
          <form onSubmit={handleUpdateTransaction} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Paket Membership:</label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Unlimited">Unlimited</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal ($):</label>
                <input
                  type="number"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Metode Pembayaran:</label>
                <input
                  type="text"
                  required
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Modal: View Invoice */}
      {viewingTx && (
        <Dialog
          title={`Faktur Transaksi — ${viewingTx.invoiceNumber}`}
          description="Rincian resmi bukti transaksi."
          onClose={() => setViewingTx(null)}
        >
          <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">PIXELIFT LITE STUDIO</div>
                <p className="text-[11px] text-slate-500">Free AI Background Remover & Light Editor</p>
                <p className="text-[11px] text-slate-500">support@pixellift.test</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {viewingTx.invoiceNumber}
                </span>
                <p className="text-[11px] text-slate-500">
                  {new Date(viewingTx.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Pelanggan:</span>
                <div className="font-bold text-slate-900 dark:text-white">{viewingTx.userName}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Metode & Status:</span>
                <div className="font-medium text-slate-900 dark:text-white">{viewingTx.paymentMethod}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {viewingTx.status}
                </span>
              </div>
            </div>

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
                    Langganan Pixelift Lite — Paket {viewingTx.tier}
                  </td>
                  <td className="py-3 text-center">30 Hari</td>
                  <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                    ${viewingTx.amount}.00
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Modal: Manage Plans & Pricing */}
      {isPlansModalOpen && (
        <Dialog
          title="Pengaturan Paket & Harga Membership"
          description="Atur tarif harga langganan (USD), kuota limit proses background per hari, durasi masa berlaku, dan daftar fitur tiap tier."
          onClose={() => setIsPlansModalOpen(false)}
        >
          <div className="space-y-5 text-xs text-slate-700 dark:text-slate-200">
            {/* Tier Selector Pills */}
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-1">
              {plans.map((p) => {
                const isSelected = editingPlan?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectEditPlan(p)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Paket {p.name}</span>
                  </button>
                );
              })}
            </div>

            {editingPlan && (
              <form onSubmit={handleSavePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Nama Paket
                    </label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Harga Paket (USD $)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={planPrice}
                        onChange={(e) => setPlanPrice(e.target.value)}
                        required
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Limit Hapus Background Harian
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={planLimit}
                      onChange={(e) => setPlanLimit(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      Gunakan 9999 atau lebih untuk kuota tanpa batas (Unlimited).
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Masa Berlaku Langganan (Hari)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={planPeriod}
                      onChange={(e) => setPlanPeriod(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Daftar Fitur Unggulan (Satu per baris)
                  </label>
                  <textarea
                    rows={4}
                    value={planFeatures}
                    onChange={(e) => setPlanFeatures(e.target.value)}
                    placeholder="Contoh:&#10;250 remove background per hari&#10;Export kualitas tinggi WEBP&#10;Prioritas server AI"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="planIsActive"
                    checked={planIsActive}
                    onChange={(e) => setPlanIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="planIsActive" className="text-xs font-semibold select-none cursor-pointer">
                    Aktifkan Paket Ini untuk Pelanggan di Aplikasi Web
                  </label>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">
                    ID Paket: <code className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{editingPlan.id}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlansModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Tutup
                    </button>
                    <button
                      type="submit"
                      disabled={savingPlan}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
                    >
                      {savingPlan ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan Paket {editingPlan.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
};
