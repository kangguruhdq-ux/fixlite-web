import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useLanguage, confirmAction, toast, Dialog } from '@pixellift/ui';
import { api } from '../services/api';
import {
  HelpCircle,
  MessageSquare,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileQuestion,
  Headphones,
  Sparkles,
  Bot,
  Camera,
  Image as ImageIcon,
  Paperclip,
  X,
  RefreshCw,
  Crown,
  Maximize2,
  ArrowRight,
} from 'lucide-react';

const FAQS = [
  {
    category: 'Background Remover AI',
    q: 'Bagaimana cara AI menghapus background secara gratis tanpa watermark?',
    a: 'Pixelift Lite menggunakan model segmentasi AI yang mendeteksi kontur objek utama secara otomatis. Hasil gambar PNG transparan diekspor langsung dengan resolusi penuh 100% tanpa watermark apapun.',
  },
  {
    category: 'Background Remover AI',
    q: 'Apakah foto yang saya unggah aman dan tidak disimpan pihak ketiga?',
    a: 'Sangat aman! Seluruh pemrosesan dilakukan di server privat/lokal kami tanpa membagikan atau menjual data Anda ke pihak ketiga manapun. Proyek Anda juga dapat disimpan secara lokal di browser melalui IndexedDB.',
  },
  {
    category: 'Langganan & Pembayaran',
    q: 'Apa perbedaan paket Free, Pro, dan Unlimited?',
    a: 'Paket Free memberi Anda 10x remove background per hari dan editor dasar. Paket Pro menyediakan ratusan proses per hari, batch upload, dan filter preset ultra. Unlimited memberi kuota tanpa batas dan prioritas server tertinggi.',
  },
  {
    category: 'Langganan & Pembayaran',
    q: 'Apakah upgrade membership memerlukan kartu kredit nyata?',
    a: 'Tidak! Pixelift Lite menyediakan sistem simulasi pembayaran instan (Simulated Checkout) sehingga Anda dapat menguji seluruh fasilitas premium secara gratis.',
  },
  {
    category: 'Editor & Ekspor',
    q: 'Format apa saja yang didukung untuk ekspor gambar?',
    a: 'Anda dapat mengekspor hasil editan ke format PNG (dengan transparansi), JPG (dengan warna latar studio solid atau gradien), dan WEBP dengan kontrol slider kualitas kompresi.',
  },
  {
    category: 'Akun & Keamanan',
    q: 'Bagaimana cara mengganti foto profil atau menghapus akun?',
    a: 'Kunjungi menu Pengaturan (Settings) untuk mengganti avatar profil dengan foto kustom atau avatar preset. Di bagian bawah tab Pengaturan, Anda juga dapat menghapus akun secara permanen.',
  },
];

