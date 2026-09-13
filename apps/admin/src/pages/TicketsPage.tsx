import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import {
  Search,
  MessageSquare,
  Headphones,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Plus,
  Edit2,
  Bot,
  HelpCircle,
  Tag,
  Sparkles,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Send,
  Loader2,
  Calendar,
} from 'lucide-react';
import { ChatViewModal } from '../components/ChatViewModal';
import { toast, confirmAction, Dialog } from '@pixellift/ui';

export const TicketsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'faqs' | 'chatbot' | 'coupons'>('tickets');

  // ================= TICKETS STATE =================
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [newTicketUserEmail, setNewTicketUserEmail] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('Fitur & Editor');
  const [newTicketPriority, setNewTicketPriority] = useState('Medium');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // ================= FAQS STATE =================
  const [faqs, setFaqs] = useState<any[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('Umum');
  const [faqOrder, setFaqOrder] = useState('0');
  const [faqIsActive, setFaqIsActive] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);

  // ================= CHATBOT KNOWLEDGE STATE =================
  const [chatbots, setChatbots] = useState<any[]>([]);
  const [chatbotSearch, setChatbotSearch] = useState('');
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState<any | null>(null);
  const [cbKeyword, setCbKeyword] = useState('');
  const [cbTitle, setCbTitle] = useState('');
  const [cbResponse, setCbResponse] = useState('');
  const [cbActionType, setCbActionType] = useState('info');
  const [cbActionPayload, setCbActionPayload] = useState('');
  const [cbIsActive, setCbIsActive] = useState(true);
  const [savingChatbot, setSavingChatbot] = useState(false);

  // ================= COUPONS STATE =================
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponSearch, setCouponSearch] = useState('');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [cpnCode, setCpnCode] = useState('');
  const [cpnPercent, setCpnPercent] = useState('20');
  const [cpnAmount, setCpnAmount] = useState('0');
  const [cpnMaxUses, setCpnMaxUses] = useState('100');
  const [cpnExpires, setCpnExpires] = useState('');
  const [cpnIsActive, setCpnIsActive] = useState(true);
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Load Tickets
  const loadTickets = async () => {
    try {
      const res = await adminApi.getTickets({
        search: ticketSearch,
        status: statusFilter,
        priority: priorityFilter,
      });
      setTickets(res.data || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    }
  };

  // Load FAQs
  const loadFaqs = async () => {
    try {
      const data = await adminApi.getFaqs(true);
      setFaqs(data || []);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    }
  };

  // Load Chatbot Knowledge
  const loadChatbots = async () => {
    try {
      const data = await adminApi.getChatbotKnowledge(true);
      setChatbots(data || []);
    } catch (err) {
      console.error('Failed to load chatbot knowledge:', err);
    }
  };

  // Load Coupons
  const loadCoupons = async () => {
    try {
      const data = await adminApi.getCoupons();
      setCoupons(data || []);
    } catch (err) {
      console.error('Failed to load coupons:', err);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [ticketSearch, statusFilter, priorityFilter]);

  useEffect(() => {
    loadFaqs();
    loadChatbots();
    loadCoupons();
  }, []);

  // Handlers for Tickets
  const handleDeleteTicket = async (id: string) => {
    if (await confirmAction(`Hapus tiket #${id}? Data percakapan akan dihapus permanen.`)) {
      try {
        await adminApi.deleteTicket(id);
        toast.success('Tiket berhasil dihapus.');
        loadTickets();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus tiket');
      }
    }
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim()) {
      toast.error('Subjek tiket wajib diisi');
      return;
    }
    setCreatingTicket(true);
    try {
      // Create support ticket as admin
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pixellift_admin_token')}`,
        },
        body: JSON.stringify({
          subject: newTicketSubject.trim(),
          category: newTicketCategory,
          priority: newTicketPriority,
          initialMessage: newTicketMessage.trim() || 'Tiket dibuat oleh staf Administrator.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat tiket bantuan');
      toast.success('Tiket bantuan baru berhasil dibuat.');
      setIsCreateTicketOpen(false);
      setNewTicketSubject('');
      setNewTicketMessage('');
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat tiket');
    } finally {
      setCreatingTicket(false);
    }
  };

  // Handlers for FAQs
  const handleOpenFaqModal = (faq?: any) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqQuestion(faq.question);
      setFaqAnswer(faq.answer);
      setFaqCategory(faq.category || 'Umum');
      setFaqOrder(String(faq.orderIndex ?? 0));
      setFaqIsActive(faq.isActive !== false);
    } else {
      setEditingFaq(null);
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqCategory('Umum');
      setFaqOrder(String(faqs.length + 1));
      setFaqIsActive(true);
    }
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.error('Pertanyaan dan jawaban wajib diisi');
      return;
    }
    setSavingFaq(true);
    try {
      const payload = {
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        category: faqCategory.trim(),
        orderIndex: Number(faqOrder) || 0,
        isActive: faqIsActive,
      };
      if (editingFaq) {
        await adminApi.updateFaq(editingFaq.id, payload);
        toast.success('FAQ berhasil diperbarui.');
      } else {
        await adminApi.createFaq(payload);
        toast.success('Pertanyaan FAQ baru berhasil ditambahkan.');
      }
      setIsFaqModalOpen(false);
      loadFaqs();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan FAQ');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string, q: string) => {
    if (await confirmAction(`Hapus pertanyaan FAQ "${q}"?`)) {
      try {
        await adminApi.deleteFaq(id);
        toast.success('FAQ berhasil dihapus.');
        loadFaqs();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus FAQ');
      }
    }
  };

  // Handlers for Chatbot Knowledge
  const handleOpenChatbotModal = (cb?: any) => {
    if (cb) {
      setEditingChatbot(cb);
      setCbKeyword(cb.keyword);
      setCbTitle(cb.title);
      setCbResponse(cb.response);
      setCbActionType(cb.actionType || 'info');
      setCbActionPayload(cb.actionPayload || '');
      setCbIsActive(cb.isActive !== false);
    } else {
      setEditingChatbot(null);
      setCbKeyword('');
      setCbTitle('');
      setCbResponse('');
      setCbActionType('info');
      setCbActionPayload('');
      setCbIsActive(true);
    }
    setIsChatbotModalOpen(true);
  };

  const handleSaveChatbot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cbKeyword.trim() || !cbTitle.trim() || !cbResponse.trim()) {
      toast.error('Keyword, judul prompt, dan respon AI wajib diisi');
      return;
    }
    setSavingChatbot(true);
    try {
      const payload = {
        keyword: cbKeyword.trim().toLowerCase(),
        title: cbTitle.trim(),
        response: cbResponse.trim(),
        actionType: cbActionType,
        actionPayload: cbActionPayload.trim(),
        isActive: cbIsActive,
      };
      if (editingChatbot) {
        await adminApi.updateChatbotKnowledge(editingChatbot.id, payload);
        toast.success('Pengetahuan Chatbot berhasil diperbarui.');
      } else {
        await adminApi.createChatbotKnowledge(payload);
        toast.success('Pengetahuan Chatbot baru berhasil ditambahkan.');
      }
      setIsChatbotModalOpen(false);
      loadChatbots();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan Chatbot Knowledge');
    } finally {
      setSavingChatbot(false);
    }
  };

  const handleDeleteChatbot = async (id: string, title: string) => {
    if (await confirmAction(`Hapus pemicu bot "${title}"?`)) {
      try {
        await adminApi.deleteChatbotKnowledge(id);
        toast.success('Pengetahuan bot berhasil dihapus.');
        loadChatbots();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus pengetahuan bot');
      }
    }
  };

  // Handlers for Coupons
  const handleOpenCouponModal = (c?: any) => {
    if (c) {
      setEditingCoupon(c);
      setCpnCode(c.code);
      setCpnPercent(String(c.discount_percent || 0));
      setCpnAmount(String(c.discount_amount || 0));
      setCpnMaxUses(String(c.max_uses || 100));
      setCpnExpires(c.expires_at ? c.expires_at.split('T')[0] : '');
      setCpnIsActive(Boolean(c.is_active));
    } else {
      setEditingCoupon(null);
      setCpnCode('');
      setCpnPercent('20');
      setCpnAmount('0');
      setCpnMaxUses('100');
      setCpnExpires('');
      setCpnIsActive(true);
    }
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpnCode.trim()) {
      toast.error('Kode kupon wajib diisi');
      return;
    }
    setSavingCoupon(true);
    try {
      const payload = {
        code: cpnCode.trim().toUpperCase(),
        discountPercent: Number(cpnPercent) || 0,
        discountAmount: Number(cpnAmount) || 0,
        maxUses: Number(cpnMaxUses) || 100,
        expiresAt: cpnExpires ? new Date(cpnExpires).toISOString() : null,
        isActive: cpnIsActive,
      };
      if (editingCoupon) {
        await adminApi.updateCoupon(editingCoupon.id, payload);
        toast.success('Kupon berhasil diperbarui.');
      } else {
        await adminApi.createCoupon(payload);
        toast.success('Kupon promo baru berhasil dibuat.');
      }
      setIsCouponModalOpen(false);
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan kupon');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (await confirmAction(`Hapus kupon promo "${code}"?`)) {
      try {
        await adminApi.deleteCoupon(id);
        toast.success('Kupon promo berhasil dihapus.');
        loadCoupons();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus kupon');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Eyebrow and Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="studio-eyebrow">HELP & CUSTOMER SUPPORT</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bantuan & FAQ</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Temukan jawaban cepat atas pertanyaan umum, ngobrol dengan Chatbot AI pintar, atau kirim tiket bukti ke tim kami.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'tickets' && (
            <button
              type="button"
              onClick={() => setIsCreateTicketOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Kirim Tiket Baru</span>
            </button>
          )}

          {activeTab === 'faqs' && (
            <button
              type="button"
              onClick={() => handleOpenFaqModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah FAQ Baru</span>
            </button>
          )}

          {activeTab === 'chatbot' && (
            <button
              type="button"
              onClick={() => handleOpenChatbotModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jawaban Bot</span>
            </button>
          )}

          {activeTab === 'coupons' && (
            <button
              type="button"
              onClick={() => handleOpenCouponModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Kupon Diskon</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tickets'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Semua Tiket ({tickets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faqs')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'faqs'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>FAQ Interaktif ({faqs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chatbot')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'chatbot'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Pengetahuan Chatbot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('coupons')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'coupons'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Kupon Diskon & Promo ({coupons.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: TICKETS ================= */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari ID tiket, subjek, nama..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
              >
                <option value="">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for User">Waiting for User</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
              >
                <option value="">Semua Prioritas</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Pengguna</th>
                    <th className="p-3">Subjek</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Prioritas</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Terakhir Diperbarui</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada tiket yang cocok.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          #{t.id}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          <div>{t.userName}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{t.userEmail}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                          {t.subject}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                            {t.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                : t.priority === 'High'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'Resolved' || t.status === 'Closed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : t.status === 'In Progress'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {new Date(t.updatedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveTicketId(t.id)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Buka Obrolan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(t.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
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

      {/* ================= TAB 2: FAQS ================= */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Cari pertanyaan FAQ..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-slate-500 text-[11px]">
              Menampilkan {faqs.length} pertanyaan interaktif
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 space-y-3">
              {faqs
                .filter((f) => f.question.toLowerCase().includes(faqSearch.toLowerCase()) || f.category.toLowerCase().includes(faqSearch.toLowerCase()))
                .map((faq) => (
                  <div key={faq.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          {faq.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Urutan: #{faq.orderIndex}</span>
                        {!faq.isActive && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{faq.question}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenFaqModal(faq)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit FAQ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(faq.id, faq.question)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Hapus FAQ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CHATBOT KNOWLEDGE ================= */}
      {activeTab === 'chatbot' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Cari kata kunci pemicu bot..."
                value={chatbotSearch}
                onChange={(e) => setChatbotSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-slate-500 text-[11px]">
              Chatbot AI siap menjawab pertanyaan pengguna di halaman Bantuan
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chatbots
              .filter((cb) => cb.title.toLowerCase().includes(chatbotSearch.toLowerCase()) || cb.keyword.toLowerCase().includes(chatbotSearch.toLowerCase()))
              .map((cb) => (
                <div
                  key={cb.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-indigo-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{cb.title}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {cb.actionType || 'info'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {cb.response}
                    </p>

                    <div className="text-[11px] text-slate-400">
                      Kata Kunci Pemicu: <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{cb.keyword}</code>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {cb.isActive ? 'Aktif di Chatbot' : 'Nonaktif'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenChatbotModal(cb)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Pemicu AI"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChatbot(cb.id, cb.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Hapus Pemicu AI"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: COUPONS ================= */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode kupon..."
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-slate-500 text-[11px]">
              Kupon dapat dimasukkan pelanggan saat simulasi / pembayaran membership
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#14132b] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-3">Kode Kupon</th>
                    <th className="p-3">Diskon</th>
                    <th className="p-3">Penggunaan / Kuota</th>
                    <th className="p-3">Kedaluwarsa</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {coupons
                    .filter((c) => c.code.toLowerCase().includes(couponSearch.toLowerCase()))
                    .map((cpn) => (
                      <tr key={cpn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          {cpn.code}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {cpn.discount_percent > 0 ? `${cpn.discount_percent}% OFF` : `$${cpn.discount_amount} OFF`}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cpn.used_count} / {cpn.max_uses}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {cpn.expires_at ? new Date(cpn.expires_at).toLocaleDateString('id-ID') : 'Tanpa batas'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cpn.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            }`}
                          >
                            {cpn.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCouponModal(cpn)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Kupon"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(cpn.id, cpn.code)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Hapus Kupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHAT VIEW FOR TICKET ================= */}
      {activeTicketId && (
        <ChatViewModal
          ticketId={activeTicketId}
          onClose={() => {
            setActiveTicketId(null);
            loadTickets();
          }}
        />
      )}

      {/* ================= MODAL: CREATE TICKET (ADMIN) ================= */}
      {isCreateTicketOpen && (
        <Dialog
          title="Kirim Tiket Baru / Buat Tiket Bantuan"
          description="Buat tiket kendala resmi dari sisi administrator untuk ditindaklanjuti."
          onClose={() => setIsCreateTicketOpen(false)}
        >
          <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Subjek Kendala / Topik</label>
              <input
                type="text"
                required
                placeholder="Contoh: Permintaan Bantuan Pemrosesan Batch"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kategori</label>
                <select
                  value={newTicketCategory}
                  onChange={(e) => setNewTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Fitur & Editor">Fitur & Editor</option>
                  <option value="Remove Background">Remove Background</option>
                  <option value="Billing & Membership">Billing & Membership</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Akun & Profil">Akun & Profil</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Prioritas</label>
                <select
                  value={newTicketPriority}
                  onChange={(e) => setNewTicketPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Pesan Awal Tiket</label>
              <textarea
                rows={4}
                required
                placeholder="Tuliskan deskripsi kendala secara detail..."
                value={newTicketMessage}
                onChange={(e) => setNewTicketMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateTicketOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={creatingTicket}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {creatingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Buat Tiket</span>
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ================= MODAL: FAQ CRUD ================= */}
      {isFaqModalOpen && (
        <Dialog
          title={editingFaq ? 'Ubah Pertanyaan FAQ' : 'Tambah Pertanyaan FAQ Baru'}
          description="Pertanyaan ini akan langsung muncul di halaman Bantuan & FAQ aplikasi web pengguna."
          onClose={() => setIsFaqModalOpen(false)}
        >
          <form onSubmit={handleSaveFaq} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Pertanyaan (Question)</label>
              <input
                type="text"
                required
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                placeholder="Contoh: Bagaimana cara menghapus background massal?"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kategori</label>
                <input
                  type="text"
                  required
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  placeholder="Contoh: Fitur Utama, Akun, Billing"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nomor Urutan Tampil</label>
                <input
                  type="number"
                  min="0"
                  value={faqOrder}
                  onChange={(e) => setFaqOrder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Jawaban (Answer)</label>
              <textarea
                rows={5}
                required
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                placeholder="Tuliskan jawaban yang lengkap, jelas, dan ramah..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="faqIsActive"
                checked={faqIsActive}
                onChange={(e) => setFaqIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="faqIsActive" className="text-xs font-semibold select-none cursor-pointer">
                Tampilkan di Halaman Bantuan Pengguna (Aktif)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFaqModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingFaq}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {savingFaq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan FAQ</span>
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ================= MODAL: CHATBOT CRUD ================= */}
      {isChatbotModalOpen && (
        <Dialog
          title={editingChatbot ? 'Ubah Pengetahuan Chatbot AI' : 'Tambah Pengetahuan Chatbot AI Baru'}
          description="Atur pemicu kata kunci dan respon otomatis asisten cerdas."
          onClose={() => setIsChatbotModalOpen(false)}
        >
          <form onSubmit={handleSaveChatbot} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Judul Chip Pintar (Prompt Title)</label>
              <input
                type="text"
                required
                value={cbTitle}
                onChange={(e) => setCbTitle(e.target.value)}
                placeholder="Contoh: Cara Pakai Batch Removal"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Kata Kunci Pemicu (Trigger Keyword)</label>
              <input
                type="text"
                required
                value={cbKeyword}
                onChange={(e) => setCbKeyword(e.target.value)}
                placeholder="Contoh: batch, massal, zip"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Respon Teks AI Bot</label>
              <textarea
                rows={4}
                required
                value={cbResponse}
                onChange={(e) => setCbResponse(e.target.value)}
                placeholder="Tuliskan respon penjelasan AI bot..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tipe Aksi Pintar</label>
                <select
                  value={cbActionType}
                  onChange={(e) => setCbActionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="info">Info Text Saja</option>
                  <option value="navigate">Navigasi ke Halaman</option>
                  <option value="action">Buka Aksi / Modal</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Payload / Target URL</label>
                <input
                  type="text"
                  value={cbActionPayload}
                  onChange={(e) => setCbActionPayload(e.target.value)}
                  placeholder="Contoh: /editor atau open_ticket_tab"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cbIsActive"
                checked={cbIsActive}
                onChange={(e) => setCbIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="cbIsActive" className="text-xs font-semibold select-none cursor-pointer">
                Aktifkan di Asisten Chatbot AI
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsChatbotModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingChatbot}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {savingChatbot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan Pengetahuan</span>
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ================= MODAL: COUPONS CRUD ================= */}
      {isCouponModalOpen && (
        <Dialog
          title={editingCoupon ? 'Ubah Kupon Diskon' : 'Buat Kupon Diskon Promo Baru'}
          description="Kupon dapat dimasukkan oleh pengguna saat proses checkout atau simulasi upgrade keanggotaan."
          onClose={() => setIsCouponModalOpen(false)}
        >
          <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Kode Kupon Promo</label>
              <input
                type="text"
                required
                value={cpnCode}
                onChange={(e) => setCpnCode(e.target.value.toUpperCase())}
                placeholder="Contoh: SELLERBARU, DISKON50"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Potongan Persen (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={cpnPercent}
                  onChange={(e) => setCpnPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Atau Potongan Nominal ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={cpnAmount}
                  onChange={(e) => setCpnAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Batas Kuota Penggunaan</label>
                <input
                  type="number"
                  min="1"
                  value={cpnMaxUses}
                  onChange={(e) => setCpnMaxUses(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal Kedaluwarsa (Opsional)</label>
                <input
                  type="date"
                  value={cpnExpires}
                  onChange={(e) => setCpnExpires(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cpnIsActive"
                checked={cpnIsActive}
                onChange={(e) => setCpnIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="cpnIsActive" className="text-xs font-semibold select-none cursor-pointer">
                Aktifkan Kupon Ini (Dapat Digunakan User)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingCoupon}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {savingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan Kupon</span>
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
