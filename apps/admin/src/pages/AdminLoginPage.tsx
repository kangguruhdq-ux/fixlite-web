import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { PLBrandLogo } from '@pixellift/ui';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@pixellift.test');
  const [password, setPassword] = useState('Demo123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <PLBrandLogo size="lg" admin={true} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Masuk ke Pixellift Admin Operations Portal
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Email Admin:</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Password:</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Memverifikasi...' : 'Masuk Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/40 border border-indigo-900/60 text-center space-y-1">
          <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
            <span>Kredensial Demo Super Admin Terisi</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Email: admin@pixellift.test &bull; Sandi: Demo123!
          </div>
        </div>
      </div>
    </div>
  );
};
