import { toast, confirmAction, useLanguage } from '@pixellift/ui';
import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { Settings, Save, Check, Shield, Cpu, UploadCloud, Palette, RotateCcw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'general' | 'upload' | 'ai' | 'security' | 'appearance'>('general');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminApi.getSettings();
        setSettings(res);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    load();
  }, []);

  const handleChange = (key: string, val: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: val }));
  };

  const { language, setLanguage } = useLanguage();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    const confirmed = await confirmAction({
      title: 'Kembalikan Pengaturan ke Standar',
      message: 'Apakah Anda yakin ingin mereset seluruh parameter aplikasi (ukuran upload, rate limit, dsb) ke nilai bawaan sistem?',
      confirmText: 'Reset ke Standar',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await adminApi.resetSettings();
      setSettings(res.settings || res);
      toast.success('Pengaturan berhasil dikembalikan ke standar awal.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset pengaturan');
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateSettings(settings);
      if (settings.language && (settings.language === 'id' || settings.language === 'en')) {
        setLanguage(settings.language);
      }
      toast.success('Pengaturan berhasil disimpan.');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Application Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Konfigurasi batas upload, model engine AI, paket langganan, dan kebijakan keamanan.
        </p>
      </div>

      <div className="bg-white dark:bg-[#14132b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col md:flex-row">
        {/* Settings Navigation Tabs */}
        <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 space-y-1 text-xs font-semibold">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'upload', label: 'Upload & Limit', icon: UploadCloud },
            { id: 'ai', label: 'AI Engine', icon: Cpu },
            { id: 'security', label: 'Security & Auth', icon: Shield },
            { id: 'appearance', label: 'Appearance', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content Form */}
        <form onSubmit={handleSave} className="flex-1 p-6 space-y-5 text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>Pengaturan berhasil disimpan dan dicatat ke audit log!</span>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nama Aplikasi:</label>
                <input
                  type="text"
                  value={settings.appName || ''}
                  onChange={(e) => handleChange('appName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={settings.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Bahasa Default:</label>
                  <select
                    value={settings.language || 'id'}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Zona Waktu:</label>
                  <input
                    type="text"
                    value={settings.timezone || 'Asia/Jakarta'}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Maksimal Ukuran File (MB):
                  </label>
                  <input
                    type="number"
                    value={settings.maxFileSizeMb || 10}
                    onChange={(e) => handleChange('maxFileSizeMb', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Batas Proses Harian Free:
                  </label>
                  <input
                    type="number"
                    value={settings.dailyFreeLimit || 10}
                    onChange={(e) => handleChange('dailyFreeLimit', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                    Model Utama Background Removal (Default Server):
                  </label>
                  <select
                    value={settings.activeModel || 'ISNet'}
                    onChange={(e) => handleChange('activeModel', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
                  >
                    <option value="ISNet">⚡ IS-Net DIS5K 1024px (Presisi Tinggi & Halus - Rekomendasi)</option>
                    <option value="U2NetHumanSeg">👤 U2Net Human Seg (Khusus Potret, Orang & Pas Foto)</option>
                    <option value="BiRefNet">🧠 BiRefNet General Lite (1024px Swin-Tiny)</option>
                    <option value="U2Net">🚀 U2Net Standard (320px Super Cepat)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Ambang Batas Sensitivitas AI (Threshold):</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">{settings.confidenceThreshold ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={settings.confidenceThreshold ?? 50}
                    onChange={(e) => handleChange('confidenceThreshold', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Nilai lebih tinggi (50%-70%) efektif menghilangkan bayangan dinding dan halo ungu di sekitar objek potret.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-1.5">
                  <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <span>⚡ IS-Net DIS5K (1024px)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-600 text-white">Recommended</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Model terbaik untuk tepian rambut dan lekukan rumit. Eksekusi cepat (~2 detik di CPU) dengan hasil tajam.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1.5">
                  <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>👤 U2Net Human Seg</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white">Sub-detik</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Khusus memisahkan tubuh & pakaian manusia dari latar studio, sangat cepat (&lt;1 detik di CPU).
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">JWT Expiration:</label>
                  <input
                    type="text"
                    value={settings.jwtExpiresIn || '7d'}
                    onChange={(e) => handleChange('jwtExpiresIn', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Rate Limit / Menit:</label>
                  <input
                    type="number"
                    value={settings.rateLimitPerMinute || 120}
                    onChange={(e) => handleChange('rateLimitPerMinute', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Mode Pemeliharaan (Maintenance)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kunci akses publik saat sistem sedang dalam pembaruan.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode ?? false}
                  onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Warna Utama Brand:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.primaryColor || '#4F46E5'}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-36 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                  <input
                    type="color"
                    value={settings.primaryColor || '#4F46E5'}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer p-0.5"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-all disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Mereset...' : 'Kembalikan ke Standar'}</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
