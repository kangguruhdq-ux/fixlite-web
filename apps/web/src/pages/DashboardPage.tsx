import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Upload,
  ArrowUpRight,
  Scissors,
  SlidersHorizontal,
  ImagePlus,
  FolderOpen,
  Star,
  CheckCircle2,
  HardDrive,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { toast, useLanguage } from '@pixellift/ui';
import { Navbar } from '../components/Navbar';
import { ProjectLibrary } from '../components/ProjectLibrary';
import { useAuth } from '../context/AuthContext';
import { localProjectStorage, LocalProject } from '../services/indexedDb';
import { api } from '../services/api';

export function DashboardPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const input = useRef<HTMLInputElement>(null);
  const library = location.pathname === '/projects';
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [dragging, setDragging] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [statsError, setStatsError] = useState(false);
  const [noticeError, setNoticeError] = useState(false);

  useEffect(() => {
    let active = true;
    setProjects([]);
    setAnnouncements([]);
    setStatsError(false);
    setNoticeError(false);
    const load = () =>
      localProjectStorage
        .getAllProjects(user?.id || 'local_user')
        .then((p) => {
          if (active) {
            setProjects(p);
            setStatsError(false);
          }
        })
        .catch(() => {
          if (active) setStatsError(true);
        });
    load();
    window.addEventListener('pl:projects-changed', load);
    if (user) {
      api
        .getNotifications()
        .then((n) => {
          if (active) setAnnouncements(n);
        })
        .catch(() => {
          if (active) setNoticeError(true);
        });
    }
    return () => {
      active = false;
      window.removeEventListener('pl:projects-changed', load);
    };
  }, [user?.id]);

  const upload = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return toast.error(t('Pilih foto JPG, PNG, atau WEBP.', 'Please select a JPG, PNG, or WEBP photo.'));
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.error(t('Ukuran foto maksimal 10 MB.', 'Maximum photo size is 10 MB.'));
    }
    navigate('/editor', { state: { file } });
  };

  const open = (p: LocalProject) => navigate('/editor?project=' + encodeURIComponent(p.id));

  return (
    <div className="studio-shell">
      <Navbar />
      <main className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <div className="studio-eyebrow">
              {library ? t('KOLEKSI ANDA', 'YOUR COLLECTION') : t('RUANG KREATIF ANDA', 'YOUR CREATIVE SPACE')}
            </div>
            <h1>
              {library
                ? t('Proyek saya', 'My Projects')
                : `${t('Halo,', 'Hello,')} ${user?.name ? user.name.split(' ')[0] : t('Kreator', 'Creator')}`}
            </h1>
            <p>
              {library
                ? t('Semua karya Anda, siap untuk dilanjutkan.', 'All your work, ready to continue.')
                : t(
                    'Ubah foto biasa menjadi karya luar biasa. Mulai dari sini.',
                    'Transform ordinary photos into extraordinary visuals. Start here.'
                  )}
            </p>
          </div>
          <button className="pl-btn pl-btn-primary" onClick={() => input.current?.click()}>
            <ImagePlus size={17} />
            {t('Proyek baru', 'New Project')}
          </button>
        </div>

        <input
          ref={input}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t('Unggah proyek baru', 'Upload new project')}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {!library && (
          <>
            <section className="dashboard-hero-grid">
              <div
                className={'studio-upload-hero ' + (dragging ? 'is-dragging' : '')}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  upload(e.dataTransfer.files[0]);
                }}
              >
                <div className="hero-content">
                  <span className="hero-label">
                    <Sparkles size={14} />
                    {t('FOTO HEBAT ANDA BERIKUTNYA', 'YOUR NEXT GREAT PHOTO')}
                  </span>
                  <h2>
                    {t('Foto Anda.', 'Your Photo.')}
                    <br />
                    <span>{t('Kemungkinan tanpa batas.', 'Limitless possibilities.')}</span>
                  </h2>
                  <p>
                    {t(
                      'Hapus latar, sesuaikan warna, dan buat visual yang siap dibagikan.',
                      'Remove backgrounds, adjust colors, and craft share-ready visuals.'
                    )}
                  </p>
                  <button className="hero-upload-button" onClick={() => input.current?.click()}>
                    <Upload size={18} />
                    {t('Unggah foto', 'Upload Photo')} <ArrowUpRight size={17} />
                  </button>
                  <small>
                    {t(
                      'atau tarik foto ke sini · JPG, PNG, WEBP · maks. 10 MB',
                      'or drag and drop photo here · JPG, PNG, WEBP · max 10 MB'
                    )}
                  </small>
                </div>

                <div className="hero-photo-composition" aria-hidden="true">
                  <div className="hero-photo-back" />
                  <div className="hero-photo-card">
                    <img src="/demo-portrait.jpg" alt="" />
                    <span>
                      <Sparkles size={14} />
                      {t('Mulai berkreasi.', 'Make it yours.')}
                    </span>
                  </div>
                  <span className="hero-spark hero-spark-one">
                    <Sparkles size={28} />
                  </span>
                  <span className="hero-spark hero-spark-two">
                    <Sparkles size={20} />
                  </span>
                </div>
              </div>

              <aside className="dashboard-workflow pl-card">
                <span className="pl-badge">
                  <ShieldCheck size={13} />
                  {t('Ruang kerja pribadi', 'Private Workspace')}
                </span>
                <h3>
                  {t('Dari ide ke hasil,', 'From idea to result,')}
                  <br />
                  {t('dalam tiga langkah.', 'in three steps.')}
                </h3>
                <ol>
                  <li>
                    <span>01</span>
                    <div>
                      <strong>{t('Pilih foto terbaik Anda', 'Choose your best photo')}</strong>
                      <p>{t('Potret, produk, atau konten sosial.', 'Portraits, products, or social media.')}</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <strong>{t('Beri sentuhan kreatif', 'Add a creative touch')}</strong>
                      <p>{t('Atur latar, warna, dan komposisi.', 'Customize background, color, and framing.')}</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>{t('Simpan & bagikan', 'Save & share')}</strong>
                      <p>{t('Ekspor resolusi penuh, tanpa watermark.', 'Full resolution export, no watermarks.')}</p>
                    </div>
                  </li>
                </ol>
                <div className="workflow-footer">
                  <HardDrive size={16} />
                  <span>{t('Proyek tersimpan di browser ini', 'Projects saved locally in this browser')}</span>
                </div>
              </aside>
            </section>

            <section className="dashboard-stats" aria-label={t('Statistik proyek', 'Project Statistics')}>
              {[
                { label: t('Total proyek', 'Total Projects'), value: projects.length, icon: FolderOpen },
                {
                  label: t('Siap digunakan', 'Ready to Use'),
                  value: projects.filter((p) => p.status === 'Completed').length,
                  icon: CheckCircle2,
                },
                {
                  label: t('Dalam pengerjaan', 'In Progress'),
                  value: projects.filter((p) => p.status === 'Draft').length,
                  icon: SlidersHorizontal,
                },
                {
                  label: t('Favorit Anda', 'Your Favorites'),
                  value: projects.filter((p) => p.favorite).length,
                  icon: Star,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div className="stat-tile pl-card" key={label}>
                  <span className="stat-icon">
                    <Icon size={19} />
                  </span>
                  <div>
                    <strong>{statsError ? '—' : value}</strong>
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="dashboard-tools">
              <div className="section-heading">
                <div>
                  <h2>{t('Apa yang ingin Anda buat?', 'What do you want to create?')}</h2>
                  <p>{t('Alat yang tepat untuk setiap ide.', 'The right tools for every creative idea.')}</p>
                </div>
                <span className="pl-badge">{t('ALAT STUDIO', 'STUDIO TOOLS')}</span>
              </div>
              <div className="quick-tools">
                {[
                  {
                    title: t('Hapus background', 'Remove Background'),
                    description: t('Fokus pada subjek utama.', 'Focus on the main subject.'),
                    icon: Scissors,
                    tab: 'background',
                    color: 'purple',
                  },
                  {
                    title: t('Edit & percantik', 'Edit & Enhance'),
                    description: t('Warna, cahaya, dan detail.', 'Color, lighting, and fine details.'),
                    icon: SlidersHorizontal,
                    tab: 'adjust',
                    color: 'pink',
                  },
                  {
                    title: t('Siap untuk media sosial', 'Ready for Social Media'),
                    description: t('Sesuaikan rasio dan ekspor.', 'Adjust aspect ratios and export.'),
                    icon: ImagePlus,
                    tab: 'export',
                    color: 'blue',
                  },
                ].map(({ title, description, icon: Icon, tab, color }) => (
                  <button
                    className={'quick-tool pl-card ' + color}
                    key={title}
                    onClick={() => navigate('/editor?tool=' + tab)}
                  >
                    <span className="quick-tool-icon">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <ArrowUpRight size={19} />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <section>
          <div className="section-heading">
            <div>
              <h2>{library ? t('Koleksi proyek', 'Project Collection') : t('Terakhir dikerjakan', 'Recent Projects')}</h2>
              <p>
                {user
                  ? `${t('Koleksi lokal untuk akun', 'Local collection for account')} ${user.name}.`
                  : t(
                      'Koleksi lokal sebagai tamu. Login untuk ruang proyek akun Anda.',
                      'Local guest collection. Login to sync your personal projects.'
                    )}
              </p>
            </div>
            {!library && (
              <button className="pl-btn" onClick={() => navigate('/projects')}>
                {t('Lihat semua', 'View All')} <ArrowRight size={15} />
              </button>
            )}
          </div>
          <ProjectLibrary compact={!library} onLoadProject={open} onNew={() => input.current?.click()} />
        </section>

        {!library && user && (
          <section className="dashboard-announcements pl-card">
            <div className="section-heading">
              <div>
                <h2>
                  <Bell size={18} />
                  {t('Kabar dari Pixelift', 'News from Pixelift')}
                </h2>
                <p>
                  {t(
                    'Pengumuman yang sesuai dengan paket Anda.',
                    'Announcements matched to your subscription.'
                  )}
                </p>
              </div>
            </div>
            {noticeError ? (
              <p className="pl-muted">
                {t('Pengumuman belum dapat dimuat.', 'Announcements could not be loaded.')}{' '}
                <button
                  onClick={() =>
                    api
                      .getNotifications()
                      .then((n) => {
                        setAnnouncements(n);
                        setNoticeError(false);
                      })
                      .catch((e) => toast.error(e.message))
                  }
                >
                  {t('Coba lagi', 'Try Again')}
                </button>
              </p>
            ) : announcements.length ? (
              announcements.slice(0, 4).map((n) => (
                <article key={n.id}>
                  <span className="pl-badge">
                    {n.target === 'All' ? t('Semua pengguna', 'All Users') : n.target}
                  </span>
                  <div>
                    <h3>{n.title}</h3>
                    <p>{n.content}</p>
                    <small>
                      {new Date(n.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID')}
                    </small>
                  </div>
                </article>
              ))
            ) : (
              <p className="pl-muted">
                {t('Belum ada pengumuman baru. Selamat berkarya!', 'No new announcements. Keep creating!')}
              </p>
            )}
          </section>
        )}

        <footer className="studio-footer">
          <span>{t('Pixelift Lite · Ruang untuk kreativitas Anda', 'Pixelift Lite · A space for your creativity')}</span>
          <span>{t('Tanpa watermark. Tetap milik Anda.', 'No watermarks. Always yours.')}</span>
        </footer>
      </main>
    </div>
  );
}
