import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppLanguage, setAppLanguage, getLanguage, translateText } from './locale';
import { Languages } from 'lucide-react';

export type SupportedLanguage = 'id' | 'en';

export interface Translations {
  [key: string]: {
    id: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  dashboard: { id: 'Dashboard', en: 'Dashboard' },
  editor: { id: 'Editor', en: 'Editor' },
  myProjects: { id: 'Proyek Saya', en: 'My Projects' },
  settings: { id: 'Pengaturan', en: 'Settings' },
  subscription: { id: 'Riwayat Langganan', en: 'Subscription' },
  helpAndFaq: { id: 'Bantuan & FAQ', en: 'Help & FAQ' },
  supportTickets: { id: 'Tiket Bantuan', en: 'Support Tickets' },
  login: { id: 'Login', en: 'Login' },
  logout: { id: 'Logout', en: 'Logout' },
  register: { id: 'Daftar', en: 'Register' },
  adminPortal: { id: 'Portal Admin', en: 'Admin Portal' },
  
  // General Actions
  save: { id: 'Simpan', en: 'Save' },
  cancel: { id: 'Batal', en: 'Cancel' },
  delete: { id: 'Hapus', en: 'Delete' },
  edit: { id: 'Edit', en: 'Edit' },
  close: { id: 'Tutup', en: 'Close' },
  search: { id: 'Cari...', en: 'Search...' },
  download: { id: 'Unduh', en: 'Download' },
  upload: { id: 'Unggah', en: 'Upload' },
  retry: { id: 'Coba Lagi', en: 'Retry' },
  refresh: { id: 'Muat Ulang', en: 'Refresh' },
  status: { id: 'Status', en: 'Status' },
  action: { id: 'Aksi', en: 'Action' },
  
  // Settings & Profile
  profileSettings: { id: 'Pengaturan Profil', en: 'Profile Settings' },
  changeAvatar: { id: 'Ganti Foto Profil (PP)', en: 'Change Profile Picture' },
  choosePreset: { id: 'Pilih Avatar Preset', en: 'Choose Avatar Preset' },
  uploadCustomPhoto: { id: 'Unggah Foto Kustom', en: 'Upload Custom Photo' },
  fullName: { id: 'Nama Lengkap', en: 'Full Name' },
  emailAddress: { id: 'Alamat Email', en: 'Email Address' },
  changePassword: { id: 'Ganti Kata Sandi', en: 'Change Password' },
  currentPassword: { id: 'Kata Sandi Saat Ini', en: 'Current Password' },
  newPassword: { id: 'Kata Sandi Baru', en: 'New Password' },
  languagePreference: { id: 'Bahasa Aplikasi', en: 'App Language' },
  dangerZone: { id: 'Zona Bahaya', en: 'Danger Zone' },
  deleteAccount: { id: 'Hapus Akun Saya', en: 'Delete My Account' },
  deleteAccountDesc: { id: 'Tindakan ini permanen. Seluruh proyek dan riwayat Anda akan dihapus.', en: 'This action is permanent. All your projects and history will be deleted.' },

  // Subscription
  currentPlan: { id: 'Paket Langganan Aktif', en: 'Current Subscription' },
  validUntil: { id: 'Berlaku Hingga', en: 'Valid Until' },
  lifetime: { id: 'Berlaku Selamanya', en: 'Lifetime Free' },
  daysLeft: { id: 'hari tersisa', en: 'days remaining' },
  upgradePlan: { id: 'Upgrade / Ganti Paket', en: 'Upgrade / Switch Plan' },
  cancelSubscription: { id: 'Batalkan Langganan', en: 'Cancel Subscription' },
  billingHistory: { id: 'Riwayat Faktur & Pembayaran', en: 'Billing & Invoices History' },
  invoiceNumber: { id: 'Nomor Faktur', en: 'Invoice #' },
  viewInvoice: { id: 'Lihat Faktur', en: 'View Invoice' },

  // Support
  faqTitle: { id: 'Pertanyaan yang Sering Diajukan', en: 'Frequently Asked Questions' },
  createTicket: { id: 'Buat Tiket Bantuan', en: 'Create Support Ticket' },
  myTickets: { id: 'Riwayat Tiket Saya', en: 'My Support Tickets' },
  ticketSubject: { id: 'Subjek Kendala', en: 'Subject' },
  ticketCategory: { id: 'Kategori', en: 'Category' },
  ticketPriority: { id: 'Prioritas', en: 'Priority' },
  ticketMessage: { id: 'Pesan / Penjelasan Masalah', en: 'Message / Issue Details' },
  sendReply: { id: 'Kirim Balasan', en: 'Send Reply' },
  closeTicket: { id: 'Tutup Tiket', en: 'Close Ticket' },

  // Admin
  userManagement: { id: 'Manajemen Pengguna', en: 'User Management' },
  transactionsLedger: { id: 'Buku Besar Transaksi', en: 'Transactions Ledger' },
  aiProcessMonitor: { id: 'Monitor Pemrosesan AI', en: 'AI Process Monitor' },
  auditTrails: { id: 'Sistem Jejak Audit', en: 'Audit Trails' },
  systemSettings: { id: 'Pengaturan Sistem', en: 'System Settings' },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language=useAppLanguage();
  const setLanguage=setAppLanguage;
  const toggleLanguage=()=>setAppLanguage(language==='id'?'en':'id');

  const t = (key: string, fallback?: string): string => {
    if (translations[key]) {
      return translations[key][language];
    }
    if (language === 'en') {
      if (fallback) return fallback;
      return translateText(key, 'en');
    } else {
      return translateText(key, 'id');
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    const lang: SupportedLanguage = getLanguage();
    return {
      language: lang,
      setLanguage: setAppLanguage,
      toggleLanguage: () => setAppLanguage(lang === 'id' ? 'en' : 'id'),
      t: (key: string, fallback?: string) => {
        const cur = getLanguage();
        if (translations[key]) return translations[key][cur];
        if (cur === 'en') {
          if (fallback) return fallback;
          return translateText(key, 'en');
        } else {
          return translateText(key, 'id');
        }
      },
    };
  }
  return context;
}

export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      aria-label="Language Toggle"
    >
      <Languages className="w-3.5 h-3.5" />
      <span className="uppercase tracking-wider text-[11px] font-mono">{language === 'id' ? 'ID' : 'EN'}</span>
    </button>
  );
};
