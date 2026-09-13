import { toast, useLanguage } from '@pixellift/ui';
import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Send, AlertCircle, HelpCircle, Check } from 'lucide-react';

interface SupportFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportFeedbackModal: React.FC<SupportFeedbackModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ticket' | 'report'>('ticket');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Background removal error');
  const [priority, setPriority] = useState('Medium');
  const [message, setMessage] = useState('');
  const [reportType, setReportType] = useState('AI salah mengenali objek');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (activeTab === 'ticket') {
        const res = await api.createTicket(subject, category, priority, message);
        setSubmittedMessage(t(`Tiket #${res.id} berhasil dikirim ke tim admin.`, `Ticket #${res.id} submitted to admin team successfully.`));
      } else {
        const res = await api.createReport(reportType, subject, message);
        setSubmittedMessage(t(`Laporan kendala #${res.id} berhasil dibuat.`, `Issue report #${res.id} created successfully.`));
      }
      toast.success(activeTab === 'ticket' ? t('Tiket bantuan berhasil dikirim.', 'Support ticket submitted successfully.') : t('Laporan berhasil dikirim.', 'Report submitted successfully.'));
      setSubject('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || t('Gagal mengirim', 'Failed to send'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('Pusat Bantuan & Laporan', 'Support & Report Center')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Kirim pertanyaan atau laporkan kendala langsung ke admin.', 'Send inquiries or report issues directly to admins.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-4">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ticket');
                setSubmittedMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'ticket'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('Tiket Bantuan', 'Support Ticket')}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('report');
                setSubmittedMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'report'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('Lapor Bug / AI', 'Report Bug / AI')}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {submittedMessage ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center space-y-3 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Berhasil Terkirim!', 'Sent Successfully!')}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {submittedMessage} {t('Tim admin akan meninjaunya sesegera mungkin.', 'Admin team will review it as soon as possible.')}
              </p>
              <button
                type="button"
                onClick={() => setSubmittedMessage(null)}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors"
              >
                {t('Kirim Lagi', 'Send Another')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Judul / Subjek:', 'Title / Subject:')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'ticket' ? t('Contoh: Kendala unduh format WEBP', 'e.g.: Issue downloading WEBP format') : t('Contoh: Objek kacamata terpotong', 'e.g.: Glasses object cropped incorrectly')}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {activeTab === 'ticket' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('Kategori:', 'Category:')}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      <option value="Background removal error">Background removal error</option>
                      <option value="Upload error">Upload error</option>
                      <option value="Export error">Export error</option>
                      <option value="Account">Account</option>
                      <option value="Membership">Membership</option>
                      <option value="Payment">Payment</option>
                      <option value="Preset">Preset</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('Prioritas:', 'Priority:')}
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Jenis Masalah:', 'Issue Type:')}
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <option value="AI salah mengenali objek">AI salah mengenali objek / AI misidentified object</option>
                    <option value="Background removal tidak rapi">Background removal tidak rapi / Imperfect edge cutout</option>
                    <option value="Bug aplikasi">Bug aplikasi / Application bug</option>
                    <option value="File hasil rusak">File hasil rusak / Corrupted export file</option>
                    <option value="Preset bermasalah">Preset bermasalah / Preset issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Deskripsi Lengkap:', 'Full Description:')}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={t('Jelaskan kendala Anda secara detail...', 'Describe your issue in detail...')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('Batal', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? t('Mengirim...', 'Submitting...') : t('Kirim', 'Submit')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
