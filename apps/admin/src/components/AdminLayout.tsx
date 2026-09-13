import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { PLBrandLogo, ThemeToggle, NotificationCenter, Dialog, LanguageToggle, toast, useLanguage } from '@pixellift/ui';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminApi } from '../services/api';
import { AvatarPickerModal } from './AvatarPickerModal';
import { LayoutDashboard, Users, FolderOpen, Scissors, CreditCard, Crown, Headphones, Flag, BarChart3, Settings, ShieldCheck, Search, LogOut, Menu, X, Palette, ScrollText, Megaphone, ArrowUpRight, ChevronRight, Camera } from 'lucide-react';
const all = ['Super Admin','Admin','Support Admin','Content Admin','Analyst'];
const navigation = [
 {label:'Ringkasan',fallback:'Overview',path:'/',icon:LayoutDashboard,roles:all,group:'WORKSPACE'},
 {label:'Pengguna',fallback:'Users',path:'/users',icon:Users,roles:['Super Admin','Admin','Analyst'],group:'WORKSPACE'},
 {label:'Proyek',fallback:'Projects',path:'/projects',icon:FolderOpen,roles:['Super Admin','Admin','Analyst'],group:'WORKSPACE'},
 {label:'Proses background',fallback:'Background Removal',path:'/background-removal',icon:Scissors,roles:['Super Admin','Admin','Analyst'],group:'WORKSPACE'},
 {label:'Preset & filter',fallback:'Presets & Filters',path:'/presets',icon:Palette,roles:['Super Admin','Admin','Content Admin'],group:'WORKSPACE'},
 {label:'Transaksi',fallback:'Transactions',path:'/transactions',icon:CreditCard,roles:['Super Admin','Admin','Analyst'],group:'OPERASIONAL'},
 {label:'Membership',fallback:'Memberships',path:'/memberships',icon:Crown,roles:['Super Admin','Admin','Analyst'],group:'OPERASIONAL'},
 {label:'Bantuan & FAQ',fallback:'Help & FAQ',path:'/support-tickets',icon:Headphones,roles:['Super Admin','Admin','Support Admin'],group:'OPERASIONAL'},
 {label:'Laporan',fallback:'Reports',path:'/reports',icon:Flag,roles:['Super Admin','Admin','Support Admin'],group:'OPERASIONAL'},
 {label:'Pengumuman',fallback:'Announcements',path:'/notifications',icon:Megaphone,roles:['Super Admin','Admin','Support Admin'],group:'OPERASIONAL'},
 {label:'Analitik',fallback:'Analytics',path:'/analytics',icon:BarChart3,roles:all,group:'SISTEM'},
 {label:'Audit log',fallback:'Audit Logs',path:'/audit-logs',icon:ScrollText,roles:['Super Admin','Admin','Analyst'],group:'SISTEM'},
 {label:'Pengaturan',fallback:'Settings',path:'/settings',icon:Settings,roles:['Super Admin','Admin','Analyst'],group:'SISTEM'},
 {label:'Administrator',fallback:'Administrators',path:'/admin-management',icon:ShieldCheck,roles:['Super Admin'],group:'SISTEM'},
];
export function AdminLayout({children}:{children:React.ReactNode}) {
 const {adminUser,logout,updateAdminUser}=useAdminAuth(), {isDark,toggleTheme}=useTheme(), location=useLocation(),navigate=useNavigate();
 const { t } = useLanguage();
 const [open,setOpen]=useState(false), [searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState('');
 const [avatarModalOpen, setAvatarModalOpen] = useState(false);
 const items=navigation.filter(n=>n.roles.includes(adminUser?.role || ''));
 const current=navigation.find(n=>n.path===location.pathname);

 useEffect(()=>{setOpen(false);},[location.pathname]);
 useEffect(()=>{if(!open)return; const previous=document.body.style.overflow;document.body.style.overflow='hidden';const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',close);};},[open]);

 const handleSaveAvatar = async (url: string) => {
   try {
     await adminApi.updateMyProfile({ avatarUrl: url });
     updateAdminUser({ avatarUrl: url });
     toast.success('Foto profil admin berhasil disimpan.');
   } catch (err: any) {
     toast.error(err.message || 'Gagal menyimpan foto profil.');
     throw err;
   }
 };

 return <div className="admin-shell">
  {open && <button className="admin-sidebar-backdrop" aria-label="Tutup navigasi" onClick={()=>setOpen(false)}/>}
  <aside className="admin-sidebar" data-open={open}><div className="admin-brand"><PLBrandLogo admin/><button className="pl-icon-btn admin-menu-button" onClick={()=>setOpen(false)} aria-label="Tutup menu"><X size={19}/></button></div><div className="admin-workspace-label"><span className="admin-workspace-icon"><ShieldCheck size={17}/></span><div><strong>{t('Admin workspace', 'Admin Workspace')}</strong><small>Pixelift Lite</small></div><span className="admin-online-dot"/></div>
    <nav aria-label="Navigasi admin">{[{id:'WORKSPACE',fb:'WORKSPACE'},{id:'OPERASIONAL',fb:'OPERATIONS'},{id:'SISTEM',fb:'SYSTEM'}].map(group=><div key={group.id}><p className="admin-nav-group">{t(group.id, group.fb)}</p>{items.filter(n=>n.group===group.id).map(({path,label,fallback,icon:Icon})=><NavLink end to={path} key={path} className={({isActive})=>isActive?'is-active':''} onClick={()=>setOpen(false)}><Icon size={17}/><span>{t(label, fallback)}</span>{location.pathname===path && <ChevronRight size={14}/>}</NavLink>)}</div>)}</nav>
    <div className="admin-sidebar-footer">
      <a className="pl-btn" href={window.location.protocol+'//'+window.location.hostname+':5173'} target="_blank" rel="noreferrer">{t('Buka studio', 'Open Studio')} <ArrowUpRight size={16}/></a>
      <div className="admin-sidebar-profile">
        <button type="button" onClick={()=>setAvatarModalOpen(true)} title="Ganti Foto Profil (PP)" className="relative group cursor-pointer">
          {adminUser?.avatarUrl ? (
            <img src={adminUser.avatarUrl} alt={adminUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/40 group-hover:opacity-75 transition-all" />
          ) : (
            <span className="group-hover:opacity-75 transition-all">{adminUser?.name.slice(0,1)}</span>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={12} className="text-white" />
          </div>
        </button>
        <div className="cursor-pointer" onClick={()=>setAvatarModalOpen(true)} title="Ganti Foto Profil (PP)">
          <strong>{adminUser?.name}</strong>
          <small>{adminUser?.role}</small>
        </div>
        <button className="pl-icon-btn" title="Logout Admin" aria-label="Logout Admin" onClick={logout}><LogOut size={17}/></button>
      </div>
    </div>
   </aside>
   <div className="admin-content">
     <header className="admin-topbar">
       <div className="admin-topbar-title">
         <button className="pl-icon-btn admin-menu-button" aria-label={t('Buka navigasi admin', 'Open admin navigation')} onClick={()=>setOpen(true)}><Menu size={20}/></button>
         <span>{t('Workspace', 'Workspace')}</span><ChevronRight size={14}/><strong>{t(current?.label || 'Dashboard', current?.fallback || 'Dashboard')}</strong>
       </div>
       <div className="admin-topbar-actions">
         <button className="admin-search-trigger pl-btn" onClick={()=>setSearchOpen(true)} aria-label={t('Cari halaman admin', 'Search admin pages')}><Search size={16}/><span>{t('Cari halaman...', 'Search pages...')}</span></button>
        <NotificationCenter/>
        <LanguageToggle className="pl-icon-btn !px-2.5 !py-1 text-[11px]" />
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} className="pl-icon-btn"/>
        <button 
          className="admin-topbar-avatar flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all" 
          title={`${adminUser?.name} (Klik untuk ganti PP)`} 
          onClick={()=>setAvatarModalOpen(true)} 
          aria-label="Ganti Avatar Profil"
        >
          {adminUser?.avatarUrl ? (
            <img src={adminUser.avatarUrl} alt={adminUser.name} className="w-full h-full object-cover" />
          ) : (
            adminUser?.name.slice(0,1)
          )}
        </button>
        <button className="pl-icon-btn text-rose-500 hover:text-rose-600 dark:hover:text-rose-400" title="Logout Admin" aria-label="Logout Admin" onClick={logout}>
          <LogOut size={16} />
        </button>
      </div>
    </header>
   <main>{current && !current.roles.includes(adminUser?.role || '') ? <div className="pl-empty"><ShieldCheck size={36}/><h3>Akses terbatas</h3><p>Peran Anda tidak memiliki akses ke halaman ini.</p><button className="pl-btn" onClick={()=>navigate('/')}>Kembali ke ringkasan</button></div> : children}</main>
  </div>
  {searchOpen && <Dialog title="Cari halaman" description="Akses cepat ke fitur administrasi." onClose={()=>setSearchOpen(false)}><input className="pl-input" autoFocus placeholder="Pengguna, preset, tiket..." aria-label="Cari halaman" value={query} onChange={e=>setQuery(e.target.value)}/><div className="admin-search-results">{items.filter(n=>n.label.toLowerCase().includes(query.toLowerCase())).map(({path,label,icon:Icon})=><button key={path} onClick={()=>{navigate(path);setSearchOpen(false);setQuery('');}}><Icon size={17}/>{label}<ArrowUpRight size={16}/></button>)}</div></Dialog>}
  <AvatarPickerModal
    isOpen={avatarModalOpen}
    currentAvatar={adminUser?.avatarUrl}
    onClose={()=>setAvatarModalOpen(false)}
    onSelectAvatar={handleSaveAvatar}
  />
 </div>;
}
