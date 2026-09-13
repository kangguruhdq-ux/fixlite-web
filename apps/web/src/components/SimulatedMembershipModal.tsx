import { toast, useLanguage } from '@pixellift/ui';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MembershipTier } from '@pixellift/types';
import { api } from '../services/api';
import {
  X,
  Check,
  Crown,
  CreditCard,
  Sparkles,
  ShieldCheck,
  LogIn,
  UserPlus,
  ArrowRight,
  Loader2,
  Tag,
  Ticket,
} from 'lucide-react';

interface SimulatedMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    periodDays: 365,
    dailyBgRemovalLimit: 10,
    features: [
      '10 remove background per hari',
      'Editor foto dasar (Basic & Color)',
      'Export PNG & JPG',
      'Proyek akun tersimpan di server',
      'Bebas watermark tanpa batas',
    ],
    isActive: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    periodDays: 30,
    dailyBgRemovalLimit: 250,
    features: [
      '250 remove background per hari',
      'Pemrosesan batch cepat',
      'Semua filter preset premium',
      'Export kualitas tinggi & WEBP',
      'Riwayat cloud & project tanpa batas',
      'Prioritas pemrosesan server AI',
    ],
    isActive: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 29,
    periodDays: 30,
    dailyBgRemovalLimit: 9999,
    features: [
      'Unlimited remove background',
      'Pemrosesan model U2Net asli',
      'Export resolusi 4K Ultra-HD',
      'Dukungan prioritas tiket langsung',
      'Akses fitur-fitur baru lebih awal',
    ],
    isActive: true,
  },
];

