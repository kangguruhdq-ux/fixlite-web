import { User, AuthSession, PresetFilter, BackgroundPreset, AspectRatioOption } from '@pixellift/types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('pixellift_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async getNotifications() {
    const res = await fetch(API_BASE + '/auth/notifications', { headers: getAuthHeader() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat pengumuman');
    return data;
  },
  async updateProfile(data: { name?: string; email?: string; avatarUrl?: string; currentPassword?: string; newPassword?: string }) {
    const res = await fetch(API_BASE + '/auth/me', { method:'PATCH', headers:{ 'Content-Type':'application/json', ...getAuthHeader() }, body:JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Profil gagal diperbarui');
    return result;
  },
  async deleteAccount(password?: string) {
    const res = await fetch(API_BASE + '/auth/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ password }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal menghapus akun');
    return result;
  },
  // Authentication
  async login(email: string, password: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login gagal');
    return data;
  },

  async register(name: string, email: string, password: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal');
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat profil');
    return data;
  },

  // AI Background Removal
  async removeBackground(
    file: File | Blob,
    fileName?: string,
    options?: { model?: string; confidenceThreshold?: number; refinementLevel?: string }
  ): Promise<{
    processId: string;
    resultImageUrl: string;
    executionTimeMs: number;
    confidence: number | null;
    modelUsed: string;
    isMock: boolean;
    notice?: string;
  }> {
    const formData = new FormData();
    formData.append('image', file, fileName || 'image.png');
    if (options?.model) formData.append('model', options.model);
    if (options?.confidenceThreshold !== undefined) formData.append('confidenceThreshold', String(options.confidenceThreshold));
    if (options?.refinementLevel) formData.append('refinementLevel', options.refinementLevel);

    const res = await fetch(`${API_BASE}/background/remove`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus background');
    return data;
  },

  // Presets and filters
  async getPresets(): Promise<{
    presets: BackgroundPreset[];
    filters: PresetFilter[];
    aspectRatios: AspectRatioOption[];
  }> {
    const res = await fetch(`${API_BASE}/presets`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat preset');
    return data;
  },

  // Simulated Membership
  async getPlans() {
    const res = await fetch(`${API_BASE}/memberships/plans`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Permintaan gagal. Silakan coba lagi.');
    return data;
  },

  async getTransactions(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/memberships/transactions?${query}`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat riwayat transaksi');
    return data;
  },

  async simulateCheckout(tier: string, amount: number, paymentMethod: string, couponCode?: string) {
    const authHeaders = getAuthHeader();
    if (!authHeaders.Authorization) {
      throw new Error('Silakan login terlebih dahulu untuk melakukan simulasi upgrade keanggotaan.');
    }
    const res = await fetch(`${API_BASE}/memberships/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ tier, amount, paymentMethod, couponCode, simulateStatus: 'Paid' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Simulasi checkout gagal');
    return data;
  },

  // Support & Reports
  async getTickets(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/support/tickets?${query}`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat daftar tiket');
    return data;
  },

  async getTicketDetails(id: string) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}`, {
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat detail tiket');
    return data;
  },


  async createTicket(subject: string, category: string, priority: string, initialMessage: string, attachmentUrl?: string) {
    const res = await fetch(`${API_BASE}/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ subject, category, priority, initialMessage, attachmentUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengirim tiket');
    return data;
  },

  async replyTicket(id: string, message: string, attachmentUrl?: string) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ message, attachmentUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengirim balasan tiket');
    return data;
  },

  async closeTicket(id: string) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}/close`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menutup tiket');
    return data;
  },

  async deleteTicket(id: string) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus tiket');
    return data;
  },

  async createReport(type: string, title: string, description: string, imageUrl?: string) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ type, title, description, imageUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengirim laporan');
    return data;
  },

  // Promo Coupons
  async validateCoupon(code: string, originalPrice: number) {
    const res = await fetch(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ code, originalPrice }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kode kupon tidak valid');
    return data;
  },

  // FAQs
  async getFaqs() {
    const res = await fetch(`${API_BASE}/support/faqs`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat FAQ');
    return data;
  },

  // Chatbot Knowledge
  async getChatbotKnowledge() {
    const res = await fetch(`${API_BASE}/support/chatbot-knowledge`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat pengetahuan chatbot');
    return data;
  },
};
