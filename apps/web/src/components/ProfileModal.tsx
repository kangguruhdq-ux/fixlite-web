import React, { useState } from 'react';
import { Dialog, toast, useLanguage } from '@pixellift/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      await refreshProfile();
      toast.success(t('Profil berhasil diperbarui.', 'Profile updated successfully.'));
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={t('Pengaturan Akun', 'Account Settings')}
      description={t('Kelola profil dan kata sandi Anda.', 'Manage your profile and password.')}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="pl-form" onSubmit={save}>
        <label className="pl-field">
          {t('Nama Lengkap', 'Full Name')}
          <input
            className="pl-input"
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="pl-field">
          {t('Email', 'Email')}
          <input
            className="pl-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="pl-field">
          {t('Kata Sandi Saat Ini', 'Current Password')}
          <input
            className="pl-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <span className="pl-muted">
            {t('Diperlukan jika mengubah email atau kata sandi.', 'Required when changing email or password.')}
          </span>
        </label>
        <label className="pl-field">
          {t('Kata Sandi Baru (Opsional)', 'New Password (Optional)')}
          <input
            className="pl-input"
            type="password"
            minLength={6}
            maxLength={128}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button className="pl-btn pl-btn-primary" disabled={busy}>
          {busy ? t('Menyimpan...', 'Saving...') : t('Simpan Profil', 'Save Profile')}
        </button>
      </form>
    </Dialog>
  );
}