export const SimulatedMembershipModal: React.FC<SimulatedMembershipModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, loginDemoUser, upgradeTierSimulated } = useAuth();
  const [plans, setPlans] = useState<any[]>(DEFAULT_PLANS);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedTier, setSelectedTier] = useState<MembershipTier>('Pro');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card (Simulated)');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<string | null>(null);

  // Coupon promo state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingPlans(true);
    api
      .getPlans()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load plans from server, falling back to defaults:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan = plans.find((p) => p.name.toLowerCase() === selectedTier.toLowerCase()) || plans[1];
  const effectivePrice = appliedCoupon ? appliedCoupon.finalPrice : (currentPlan?.price || 0);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await api.validateCoupon(couponCode.trim().toUpperCase(), currentPlan?.price || 0);
      if (res.valid) {
        setAppliedCoupon(res);
        toast.success(t(`Kupon ${res.coupon.code} berhasil digunakan! Hemat $${res.discountValue}`, `Coupon ${res.coupon.code} applied! Saved $${res.discountValue}`));
      } else {
        setAppliedCoupon(null);
        toast.error(res.message || t('Kupon promo tidak valid atau sudah kadaluarsa.', 'Coupon is invalid or expired.'));
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      toast.error(err.message || t('Gagal memeriksa kode kupon', 'Failed to check coupon code'));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSimulateCheckout = async () => {
    if (!user) {
      toast.info(t('Silakan masuk atau daftar akun terlebih dahulu untuk melanjutkan.', 'Please sign in or register first to proceed.'));
      navigate('/login', { state: { returnTo: '/subscription', selectedTier } });
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      const invoice = await upgradeTierSimulated(selectedTier, effectivePrice, appliedCoupon?.coupon?.code, paymentMethod);
      setSuccessInvoice(invoice);
      toast.success(t(`Simulasi membership ${selectedTier} berhasil diaktifkan!`, `Simulated membership ${selectedTier} successfully activated!`));
    } catch (err: any) {
      toast.error(err.message || t('Simulasi pembayaran gagal.', 'Simulated payment failed.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFastDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      await loginDemoUser();
      toast.success(t('Berhasil masuk dengan Akun Demo! Anda kini dapat melanjutkan upgrade.', 'Logged in as Demo User! You can now continue your upgrade.'));
    } catch (err: any) {
      toast.error(err.message || t('Gagal masuk akun demo.', 'Failed to login as demo user.'));
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('Pilih Paket Membership Pixelift', 'Choose Pixelift Membership Plan')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Sistem simulasi pembayaran aman — tanpa kartu kredit nyata!', 'Secure simulated payment system — no real credit card required!')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {successInvoice ? (
            <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('Simulasi Pembayaran Berhasil!', 'Payment Simulation Successful!')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {t('Paket membership Anda kini telah ditingkatkan ke ', 'Your membership plan has been upgraded to ')}
                <strong className="text-brand-600 dark:text-brand-400">{selectedTier}</strong>.
                {' '}{t('Nomor Faktur Simulasi: ', 'Simulated Invoice #: ')}
                <code className="font-mono font-bold bg-white/60 dark:bg-slate-900/60 px-2 py-1 rounded">
                  {successInvoice}
                </code>
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessInvoice(null);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  {t('Mulai Gunakan Fitur ', 'Start Using Features ')}{selectedTier}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const planTier = (p.name || 'Free') as MembershipTier;
                  const isCurrent = user?.membership?.toLowerCase() === planTier.toLowerCase();
                  const isSelected = selectedTier.toLowerCase() === planTier.toLowerCase();
                  const isPro = planTier.toLowerCase() === 'pro';

                  const priceLabel = p.price === 0 ? '$0' : `$${p.price}`;
                  const periodLabel =
                    p.price === 0
                      ? t('Gratis Selamanya', 'Free Forever')
                      : t(`/ ${p.periodDays || 30} hari (Simulasi)`, `/ ${p.periodDays || 30} days (Simulated)`);

                  return (
                    <div
                      key={p.id || planTier}
                      onClick={() => setSelectedTier(planTier)}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/40 dark:bg-brand-950/30 shadow-md ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {isPro && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-600 text-white shadow-sm">
                          {t('Paling Populer', 'Most Popular')}
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {p.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {p.dailyBgRemovalLimit >= 9000
                                ? t('Unlimited remove background AI', 'Unlimited AI background removals')
                                : `${p.dailyBgRemovalLimit} ${t('remove background per hari', 'background removals per day')}`}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {t('Aktif', 'Active')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {priceLabel}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {periodLabel}
                          </span>
                        </div>

                        <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {(p.features || []).map((feat: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                            >
                              <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 mt-auto">
                        <button
                          type="button"
                          className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isCurrent ? t('Paket Anda Saat Ini', 'Your Current Plan') : isSelected ? t('Dipilih', 'Selected') : t('Pilih Paket', 'Choose Plan')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guest Authentication Guidance Banner */}
              {!user ? (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-amber-950/30 border-2 border-indigo-200 dark:border-indigo-800/60 shadow-lg space-y-4 animate-slide-up">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          {t('Autentikasi Diperlukan', 'Authentication Required')}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {t('Paket Dipilih: ', 'Selected Plan: ')}{selectedTier} ({currentPlan?.price === 0 ? t('Gratis', 'Free') : `$${currentPlan?.price}`})
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {t('Silakan Masuk atau Buat Akun Baru', 'Please Sign In or Create New Account')}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {t(
                          `Anda saat ini belum masuk ke akun Pixelift. Untuk berlangganan paket ${selectedTier} dan menyimpan kuota harian serta project Anda, silakan masuk atau buat akun terlebih dahulu.`,
                          `You are not currently signed in to Pixelift. To subscribe to the ${selectedTier} plan and preserve your daily quota and projects, please sign in or register first.`
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/login', { state: { returnTo: '/subscription', selectedTier } });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{t('Masuk ke Akun', 'Sign In')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/register', { state: { returnTo: '/subscription', selectedTier } });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>{t('Daftar Akun Baru', 'Create Account')}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isDemoLoading}
                      onClick={handleFastDemoLogin}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 hover:bg-amber-200/80 transition-all ml-auto"
                    >
                      {isDemoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>{t('1-Klik Akun Demo (Simulasi Cepat)', '1-Click Demo Account (Fast Simulation)')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Simulation Checkout Controls for Authenticated Users */
                selectedTier !== 'Free' && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <CreditCard className="w-4 h-4 text-brand-600" />
                      <span>{t('Metode Pembayaran Simulasi:', 'Simulated Payment Method:')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        'Credit Card (Simulated)',
                        'E-Wallet (Simulated)',
                        'Bank Transfer (Simulated)',
                      ].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                            paymentMethod === method
                              ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>

                    {/* Promo Code & Coupon Field */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <Tag className="w-3.5 h-3.5 text-brand-600" />
                          <span>{t('Punya Kode Promo / Kupon?', 'Have a Promo Code / Coupon?')}</span>
                        </div>
                        {appliedCoupon && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            {t('Kupon Aktif', 'Coupon Active')}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder={t('Ketik kode promo (misal: HEMAT50, SELLERBARU)...', 'Enter promo code (e.g. HEMAT50, SELLERBARU)...')}
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCoupon();
                              }
                            }}
                            className="w-full uppercase font-mono text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={validatingCoupon || !couponCode.trim()}
                          onClick={handleApplyCoupon}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1"
                        >
                          {validatingCoupon ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Ticket className="w-3.5 h-3.5" />
                          )}
                          <span>{t('Terapkan', 'Apply')}</span>
                        </button>
                      </div>

                      {/* Quick demo coupon suggestions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-400">{t('Contoh Kupon:', 'Example Coupons:')}</span>
                        {['HEMAT50', 'SELLERBARU', 'POTONGAN5', 'PROMO100'].map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setCouponCode(code);
                            }}
                            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            {code}
                          </button>
                        ))}
                      </div>

                      {/* Applied Coupon Info & Price Summary */}
                      {appliedCoupon && (
                        <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" />
                              <span>{t(`Kode ${appliedCoupon.coupon.code} diterapkan!`, `Code ${appliedCoupon.coupon.code} applied!`)}</span>
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              {t('Diskon ', 'Discount ')}{appliedCoupon.coupon.discountType === 'percent' ? `${appliedCoupon.coupon.discountValue}%` : `$${appliedCoupon.coupon.discountValue}`} ({t('Hemat $', 'Save $')}{appliedCoupon.discountValue})
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 line-through text-[11px] block">
                              ${currentPlan?.price}
                            </span>
                            <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                              {effectivePrice === 0 ? t('GRATIS $0', 'FREE $0') : `$${effectivePrice}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>{t('Simulasi aman instan — status langganan tersimpan di akun Anda', 'Instant secure simulation — subscription saved to your account')}</span>
                      </div>

                      <button
                        type="button"
                        disabled={isProcessing || user?.membership?.toLowerCase() === selectedTier.toLowerCase()}
                        onClick={handleSimulateCheckout}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-500/25 disabled:opacity-50 transition-all"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('Memproses Simulasi...', 'Processing Simulation...')}</span>
                          </>
                        ) : (
                          <>
                            <span>{t(`Konfirmasi Upgrade ke ${selectedTier}`, `Confirm Upgrade to ${selectedTier}`)}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
