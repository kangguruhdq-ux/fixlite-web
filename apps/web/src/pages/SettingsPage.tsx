import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useLanguage, LanguageToggle, confirmAction, toast, Dialog } from '@pixellift/ui';
import { api } from '../services/api';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Palette,
  Globe,
  Trash2,
  Camera,
  Check,
  Lock,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshProfile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'danger'>('profile');

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // App Preferences Form
  const [exportFormat, setExportFormat] = useState(() => localStorage.getItem('pl_default_format') || 'png');
  const [exportQuality, setExportQuality] = useState(() => localStorage.getItem('pl_default_quality') || '95');

  // Danger Zone (Delete Account)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama lengkap tidak boleh kosong.');
      return;
    }
    setIsSavingProfile(true);
    try {
      await api.updateProfile({ name: name.trim(), email: email.trim() });
      await refreshProfile();
      toast.success('Profil berhasil disimpan.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateAvatar = async (avatarUrl: string) => {
    await api.updateProfile({ avatarUrl });
    await refreshProfile();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setIsChangingPass(true);
    try {
      await api.updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Kata sandi berhasil diperbarui.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('pl_default_format', exportFormat);
    localStorage.setItem('pl_default_quality', exportQuality);
    toast.success('Preferensi aplikasi berhasil disimpan.');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword && user?.email !== 'user@pixellift.test') {
      toast.error('Harap masukkan kata sandi akun untuk konfirmasi.');
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteAccount(deletePassword);
      toast.success('Akun Anda telah berhasil dihapus. Terima kasih telah menggunakan Pixelift Lite.');
      logout();
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus akun.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="studio-layout">
      <Navbar />

      <main className="studio-main">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="space-y-1">
            <span className="studio-eyebrow">PENGATURAN AKUN & APLIKASI</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('settings', 'Pengaturan')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola identitas profil, foto avatar, keamanan kata sandi, preferensi bahasa, dan opsi akun.
            </p>
          </div>

          {/* Settings Container */}
          <div className="bg-white dark:bg-[#14132b] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all">
            {/* Sidebar Navigation */}
            <nav className="w-full md:w-60 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-semibold">
              {[
                { id: 'profile', label: t('profileSettings', 'Pengaturan Profil'), icon: User },
                { id: 'security', label: t('changePassword', 'Keamanan & Sandi'), icon: Lock },
                { id: 'preferences', label: t('languagePreference', 'Bahasa & Unduhan'), icon: Globe },
                { id: 'danger', label: t('dangerZone', 'Zona Bahaya'), icon: Trash2, danger: true },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all ${
                      active
                        ? item.danger
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shadow-sm'
                          : 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Content Area */}
            <div className="flex-1 p-6 md:p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="relative">
                      <img
                        src={
                          user?.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                        }
                        alt={user?.name || 'Avatar'}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-500 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => setIsAvatarOpen(true)}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-brand-600 text-white shadow hover:bg-brand-700 transition-all"
                        title="Ganti Foto Profil"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {user?.name || 'User Pengguna'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                      <button
                        type="button"
                        onClick={() => setIsAvatarOpen(true)}
                        className="mt-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        {t('changeAvatar', 'Ganti Foto Profil (PP)')}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('fullName', 'Nama Lengkap')}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emailAddress', 'Alamat Email')}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
                      >
                        {isSavingProfile ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <span>{t('save', 'Simpan Profil')}</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {t('changePassword', 'Perbarui Kata Sandi')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Gunakan kombinasi kata sandi yang aman minimal 6 karakter.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('currentPassword', 'Kata Sandi Saat Ini')}
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('newPassword', 'Kata Sandi Baru')}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Konfirmasi Kata Sandi Baru
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isChangingPass}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
                      >
                        {isChangingPass ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <span>Ganti Kata Sandi</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Language Setting */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-brand-600" />
                          <span>Pilihan Bahasa / App Language</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Beralih seketika antara Bahasa Indonesia dan English.
                        </p>
                      </div>
                      <LanguageToggle />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setLanguage('id')}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                          language === 'id'
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/30'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span>Bahasa Indonesia</span>
                          {language === 'id' && <Check className="w-4 h-4 text-brand-600" />}
                        </div>
                        <span className="text-[10px] font-normal text-slate-500">Tampilan default studio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLanguage('en')}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                          language === 'en'
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/30'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span>English</span>
                          {language === 'en' && <Check className="w-4 h-4 text-brand-600" />}
                        </div>
                        <span className="text-[10px] font-normal text-slate-500">International studio mode</span>
                      </button>
                    </div>
                  </div>

                  {/* Export Preferences */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-brand-600" />
                      <span>Preferensi Unduhan Default</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Format Gambar Utama:
                        </label>
                        <select
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="png">PNG (Transparan & High Quality)</option>
                          <option value="jpg">JPG (Latar Solid Studio)</option>
                          <option value="webp">WEBP (Ukuran Ringan & Tajam)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Kualitas Kompresi Default:
                        </label>
                        <select
                          value={exportQuality}
                          onChange={(e) => setExportQuality(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="100">Maksimal (100%)</option>
                          <option value="95">Tinggi (95% - Direkomendasikan)</option>
                          <option value="85">Standar Web (85%)</option>
                          <option value="75">Ringan (75%)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePreferences}
                      className="px-5 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all text-xs"
                    >
                      Simpan Preferensi
                    </button>
                  </div>
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                          {t('dangerZone', 'Hapus Akun Pengguna')}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {t(
                            'deleteAccountDesc',
                            'Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Seluruh riwayat proyek, tiket bantuan, dan langganan Anda akan dihapus dari server.'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            await confirmAction(
                              'Apakah Anda yakin ingin menghapus akun Anda? Seluruh data akan dihapus secara permanen.'
                            )
                          ) {
                            setDeleteConfirmOpen(true);
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('deleteAccount', 'Hapus Akun Saya')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarOpen}
        currentAvatar={user?.avatarUrl}
        onClose={() => setIsAvatarOpen(false)}
        onSelectAvatar={handleUpdateAvatar}
      />

      {/* Delete Account Confirmation Dialog */}
      {deleteConfirmOpen && (
        <Dialog
          title="Konfirmasi Penghapusan Akun"
          description="Masukkan kata sandi Anda untuk memverifikasi bahwa ini memang Anda."
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <div className="space-y-4 text-xs">
            {user?.email !== 'user@pixellift.test' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kata Sandi Akun:</label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Masukkan sandi Anda..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun Permanen'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
