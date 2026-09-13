import { toast } from '@pixellift/ui';
import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '../services/api';
import { X, Send, User, ShieldCheck, Camera, Maximize2 } from 'lucide-react';

interface ChatViewModalProps {
  ticketId: string | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const ChatViewModal: React.FC<ChatViewModalProps> = ({
  ticketId,
  onClose,
  onStatusUpdated,
}) => {
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<string | null>(null);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTicket = async () => {
    if (!ticketId) return;
    try {
      const data = await adminApi.getTicketDetails(ticketId);
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  if (!ticketId) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih file gambar valid (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setReplyAttachment(compressed);
          toast.success('Bukti gambar berhasil dilampirkan.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !replyAttachment) return;
    setSending(true);
    try {
      const newMsg = await adminApi.replyTicket(
        ticketId,
        replyText.trim() || 'Melampirkan bukti gambar penjelasan.',
        isInternalNote,
        replyAttachment || undefined
      );
      setMessages((prev) => [...prev, newMsg]);
      toast.success(isInternalNote ? 'Catatan internal disimpan.' : 'Balasan berhasil dikirim.');
      setReplyText('');
      setReplyAttachment(null);
      setIsInternalNote(false);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim balasan');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await adminApi.updateTicket(ticketId, { status: newStatus });
      toast.success('Status tiket berhasil diperbarui.');
      setTicket((prev: any) => ({ ...prev, status: newStatus }));
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#181832] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                #{ticket?.id || ticketId}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[240px]">
                {ticket?.subject || 'Tiket Dukungan'}
              </h3>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{ticket?.userName}</span>
              <span>&bull;</span>
              <span>{ticket?.category}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ticket && (
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-[11px] font-semibold py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for User">Waiting for User</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#131224]/50 text-xs">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Memuat pesan...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">Belum ada percakapan.</div>
          ) : (
            messages.map((m) => {
              const isAdmin = m.senderRole !== 'User';

              return (
                <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mb-1 px-1">
                    {isAdmin ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">{m.senderName}</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{m.senderName}</span>
                      </>
                    )}
                    <span>&bull;</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.isInternalNote
                        ? 'bg-amber-50/60 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-200'
                        : isAdmin
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                        : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-300/60 dark:border-slate-700/60'
                    }`}
                  >
                    {m.isInternalNote && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                        [Internal Admin Note]
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.message}</p>

                    {m.attachmentUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-white/20 dark:border-slate-700 relative group cursor-pointer">
                        <img
                          src={m.attachmentUrl}
                          alt="Bukti Lampiran"
                          className="max-h-40 w-full object-cover hover:scale-105 transition-transform"
                          onClick={() => setEnlargedImage(m.attachmentUrl)}
                        />
                        <button
                          type="button"
                          onClick={() => setEnlargedImage(m.attachmentUrl)}
                          className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Perbesar"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply Input Bar */}
        <form onSubmit={handleSendReply} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14132b] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <span className={isInternalNote ? 'text-amber-400 font-bold' : ''}>Internal Note (hanya terlihat staf)</span>
            </label>
          </div>

          {replyAttachment && (
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit text-[11px]">
              <img src={replyAttachment} alt="Lampiran" className="w-7 h-7 rounded object-cover" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Gambar Bukti Siap</span>
              <button
                type="button"
                onClick={() => setReplyAttachment(null)}
                className="p-1 text-slate-400 hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Lampirkan Gambar Bukti"
            >
              <Camera className="w-4 h-4 text-indigo-500" />
            </button>

            <input
              type="text"
              placeholder={isInternalNote ? 'Tulis catatan internal...' : 'Tulis balasan untuk pengguna...'}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || (!replyText.trim() && !replyAttachment)}
              className="flex items-center justify-center p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Enlarge screenshot modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn cursor-pointer"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setEnlargedImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={enlargedImage} alt="Bukti Tangkapan Layar Penuh" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
