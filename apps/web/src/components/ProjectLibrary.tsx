import React, { useEffect, useState } from 'react';
import {
  Search,
  Grid2X2,
  List,
  Star,
  Copy,
  Pencil,
  Trash2,
  ArrowUpRight,
  FolderOpen,
  Download,
  Plus,
} from 'lucide-react';
import { Dialog, toast, confirmAction, useLanguage } from '@pixellift/ui';
import { localProjectStorage, LocalProject } from '../services/indexedDb';
import { useAuth } from '../context/AuthContext';

export function ProjectLibrary({
  onLoadProject,
  compact = false,
  onNew,
}: {
  onLoadProject: (p: LocalProject) => void;
  compact?: boolean;
  onNew?: () => void;
}) {
  const { user } = useAuth();
  const owner = user?.id || 'local_user';
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<LocalProject | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await localProjectStorage.getAllProjects(owner);
        if (active) {
          setProjects(data);
          setError('');
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    setSelected([]);
    setProjects([]);
    load();
    window.addEventListener('pl:projects-changed', load);
    return () => {
      active = false;
      window.removeEventListener('pl:projects-changed', load);
    };
  }, [owner]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = projects
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (status === 'all' || (status === 'favorite' ? p.favorite : p.status === status))
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'oldest'
        ? a.createdAt.localeCompare(b.createdAt)
        : b.updatedAt.localeCompare(a.updatedAt)
    );

  const shown = compact ? filtered.slice(0, 4) : filtered;

  const remove = async (ids: string[]) => {
    const confirmMsg =
      language === 'en'
        ? `Delete ${ids.length} projects from this browser? This action cannot be undone.`
        : `Hapus ${ids.length} proyek dari browser ini? Tindakan ini tidak dapat dibatalkan.`;
    if (await confirmAction(confirmMsg)) {
      await run(async () => {
        await localProjectStorage.deleteProjects(ids, owner);
        setSelected([]);
      }, t('Proyek berhasil dihapus.', 'Project deleted successfully.'));
    }
  };

  const download = (p: LocalProject) => {
    const a = document.createElement('a');
    a.href = p.thumbnailUrl;
    a.download = p.name.replace(/\.[^.]+$/, '') + '.png';
    a.click();
    toast.info(t('Unduhan gambar dimulai.', 'Image download started.'));
  };

  return (
    <div className="project-library">
      {!compact && (
        <div className="library-toolbar">
          <div className="library-search">
            <Search size={17} />
            <input
              className="pl-input"
              aria-label={t('Cari proyek', 'Search projects')}
              placeholder={t('Cari proyek Anda...', 'Search your projects...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected([]);
              }}
            />
          </div>
          <select
            className="pl-input"
            aria-label={t('Filter proyek', 'Filter projects')}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setSelected([]);
            }}
          >
            <option value="all">{t('Semua proyek', 'All projects')}</option>
            <option value="favorite">{t('Favorit', 'Favorites')}</option>
            <option value="Draft">Draft</option>
            <option value="Completed">{t('Selesai', 'Completed')}</option>
          </select>
          <select
            className="pl-input"
            aria-label={t('Urutan proyek', 'Sort projects')}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">{t('Terakhir diedit', 'Recently edited')}</option>
            <option value="oldest">{t('Paling awal', 'Oldest first')}</option>
            <option value="name">{t('Nama A–Z', 'Name A–Z')}</option>
          </select>
          <div className="library-view">
            <button
              className="pl-icon-btn"
              aria-label={t('Tampilan grid', 'Grid view')}
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <Grid2X2 size={17} />
            </button>
            <button
              className="pl-icon-btn"
              aria-label={t('Tampilan daftar', 'List view')}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="library-selection">
          <span>
            {selected.length} {t('dipilih', 'selected')}
          </span>
          <button className="pl-btn" onClick={() => setSelected([])}>
            {t('Batal pilih', 'Deselect')}
          </button>
          <button
            disabled={busy}
            className="pl-btn pl-btn-danger"
            onClick={() => remove(selected)}
          >
            <Trash2 size={15} />
            {t('Hapus terpilih', 'Delete selected')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="project-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pl-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="pl-empty">
          <h3>{t('Proyek belum dapat dimuat', 'Projects could not be loaded')}</h3>
          <p>{error}</p>
          <button
            className="pl-btn"
            onClick={() => window.dispatchEvent(new Event('pl:projects-changed'))}
          >
            {t('Coba lagi', 'Try Again')}
          </button>
        </div>
      ) : !shown.length ? (
        <div className="pl-empty pl-card">
          <FolderOpen size={36} />
          <h3>
            {projects.length
              ? t('Tidak ada proyek yang cocok', 'No matching projects found')
              : t('Karya pertama Anda dimulai di sini', 'Your first creation starts here')}
          </h3>
          <p>
            {projects.length
              ? t('Coba kata kunci atau filter lain.', 'Try another keyword or filter.')
              : t(
                  'Unggah foto, buat perubahan, lalu simpan. Proyek Anda akan tampil di sini.',
                  'Upload a photo, make adjustments, and save. Your projects will appear here.'
                )}
          </p>
          {onNew && (
            <button className="pl-btn pl-btn-primary" onClick={onNew}>
              <Plus size={16} />
              {t('Buat proyek', 'Create project')}
            </button>
          )}
        </div>
      ) : (
        <div className={'project-grid ' + (view === 'list' && !compact ? 'project-list' : '')}>
          {shown.map((p) => (
            <article key={p.id} className="project-card pl-card">
              <div className="project-image checkerboard-pattern">
                <button
                  className="project-open-image"
                  onClick={() => onLoadProject(p)}
                  aria-label={`${t('Buka', 'Open')} ${p.name}`}
                >
                  <img src={p.thumbnailUrl || p.originalImageData} alt={p.name} loading="lazy" />
                </button>
                {!compact && (
                  <input
                    type="checkbox"
                    aria-label={`${t('Pilih', 'Select')} ${p.name}`}
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                )}
                <button
                  disabled={busy}
                  className={'project-favorite ' + (p.favorite ? 'is-favorite' : '')}
                  aria-label={
                    p.favorite
                      ? `${t('Hapus favorit', 'Remove favorite')} ${p.name}`
                      : `${t('Favoritkan', 'Favorite')} ${p.name}`
                  }
                  aria-pressed={Boolean(p.favorite)}
                  onClick={() =>
                    run(
                      () => localProjectStorage.updateProject(p.id, { favorite: !p.favorite }, owner),
                      p.favorite
                        ? t('Proyek dihapus dari favorit.', 'Project removed from favorites.')
                        : t('Proyek ditambahkan ke favorit.', 'Project added to favorites.')
                    )
                  }
                >
                  <Star size={16} fill={p.favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="project-info">
                <div className="pl-toolbar">
                  <span className="pl-badge">
                    {p.status === 'Completed' ? t('Selesai', 'Completed') : 'Draft'}
                  </span>
                  <small>{p.format.toUpperCase()}</small>
                </div>
                <button
                  className="project-name"
                  onClick={() => onLoadProject(p)}
                  title={p.name}
                >
                  {p.name}
                </button>
                <p>
                  {new Date(p.updatedAt).toLocaleDateString(
                    language === 'en' ? 'en-US' : 'id-ID',
                    { day: 'numeric', month: 'short' }
                  )}{' '}
                  &middot; {p.width} &times; {p.height} px
                </p>
                <div className="project-actions">
                  <button className="project-open" onClick={() => onLoadProject(p)}>
                    {t('Lanjut edit', 'Continue editing')} <ArrowUpRight size={15} />
                  </button>
                  <div>
                    <button
                      title={t('Ganti nama', 'Rename')}
                      aria-label={`${t('Ganti nama', 'Rename')} ${p.name}`}
                      onClick={() => {
                        setEditing(p);
                        setName(p.name);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      disabled={busy}
                      title={t('Duplikasi', 'Duplicate')}
                      aria-label={`${t('Duplikasi', 'Duplicate')} ${p.name}`}
                      onClick={() =>
                        run(
                          () => localProjectStorage.duplicateProject(p.id, owner),
                          t('Salinan proyek berhasil dibuat.', 'Project duplicate created.')
                        )
                      }
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      title={t('Unduh gambar', 'Download image')}
                      aria-label={`${t('Unduh', 'Download')} ${p.name}`}
                      onClick={() => download(p)}
                    >
                      <Download size={15} />
                    </button>
                    <button
                      disabled={busy}
                      title={t('Hapus proyek', 'Delete project')}
                      aria-label={`${t('Hapus', 'Delete')} ${p.name}`}
                      onClick={() => remove([p.id])}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <Dialog
          title={t('Ganti nama proyek', 'Rename project')}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            className="pl-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              run(async () => {
                await localProjectStorage.updateProject(
                  editing.id,
                  { name: name.trim() },
                  owner
                );
                setEditing(null);
              }, t('Nama proyek diperbarui.', 'Project name updated.'));
            }}
          >
            <label className="pl-field">
              {t('Nama proyek', 'Project name')}
              <input
                className="pl-input"
                autoFocus
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button disabled={busy} className="pl-btn pl-btn-primary">
              {busy ? t('Menyimpan...', 'Saving...') : t('Simpan nama', 'Save name')}
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
