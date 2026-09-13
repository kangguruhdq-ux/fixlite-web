import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, CheckCircle2, AlertCircle, Info, X, Inbox } from 'lucide-react';
type Notice = { id: string; message: string; kind: 'success' | 'error' | 'info'; time: string; read: boolean };
const emit = (kind: Notice['kind'], message: string) => window.dispatchEvent(new CustomEvent('pl:toast', { detail: { kind, message } }));
export const toast = { success: (m: string) => emit('success', m), error: (m: string) => emit('error', m), info: (m: string) => emit('info', m) };
export type ConfirmOptions =
  | string
  | {
      title?: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      variant?: 'danger' | 'primary' | string;
    };

type Confirmation = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: string;
  resolve: (answer: boolean) => void;
};

export const confirmAction = (opts: ConfirmOptions) =>
  new Promise<boolean>((resolve) => {
    const detail: Confirmation =
      typeof opts === 'string'
        ? {
            title: 'Konfirmasi tindakan',
            message: opts,
            confirmText: 'Lanjutkan',
            cancelText: 'Batal',
            variant: 'danger',
            resolve,
          }
        : {
            title: opts.title || 'Konfirmasi tindakan',
            message: opts.message,
            confirmText: opts.confirmText || 'Lanjutkan',
            cancelText: opts.cancelText || 'Batal',
            variant: opts.variant || 'danger',
            resolve,
          };
    window.dispatchEvent(new CustomEvent('pl:confirm', { detail }));
  });
const dialogStack: string[] = [];
let previousOverflow = '';
export function Dialog({ title, description, children, onClose, wide = false }: { title: string; description?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const id = useId(), ref = useRef<HTMLDivElement>(null), closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!dialogStack.length) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialogStack.push(id);
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
    (focusables()[0] || ref.current)?.focus();
    const handle = (e: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== id) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const elements = focusables(), first = elements[0], last = elements[elements.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handle);
    return () => { dialogStack.splice(dialogStack.indexOf(id), 1); if (!dialogStack.length) document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handle); previous?.focus(); };
  }, [id]);
  return createPortal(<div className="pl-dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className={'pl-dialog ' + (wide ? 'pl-dialog-wide' : '')}>
      <div className="pl-dialog-heading"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div><button className="pl-icon-btn" onClick={onClose} aria-label="Tutup dialog"><X size={20} /></button></div>
      <div className="pl-dialog-body">{children}</div>
    </div>
  </div>, document.body);
}
const FeedbackContext = createContext<{ notices: Notice[]; markRead: () => void; clear: () => void }>({ notices: [], markRead() {}, clear() {} });
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]), [visible, setVisible] = useState<Notice[]>([]), [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const receive = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail;
      const notice = { message, kind, id: crypto.randomUUID(), time: new Date().toISOString(), read: false };
      setNotices(prev => [notice, ...prev].slice(0, 40)); setVisible(prev => [notice, ...prev].slice(0, 3));
      timers.current.push(setTimeout(() => setVisible(prev => prev.filter(n => n.id !== notice.id)), kind === 'error' ? 9000 : 5000));
    };
    const confirm = (e: Event) => setConfirmations(prev => [...prev, (e as CustomEvent).detail]);
    window.addEventListener('pl:toast', receive); window.addEventListener('pl:confirm', confirm);
    return () => { window.removeEventListener('pl:toast', receive); window.removeEventListener('pl:confirm', confirm); timers.current.forEach(clearTimeout); };
  }, []);
  const answer = (value: boolean) => { confirmations[0]?.resolve(value); setConfirmations(prev => prev.slice(1)); };
  return <FeedbackContext.Provider value={{ notices, markRead: () => setNotices(prev => prev.map(n => ({ ...n, read: true }))), clear: () => setNotices([]) }}>
    {children}
    {createPortal(<div className="pl-toasts" aria-label="Notifikasi aktivitas">{visible.map(n => <div key={n.id} className={'pl-toast pl-toast-' + n.kind} role={n.kind === 'error' ? 'alert' : 'status'}>
      {n.kind === 'success' ? <CheckCircle2 size={20} /> : n.kind === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
      <div><strong>{n.kind === 'success' ? 'Berhasil' : n.kind === 'error' ? 'Ada kendala' : 'Informasi'}</strong><p>{n.message}</p></div>
      <button aria-label="Tutup notifikasi" onClick={() => setVisible(prev => prev.filter(v => v.id !== n.id))}><X size={16} /></button>
    </div>)}</div>, document.body)}
    {confirmations[0] && (
      <Dialog title={confirmations[0].title} onClose={() => answer(false)}>
        <p className="pl-muted">{confirmations[0].message}</p>
        <div className="pl-dialog-actions">
          <button className="pl-btn" onClick={() => answer(false)}>
            {confirmations[0].cancelText}
          </button>
          <button
            className={`pl-btn ${confirmations[0].variant === 'danger' ? 'pl-btn-danger' : 'pl-btn-primary'}`}
            onClick={() => answer(true)}
          >
            {confirmations[0].confirmText}
          </button>
        </div>
      </Dialog>
    )}
  </FeedbackContext.Provider>;
}
export function NotificationCenter() {
  const { notices, markRead, clear } = useContext(FeedbackContext); const [open, setOpen] = useState(false);
  const unread = notices.filter(n => !n.read).length;
  return <><button className="pl-icon-btn pl-notification-trigger" title="Notifikasi" aria-label="Notifikasi aktivitas" onClick={() => { setOpen(true); markRead(); }}><Bell size={18} />{unread > 0 && <span className="pl-notification-dot" />}</button>
    {open && <Dialog title="Pusat notifikasi" description="Aktivitas Anda selama sesi ini." onClose={() => setOpen(false)}>
      {notices.length ? <><div className="pl-toolbar"><span className="pl-muted">{notices.length} aktivitas</span><button className="pl-btn" onClick={clear}><CheckCheck size={16} /> Bersihkan</button></div><div className="pl-notice-list">{notices.map(n => <article key={n.id}><span className={'pl-status-dot ' + n.kind} /><div><p>{n.message}</p><small>{new Date(n.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small></div></article>)}</div></> : <div className="pl-empty"><Inbox size={36} /><h3>Semua sudah beres</h3><p>Notifikasi login, penyimpanan, dan aktivitas lainnya akan muncul di sini.</p></div>}
    </Dialog>}</>;
}
