import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { PLBrandLogo, ThemeToggle, NotificationCenter, Dialog, LanguageToggle, useLanguage } from '@pixellift/ui';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Wand2,
  FolderOpen,
  Crown,
  HelpCircle,
  LogOut,
  Menu,
  ExternalLink,
  UserRound,
  Settings,
  CreditCard,
  Layers,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { SimulatedMembershipModal } from './SimulatedMembershipModal';
import { BatchRemovalModal } from './BatchRemovalModal';

type Props = {
  onOpenProjects?: () => void;
  onOpenMembership?: () => void;
  onOpenSupport?: () => void;
  onOpenAuth?: () => void;
  onTryDemo?: () => void;
};

export function Navbar(props: Props) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState(false);
  const [plans, setPlans] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  const openAuth = () => (props.onOpenAuth ? props.onOpenAuth() : setAuth(true));
  const openPlans = () => (props.onOpenMembership ? props.onOpenMembership() : setPlans(true));

  const links = [
    { to: '/', label: t('dashboard', 'Dashboard'), icon: LayoutDashboard },
    { to: '/editor', label: t('editor', 'Editor'), icon: Wand2 },
    { to: '/projects', label: t('myProjects', 'Proyek saya'), icon: FolderOpen },
    { to: '/subscription', label: t('subscription', 'Langganan'), icon: Crown },
    { to: '/support', label: t('helpAndFaq', 'Bantuan'), icon: HelpCircle },
  ];

  return (
    <>
      <header className="studio-navbar">
        <div className="studio-navbar-inner">
          <NavLink to="/" aria-label="Pixelift Dashboard">
            <PLBrandLogo />
          </NavLink>

          <nav className="studio-desktop-nav" aria-label="Navigasi utama">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink end key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="studio-nav-actions">
            <button
              type="button"
              onClick={() => setBatchOpen(true)}
              className="studio-batch-button flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all shadow-sm"
              title="Hapus Background Banyak Foto Sekaligus"
            >
              <Layers size={14} />
              <span>Batch AI</span>
            </button>

            <button className="pl-btn studio-plan-button" onClick={openPlans}>
              <Crown size={15} />
              <span>{user?.membership || 'Free'} Plan</span>
            </button>

            <LanguageToggle className="hidden lg:flex" />
            <NotificationCenter />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} className="pl-icon-btn" />

            <button
              className="pl-icon-btn studio-profile overflow-hidden p-0"
              onClick={() => (user ? setMenu(true) : openAuth())}
              aria-label={user ? 'Menu akun' : 'Login'}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : user ? (
                <span className="font-bold">{user.name.slice(0, 1).toUpperCase()}</span>
              ) : (
                <UserRound size={18} />
              )}
            </button>

            <button className="pl-icon-btn studio-menu-toggle" onClick={() => setMenu(true)} aria-label="Buka menu">
              <Menu size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Bar Navigation */}
      <nav className="studio-mobile-nav" aria-label="Navigasi mobile">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink end to={to} key={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Dropdown / Drawer Modal */}
      {menu && (
        <Dialog
          title={user ? user.name : t('Selamat Datang di Pixelift Lite', 'Welcome to Pixelift Lite')}
          description={user?.email || t('Aplikasi editor foto & AI background remover instan.', 'Instant photo editor & AI background remover.')}
          onClose={() => setMenu(false)}
        >
          <div className="pl-form text-xs">
            {user ? (
              <>
                <button
                  className="pl-btn"
                  onClick={() => {
                    setMenu(false);
                    navigate('/settings');
                  }}
                >
                  <Settings size={17} />
                  <span>{t('Pengaturan Akun & Ganti PP', 'Account Settings & Avatar')}</span>
                </button>
                <button
                  className="pl-btn"
                  onClick={() => {
                    setMenu(false);
                    navigate('/subscription');
                  }}
                >
                  <CreditCard size={17} />
                  <span>{t('Riwayat Langganan & Faktur', 'Subscription & Invoices')}</span>
                </button>
                <button
                  className="pl-btn"
                  onClick={() => {
                    setMenu(false);
                    navigate('/support');
                  }}
                >
                  <HelpCircle size={17} />
                  <span>{t('Bantuan, FAQ & Tiket', 'Help, FAQ & Tickets')}</span>
                </button>
              </>
            ) : (
              <button
                className="pl-btn pl-btn-primary"
                onClick={() => {
                  setMenu(false);
                  openAuth();
                }}
              >
                {t('Login / Daftar Akun', 'Login / Register Account')}
              </button>
            )}

            <button
              className="pl-btn"
              onClick={() => {
                setMenu(false);
                setBatchOpen(true);
              }}
            >
              <Layers size={17} />
              <span>{t('Batch AI (Hapus Massal)', 'Batch AI (Bulk Removal)')}</span>
            </button>

            <button
              className="pl-btn"
              onClick={() => {
                setMenu(false);
                openPlans();
              }}
            >
              <Crown size={17} />
              <span>{t('Pilih Paket', 'Choose Plan')} {user?.membership || 'Free'}</span>
            </button>

            {user?.role && user.role !== 'User' && (
              <a
                className="pl-btn"
                href={`${window.location.protocol}//${window.location.hostname}:5174`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} />
                <span>{t('Portal Admin', 'Admin Portal')}</span>
              </a>
            )}

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 lg:hidden">
              <span className="font-semibold text-slate-600 dark:text-slate-300">{t('Bahasa / Language', 'Language')}</span>
              <LanguageToggle />
            </div>

            {user && (
              <button
                className="pl-btn pl-btn-danger"
                onClick={() => {
                  logout();
                  setMenu(false);
                  navigate('/');
                }}
              >
                <LogOut size={17} />
                <span>{t('Logout', 'Logout')}</span>
              </button>
            )}
          </div>
        </Dialog>
      )}

      {/* Modals */}
      <AuthModal isOpen={auth} onClose={() => setAuth(false)} />
      <SimulatedMembershipModal isOpen={plans} onClose={() => setPlans(false)} />
      <BatchRemovalModal isOpen={batchOpen} onClose={() => setBatchOpen(false)} />
    </>
  );
}
