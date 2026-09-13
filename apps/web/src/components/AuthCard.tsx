import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Scissors,
  Layers,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast, useLanguage } from '@pixellift/ui';

interface AuthCardProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  initialMode = 'login',
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { login, register, loginDemoUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewMode, setPreviewMode] = useState<'after' | 'before'>('after');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error(t('Nama lengkap wajib diisi', 'Full name is required'));
        await register(name.trim(), email.trim(), password);
        toast.success(t('Pendaftaran akun berhasil! Selamat datang di Pixelift Lite.', 'Registration successful! Welcome to Pixelift Lite.'));
      } else {
        await login(email.trim(), password);
        toast.success(t('Berhasil masuk ke akun Anda.', 'Logged in successfully.'));
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || t('Autentikasi gagal. Silakan periksa kembali email dan kata sandi Anda.', 'Authentication failed. Please check your email and password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoUser = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginDemoUser();
      toast.success(t('Masuk sebagai Demo User.', 'Signed in as Demo User.'));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || t('Gagal login demo user', 'Failed to login demo user'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-white dark:bg-[#11162b] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
      {/* Left Column: Spectacular Visual Demonstration */}
      <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden text-white border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Glow ambient effects */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Background Remover & Editor</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
            {t('Kreativitas visual tanpa batas & tanpa watermark.', 'Boundless visual creativity & 100% watermark free.')}
          </h2>

          <p className="text-xs text-indigo-200/80 leading-relaxed">
            {t(
              'Hapus background presisi subjek dalam 1 klik, perbaiki pencahayaan, dan ekspor resolusi tinggi secara instan.',
              'Remove backgrounds with 1-click subject precision, enhance lighting, and export high resolution instantly.'
            )}
          </p>
        </div>

        {/* Interactive Before & After Visual Preview Element */}
        <div className="relative z-10 my-6">
          <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-xl bg-slate-900 aspect-[4/3] flex items-center justify-center group">
            {previewMode === 'after' ? (
              <div className="w-full h-full checkerboard-pattern flex items-center justify-center p-3 relative animate-fadeIn">
                <img
                  src="/demo-cutout.png"
                  alt="AI Cutout Preview"
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/90 text-white shadow-sm flex items-center gap-1 backdrop-blur-sm">
                  <Scissors className="w-3 h-3" />
                  <span>{t('AI Cutout (Transparan)', 'AI Cutout (Transparent)')}</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative animate-fadeIn">
                <img
                  src="/demo-portrait.jpg"
                  alt="Original Photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900/80 text-white border border-white/20 shadow-sm backdrop-blur-sm">
                  {t('Foto Asli (Sebelum)', 'Original Photo (Before)')}
                </div>
              </div>
            )}

            {/* Toggle Preview Button */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setPreviewMode('before')}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  previewMode === 'before' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('Sebelum', 'Before')}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('after')}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  previewMode === 'after' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('Sesudah', 'After')}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-2 text-[11px] text-indigo-100 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{t('100% Bebas Watermark', '100% Free of Watermark')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>{t('Mesin AI Lokal Offline', 'Offline Local AI Engine')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>{t('Riwayat Proyek Otomatis', 'Automatic Project History')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span>{t('Privasi & Keamanan Penuh', 'Full Privacy & Security')}</span>
          </div>
        </div>
      </div>

      {/* Right Column: High-Converting Auth Form */}
      <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
        {/* Animated Mode Switcher Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-6 relative">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center relative z-10 ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('Masuk ke Akun', 'Sign In')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center relative z-10 ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('Daftar Akun Baru', 'Create Account')}
          </button>
        </div>

        {/* 1-Click Demo Button */}
        <button
          type="button"
          onClick={handleDemoUser}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-sm disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>{t('1-Klik Demo User (user@pixellift.test)', '1-Click Demo User (user@pixellift.test)')}</span>
        </button>

        <div className="relative flex py-2 items-center mb-3">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            {t('atau gunakan email', 'or continue with email')}
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium animate-fadeIn">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('Nama Lengkap', 'Full Name')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={t('Nama Lengkap Anda', 'Your Full Name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('Alamat Email', 'Email Address')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('Kata Sandi', 'Password')}
              </label>
              {mode === 'login' && (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                  {t('Lupa sandi?', 'Forgot password?')}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={t('Minimal 6 karakter', 'At least 6 characters')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 mt-2"
          >
            <span>
              {loading
                ? t('Memproses...', 'Processing...')
                : mode === 'register'
                ? t('Buat Akun Gratis Sekarang', 'Create Free Account Now')
                : t('Masuk ke Akun', 'Sign In to Account')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
          {mode === 'login' ? (
            <p>
              {t('Belum punya akun? ', "Don't have an account? ")}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('Daftar sekarang gratis', 'Sign up free now')}
              </button>
            </p>
          ) : (
            <p>
              {t('Sudah memiliki akun? ', 'Already have an account? ')}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('Masuk ke sini', 'Sign in here')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
