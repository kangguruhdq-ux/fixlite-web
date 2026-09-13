import { User, AuthSession } from '@pixellift/types';

const API_BASE = '/api';

function getAdminAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('pixellift_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const adminApi = {

  async createFilter(data:any) { return this.request('/presets/filters','POST',data); },
  async updateFilter(id:string,data:any) { return this.request('/presets/filters/'+encodeURIComponent(id),'PATCH',data); },
  async deleteFilter(id:string) { return this.request('/presets/filters/'+encodeURIComponent(id),'DELETE'); },
  async updateNotification(id:string,data:any) { return this.request('/admin/notifications/'+encodeURIComponent(id),'PATCH',data); },
  async deleteNotification(id:string) { return this.request('/admin/notifications/'+encodeURIComponent(id),'DELETE'); },
  async request(path:string,method:string,data?:any) {
    const res=await fetch(API_BASE+path,{method,headers:{'Content-Type':'application/json',...getAdminAuthHeader()},body:data===undefined?undefined:JSON.stringify(data)});
    const result=await res.json(); if(!res.ok)throw new Error(result.error||'Permintaan gagal.');return result;
  },
  // Auth
  async login(email: string, pass: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Login admin gagal');
    return responseData;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memverifikasi session');
    return responseData;
  },

  // Overview & Analytics
  async getOverview() {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memuat metrics overview');
    return responseData;
  },

  async getAnalytics(range = '30d') {
    const res = await fetch(`${API_BASE}/admin/analytics?range=${range}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memuat data analitik');
    return responseData;
  },

  async getUser(id: string) {
    const res = await fetch(API_BASE + '/users/' + encodeURIComponent(id), { headers: getAdminAuthHeader() });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memuat pengguna');
    return responseData;
  },
  async updateProject(id: string, data: any) {
    const res = await fetch(API_BASE + '/projects/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() }, body: JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal memperbarui proyek');
    return result;
  },
  // Users CRUD
  async getUsers(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/users?${query}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async createUser(userData: any) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(userData),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal membuat pengguna');
    return responseData;
  },

  async updateUser(id: string, userData: any) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(userData),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memperbarui pengguna');
    return responseData;
  },

  async deleteUser(id: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal menghapus pengguna');
    return responseData;
  },

  async bulkUsers(ids: string[], action: 'suspend' | 'activate' | 'delete') {
    const res = await fetch(`${API_BASE}/users/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify({ ids, action }),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memproses aksi massal');
    return responseData;
  },

  async exportUsersCsv() {
    const res = await fetch(`${API_BASE}/users/export/csv`, {
      headers: { ...getAdminAuthHeader() },
    });
    if (!res.ok) throw new Error('Gagal mengekspor pengguna');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixellift-users-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // Projects & Processes
  async getProjects(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/projects?${query}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async deleteProject(id: string) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async bulkDeleteProjects(ids: string[]) {
    const res = await fetch(`${API_BASE}/projects/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify({ ids }),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async getProcesses(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/background/processes?${query}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async retryProcess(id: string) {
    const res = await fetch(`${API_BASE}/background/processes/${id}/retry`, {
      method: 'POST',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  // Presets & Filters
  async getPresets() {
    const res = await fetch(API_BASE + '/presets?all=true', { headers:getAdminAuthHeader() });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async createPreset(data: any) {
    const res = await fetch(`${API_BASE}/presets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async updatePreset(id: string, data: any) {
    const res = await fetch(`${API_BASE}/presets/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async deletePreset(id: string) {
    const res = await fetch(`${API_BASE}/presets/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  // Transactions CRUD
  async getTransactions(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/memberships/transactions?${query}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async getTransaction(id: string) {
    const res = await fetch(`${API_BASE}/memberships/transactions/${id}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memuat detail transaksi');
    return responseData;
  },

  async createTransactionManual(data: any) {
    const res = await fetch(`${API_BASE}/memberships/transactions/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal mencatat transaksi manual');
    return responseData;
  },

  async updateTransaction(id: string, data: any) {
    const res = await fetch(`${API_BASE}/memberships/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memperbarui transaksi');
    return responseData;
  },

  async deleteTransaction(id: string) {
    const res = await fetch(`${API_BASE}/memberships/transactions/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal menghapus transaksi');
    return responseData;
  },

  async updateTransactionStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/memberships/transactions/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async exportTransactionsCsv() {
    const res = await fetch(`${API_BASE}/memberships/transactions/export/csv`, {
      headers: { ...getAdminAuthHeader() },
    });
    if (!res.ok) throw new Error('Gagal mengekspor transaksi CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixellift-transactions-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async getPlans() {
    const res = await fetch(`${API_BASE}/memberships/plans`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memuat paket membership');
    return responseData;
  },

  async updatePlan(id: string, data: any) {
    const res = await fetch(`${API_BASE}/memberships/plans/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memperbarui paket membership');
    return responseData;
  },

  // Support Tickets & Live Chat
  async getTickets(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/support/tickets?${query}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async getTicketDetails(id: string) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async replyTicket(id: string, message: string, isInternalNote = false, attachmentUrl?: string) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify({ message, isInternalNote, attachmentUrl }),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async updateTicket(id: string, data: any) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async deleteTicket(id: string) {
    const res = await fetch(`${API_BASE}/support/tickets/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal menghapus tiket');
    return responseData;
  },

  // Reports
  async getReports(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports?${query}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async updateReport(id: string, data: any) {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async deleteReport(id: string) {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal menghapus laporan');
    return responseData;
  },

  async deleteProcess(id: string) {
    const res = await fetch(`${API_BASE}/background/processes/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal menghapus proses');
    return responseData;
  },

  async createMockProcess(data?: any) {
    const res = await fetch(`${API_BASE}/background/processes/mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
      body: JSON.stringify(data || {}),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal membuat mock proses');
    return responseData;
  },

  // Audit Logs
  async getAuditLogs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/audit-logs?${query}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async deleteAuditLog(id: string) {
    const res = await fetch(`${API_BASE}/admin/audit-logs/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal menghapus log');
    return responseData;
  },

  async clearAuditLogs() {
    const res = await fetch(`${API_BASE}/admin/audit-logs/clear`, {
      method: 'POST',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal membersihkan log');
    return responseData;
  },

  async exportAuditLogsCsv() {
    const res = await fetch(`${API_BASE}/admin/audit-logs/export/csv`, {
      headers: { ...getAdminAuthHeader() },
    });
    if (!res.ok) throw new Error('Gagal mengekspor audit logs CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixellift-audit-logs-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // App Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async updateSettings(data: any) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async resetSettings() {
    const res = await fetch(`${API_BASE}/admin/settings/reset`, {
      method: 'POST',
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal mereset pengaturan');
    return responseData;
  },

  async updateMyProfile(data: { name?: string; email?: string; avatarUrl?: string; currentPassword?: string; newPassword?: string }) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeader() },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Gagal memperbarui profil');
    return responseData;
  },

  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE}/admin/notifications`, {
      headers: { ...getAdminAuthHeader() },
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  async broadcastNotification(data: any) {
    const res = await fetch(`${API_BASE}/admin/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (!res.ok) throw new Error(responseData.error || 'Permintaan gagal. Silakan coba lagi.');
    return responseData;
  },

  // Coupons / Promo Codes
  async getCoupons() {
    const res = await fetch(`${API_BASE}/coupons`, {
      headers: { ...getAdminAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat kupon');
    return data;
  },

  async createCoupon(data: any) {
    const res = await fetch(`${API_BASE}/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal membuat kupon');
    return result;
  },

  async updateCoupon(id: string, data: any) {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal memperbarui kupon');
    return result;
  },

  async deleteCoupon(id: string) {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal menghapus kupon');
    return result;
  },

  // FAQs
  async getFaqs(all = true) {
    const res = await fetch(`${API_BASE}/support/faqs${all ? '?all=true' : ''}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat FAQ');
    return data;
  },

  async createFaq(data: any) {
    const res = await fetch(`${API_BASE}/support/faqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal membuat FAQ');
    return result;
  },

  async updateFaq(id: string, data: any) {
    const res = await fetch(`${API_BASE}/support/faqs/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal memperbarui FAQ');
    return result;
  },

  async deleteFaq(id: string) {
    const res = await fetch(`${API_BASE}/support/faqs/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal menghapus FAQ');
    return result;
  },

  // Chatbot Knowledge Base
  async getChatbotKnowledge(all = true) {
    const res = await fetch(`${API_BASE}/support/chatbot-knowledge${all ? '?all=true' : ''}`, {
      headers: { ...getAdminAuthHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat pengetahuan chatbot');
    return data;
  },

  async createChatbotKnowledge(data: any) {
    const res = await fetch(`${API_BASE}/support/chatbot-knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal menambah pengetahuan chatbot');
    return result;
  },

  async updateChatbotKnowledge(id: string, data: any) {
    const res = await fetch(`${API_BASE}/support/chatbot-knowledge/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal memperbarui pengetahuan chatbot');
    return result;
  },

  async deleteChatbotKnowledge(id: string) {
    const res = await fetch(`${API_BASE}/support/chatbot-knowledge/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminAuthHeader() },
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal menghapus pengetahuan chatbot');
    return result;
  },
};