interface BotMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  action?: {
    label: string;
    actionType: 'create_ticket' | 'editor' | 'pricing';
  };
  time: string;
}

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'faq' | 'bot' | 'tickets' | 'create'>('faq');

  // FAQ state
  const [faqList, setFaqList] = useState<{ id?: string; category: string; q: string; a: string }[]>([]);
  const [chatbotKnowledge, setChatbotKnowledge] = useState<any[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Load dynamic FAQs and Chatbot Knowledge
  useEffect(() => {
    let active = true;
    const loadFaq=()=>api.getFaqs().then((data) => {
      if (active && Array.isArray(data)) {
        setFaqList(data.filter((f) => f.isActive !== false).map((f) => ({
          id: f.id,
          category: f.category,
          q: f.question,
          a: f.answer,
        })));
      }
    }).catch(() => toast.error('Pusat bantuan belum dapat dimuat. Coba muat ulang halaman.'));

    const loadBot=()=>api.getChatbotKnowledge().then((data) => {
      if (active && Array.isArray(data)) {
        setChatbotKnowledge(data.filter((k) => k.isActive !== false));
      }
    }).catch(() => toast.error('Pusat bantuan belum dapat dimuat. Coba muat ulang halaman.'));

    const reload=()=>{loadFaq();loadBot();};reload();window.addEventListener('focus',reload);
    return () => {active=false;window.removeEventListener('focus',reload);};
  }, []);

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New ticket state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Kendala Teknis');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newMessage, setNewMessage] = useState('');
  const [newAttachment, setNewAttachment] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Enlarge image modal
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // File input refs
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Smart Chatbot State
  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Halo! Saya adalah Asisten Bantuan Pixelift Lite. Ada yang bisa saya bantu hari ini seputar hapus background, editing foto, membership, atau kendala teknis?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [botInput, setBotInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const botScrollRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    if (!user) return;
    try {
      setLoadingTickets(true);
      const res = await api.getTickets();
      setTickets(res.data || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (botScrollRef.current) {
      botScrollRef.current.scrollTop = botScrollRef.current.scrollHeight;
    }
  }, [botMessages, isBotTyping]);

  const loadTicketDetail = async (id: string) => {
    try {
      const res = await api.getTicketDetails(id);
      setActiveTicket(res.ticket);
      setTicketMessages(res.messages || []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat detail tiket');
    }
  };

  const handleImageCompression = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File yang dipilih harus berformat gambar (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
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
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          callback(compressed);
          toast.success('Gambar bukti berhasil dilampirkan.');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Subjek dan pesan tiket wajib diisi.');
      return;
    }
    setIsCreating(true);
    try {
      await api.createTicket(newSubject.trim(), newCategory, newPriority, newMessage.trim(), newAttachment || undefined);
      toast.success('Tiket bantuan berhasil dikirim. Tim kami akan segera merespons.');
      setNewSubject('');
      setNewMessage('');
      setNewAttachment(null);
      setActiveTab('tickets');
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim tiket bantuan');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !replyAttachment) return;
    if (!activeTicket) return;
    setIsSendingReply(true);
    try {
      await api.replyTicket(activeTicket.id, replyText.trim() || 'Melampirkan gambar bukti tangkapan layar.', replyAttachment || undefined);
      setReplyText('');
      setReplyAttachment(null);
      await loadTicketDetail(activeTicket.id);
      toast.success('Balasan pesan terkirim.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim balasan');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    const confirmed = await confirmAction({
      title: 'Tutup Tiket Bantuan',
      message: 'Apakah masalah Anda telah terselesaikan dan tiket ini dapat ditutup?',
      confirmText: 'Tutup Tiket',
      cancelText: 'Batal',
      variant: 'primary',
    });
    if (!confirmed) return;

    try {
      await api.closeTicket(activeTicket.id);
      toast.success('Tiket berhasil ditutup.');
      setActiveTicket((prev: any) => ({ ...prev, status: 'Closed' }));
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menutup tiket');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Tiket Bantuan',
      message: `Hapus tiket #${id}? Seluruh percakapan di dalamnya akan dihapus permanen.`,
      confirmText: 'Hapus Tiket',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.deleteTicket(id);
      toast.success('Tiket berhasil dihapus.');
      setTickets((prev) => prev.filter((t) => t.id !== id));
      if (activeTicket?.id === id) setActiveTicket(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus tiket');
    }
  };

  // Bot response generator
  const handleBotSubmit = (queryText?: string) => {
    const text = queryText || botInput;
    if (!text.trim()) return;

    const userMsg: BotMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setBotMessages((prev) => [...prev, userMsg]);
    setBotInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      const q = text.toLowerCase();
      let reply = 'Pertanyaan Anda sangat bagus. Jika Anda membutuhkan investigasi mendalam dari teknisi kami, silakan buat tiket dukungan.';
      let action: BotMessage['action'] = undefined;

      // Check dynamic chatbot knowledge from Admin CRUD first
      const matchedKnowledge=chatbotKnowledge.map(k=>{
       const triggers=(k.keyword+' '+k.title).toLowerCase().split(/[, ]+/).filter((w:string)=>w.length>2&&!['cara','dan','yang','untuk'].includes(w));
       return {k,score:triggers.filter((w:string)=>q.includes(w)).length};
      }).sort((a,b)=>b.score-a.score).find(x=>x.score>0)?.k;

      if(matchedKnowledge) {
       reply=matchedKnowledge.response;
       const target=matchedKnowledge.actionPayload;
       const actionType=target==='/editor'?'editor':target==='/subscription'?'pricing':target==='open_ticket_tab'?'create_ticket':target==='open_batch_modal'?'batch':null;
       if(actionType)action={label:matchedKnowledge.title,actionType:actionType as any};
      } else {
       const tokens=q.split(/\s+/).filter(w=>w.length>3);
       const ranked=faqList.map(f=>({f,score:tokens.filter(w=>(f.q+' '+f.a).toLowerCase().includes(w)).length})).sort((a,b)=>b.score-a.score);
       if(ranked[0]?.score>1)reply=ranked[0].f.a;
       else {reply='Jawaban belum tersedia di pusat bantuan. Silakan buat tiket agar tim kami dapat membantu.';action={label:'Buat tiket bantuan',actionType:'create_ticket'};}
      }

      const botReply: BotMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: reply,
        action,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setBotMessages((prev) => [...prev, botReply]);
      setIsBotTyping(false);
    }, 500);
  };

  const handleBotAction = (actionType: string) => {
    if (actionType === 'batch') { window.location.href='/editor'; } else if (actionType === 'create_ticket') {
      setActiveTab('create');
    } else if (actionType === 'editor') {
      window.location.href = '/editor';
    } else if (actionType === 'pricing') {
      window.location.href = '/subscription';
    }
  };

  const categories = ['Semua', ...Array.from(new Set(faqList.map((f) => f.category)))];

  const filteredFaqs = faqList.filter((faq) => {
    const matchesCategory = selectedCategory === 'Semua' || faq.category === selectedCategory;
    const matchesSearch =
      !faqSearch ||
      faq.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.a.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="studio-shell flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8 animate-fadeIn">
        {/* Page Heading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="studio-eyebrow">HELP & CUSTOMER SUPPORT</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('helpAndFaq', 'Pusat Bantuan, FAQ & Tiket')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Temukan jawaban cepat atas pertanyaan umum, ngobrol dengan asisten bantuan, atau kirim tiket bukti ke tim kami.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createTicket', 'Buat Tiket Bantuan')}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 w-fit text-xs font-bold shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'faq'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>FAQ Interaktif</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'bot'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-300" />
            <span>Asisten Bantuan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'tickets'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t('myTickets', 'Riwayat Tiket Saya')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'create'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Kirim Tiket Baru</span>
          </button>
        </div>

        {/* Tab 1: FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari solusi atau pertanyaan..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14132b] overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 md:p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 dark:text-white text-xs sm:text-sm hover:text-brand-600 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 animate-fadeIn">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Smart Chatbot (AI Assistant) */}
        {activeTab === 'bot' && (
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 animate-fadeIn flex flex-col h-[650px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Pixelift AI Smart Assistant</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      Online 24/7
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dukungan pintar otomatis untuk menjawab pertanyaan teknis & panduan penggunaan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setBotMessages([
                    {
                      id: 'welcome_reset',
                      sender: 'bot',
                      text: 'Percakapan telah direset. Ada yang bisa saya bantu selanjutnya?',
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                title="Mulai Ulang Percakapan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Chat</span>
              </button>
            </div>

            {/* Quick suggested chips */}
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-semibold text-slate-400">Pertanyaan Populer:</span>
              {[
                'Bagaimana cara hapus background foto?',
                'Apakah ada watermark pada hasil download?',
                'Apa perbedaan paket Free vs Pro vs Unlimited?',
                'Bagaimana cara ganti foto profil?',
                'Saya ingin buat tiket bantuan kendala',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleBotSubmit(chip)}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-700/60"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat conversation area */}
            <div
              ref={botScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs"
            >
              {botMessages.map((msg) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={msg.id} className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isBot ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'
                      }`}
                    >
                      {isBot ? <Bot className="w-4 h-4" /> : user?.name.slice(0, 1).toUpperCase() || 'U'}
                    </div>

                    <div className={`space-y-1.5 max-w-[80%] ${isBot ? '' : 'text-right'}`}>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-bold">{isBot ? 'Pixelift AI' : user?.name || 'Anda'}</span>
                        <span>&bull;</span>
                        <span>{msg.time}</span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl leading-relaxed text-xs ${
                          isBot
                            ? 'bg-white dark:bg-[#1a1936] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/70 shadow-sm rounded-tl-none'
                            : 'bg-indigo-600 text-white rounded-tr-none shadow-sm text-left'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.action && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                            <button
                              type="button"
                              onClick={() => handleBotAction(msg.action!.actionType)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow transition-all"
                            >
                              <span>{msg.action.label}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isBotTyping && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1a1936] border border-slate-200 dark:border-slate-700 text-slate-400 text-xs flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                    <span>Pixelift AI sedang menyusun jawaban...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Topic Chips from Chatbot Knowledge */}
            {chatbotKnowledge.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Topik Cepat:</span>
                {chatbotKnowledge.slice(0, 5).map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => handleBotSubmit(k.title)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                  >
                    {k.title}
                  </button>
                ))}
              </div>
            )}

            {/* Chat input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBotSubmit();
              }}
              className="flex items-center gap-2 flex-shrink-0 pt-2"
            >
              <input
                type="text"
                placeholder="Tanyakan apapun ke asisten Pixelift..."
                value={botInput}
                onChange={(e) => setBotInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!botInput.trim() || isBotTyping}
                className="px-5 py-3 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Tickets List */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-brand-600" />
                  <span>Daftar Tiket Dukungan Akun Anda</span>
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {tickets.length} Tiket
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
                    <tr>
                      <th className="p-3">ID Tiket</th>
                      <th className="p-3">Subjek</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Prioritas</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Pembaruan</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {loadingTickets ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Memuat daftar tiket Anda...
                        </td>
                      </tr>
                    ) : !tickets.length ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Belum ada riwayat tiket. Jika mengalami kendala, klik "Kirim Tiket Baru".
                        </td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/20">
                          <td className="p-3 font-mono font-bold text-brand-600 dark:text-brand-400">#{t.id}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                            {t.subject}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{t.category}</td>
                          <td className="p-3">
                            <span
                              className={`font-bold ${
                                t.priority === 'Urgent'
                                  ? 'text-rose-500'
                                  : t.priority === 'High'
                                  ? 'text-amber-500'
                                  : 'text-slate-500'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'Resolved' || t.status === 'Closed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                  : t.status === 'In Progress'
                                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border border-indigo-200 dark:border-indigo-800'
                                  : 'bg-amber-50 dark:bg-amber-950 text-amber-500 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {new Date(t.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => loadTicketDetail(t.id)}
                                className="px-3 py-1 text-[11px] font-bold rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900"
                              >
                                Buka Obrolan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTicket(t.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Hapus Tiket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Create Ticket Form */}
        {activeTab === 'create' && (
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-600" />
                <span>Kirim Tiket Bantuan ke Tim Studio</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Jelaskan kendala Anda sedetail mungkin dan lampirkan screenshot bukti agar tim kami dapat membantu secara cepat.
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('ticketSubject', 'Subjek Kendala')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Gagal memproses gambar format WEBP atau kuota belum bertambah"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('ticketCategory', 'Kategori')}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Kendala Teknis">Kendala Teknis (AI / Editor)</option>
                    <option value="Langganan & Faktur">Langganan & Faktur</option>
                    <option value="Akun & Profil">Akun & Profil</option>
                    <option value="Saran & Masukan">Saran & Masukan Fitur</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('ticketPriority', 'Prioritas')}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Low">Low (Biasa)</option>
                    <option value="Medium">Medium (Standar)</option>
                    <option value="High">High (Penting)</option>
                    <option value="Urgent">Urgent (Mendesak)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('ticketMessage', 'Penjelasan Masalah & Detail Kendala')}
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tuliskan kronologi masalah, jenis gambar, atau pesan error yang muncul..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Image attachment for proof */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lampiran Bukti Gambar / Screenshot (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={createFileInputRef}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageCompression(file, setNewAttachment);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <Camera className="w-4 h-4 text-brand-600" />
                    <span>Pilih Foto / Tangkapan Layar</span>
                  </button>

                  {newAttachment && (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 w-12 h-12 flex-shrink-0">
                      <img src={newAttachment} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewAttachment(null)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus Lampiran"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isCreating ? 'Mengirim...' : 'Kirim Tiket Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Ticket Chat View Modal */}
      {activeTicket && (
        <Dialog
          title={`Tiket #${activeTicket.id} — ${activeTicket.subject}`}
          description={`Status: ${activeTicket.status} • Kategori: ${activeTicket.category} • Prioritas: ${activeTicket.priority}`}
          onClose={() => setActiveTicket(null)}
          wide
        >
          <div className="flex flex-col h-[520px] text-xs">
            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              {ticketMessages.map((msg) => {
                const isMe = msg.senderId === user?.id || msg.senderRole === 'User';
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span className="font-bold">{msg.senderName}</span>
                      <span>({msg.senderRole})</span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl max-w-[80%] leading-relaxed ${
                        isMe
                          ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>

                      {msg.attachmentUrl && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-white/20 dark:border-slate-700 relative group cursor-pointer">
                          <img
                            src={msg.attachmentUrl}
                            alt="Bukti Lampiran"
                            className="max-h-44 object-cover w-full hover:scale-105 transition-transform"
                            onClick={() => setViewingImage(msg.attachmentUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => setViewingImage(msg.attachmentUrl)}
                            className="absolute bottom-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Perbesar Gambar"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions & Reply Form */}
            <div className="pt-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleCloseTicket}
                  disabled={activeTicket.status === 'Closed'}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {t('closeTicket', 'Tutup Tiket Ini')}
                </button>
                <span className="text-[11px] text-slate-400">Tim customer support kami aktif merespons</span>
              </div>

              {activeTicket.status !== 'Closed' && (
                <div className="space-y-2">
                  {replyAttachment && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit">
                      <img src={replyAttachment} alt="Lampiran" className="w-8 h-8 rounded object-cover" />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Gambar Bukti Siap Dikirim</span>
                      <button
                        type="button"
                        onClick={() => setReplyAttachment(null)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="file"
                      ref={replyFileInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageCompression(file, setReplyAttachment);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      title="Lampirkan Gambar Bukti"
                    >
                      <Camera className="w-4 h-4 text-indigo-500" />
                    </button>

                    <input
                      type="text"
                      placeholder="Ketik balasan untuk admin / CS..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || (!replyText.trim() && !replyAttachment)}
                      className="px-4 py-2 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Enlarge Screenshot Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn cursor-pointer"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={viewingImage} alt="Bukti Tangkapan Layar Penuh" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
