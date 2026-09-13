import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { api } from '../services/api';
import { localProjectStorage } from '../services/indexedDb';
import { toast, useLanguage } from '@pixellift/ui';
import {
  X,
  UploadCloud,
  Layers,
  Check,
  AlertCircle,
  Trash2,
  Download,
  Loader2,
  Sparkles,
  FolderPlus,
  ArrowRight,
} from 'lucide-react';

interface BatchItem {
  id: string;
  file: File;
  name: string;
  size: number;
  originalUrl: string;
  resultUrl: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMsg?: string;
}

interface BatchRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchRemovalModal: React.FC<BatchRemovalModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const maxFiles = 20;
    const newItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      if (items.length + newItems.length >= maxFiles) {
        toast.info(t(`Maksimal ${maxFiles} foto dalam 1 antrean batch.`, `Maximum ${maxFiles} photos per batch queue.`));
        break;
      }
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const originalUrl = URL.createObjectURL(file);
      newItems.push({
        id: 'batch_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        file,
        name: file.name,
        size: file.size,
        originalUrl,
        resultUrl: null,
        status: 'pending',
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      toast.success(t(`${newItems.length} gambar berhasil ditambahkan ke antrean batch.`, `${newItems.length} images added to batch queue.`));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
  };

  const processSingleItem = async (item: BatchItem): Promise<string | null> => {
    try {
      const res = await api.removeBackground(item.file, item.name);
      return res.resultImageUrl;
    } catch (err: any) {
      console.error(`Gagal memproses ${item.name}:`, err);
      throw err;
    }
  };

  const handleStartBatchProcess = async () => {
    const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'error');
    if (pendingItems.length === 0) {
      toast.info('Semua foto dalam antrean sudah selesai diproses.');
      return;
    }

    setIsProcessingAll(true);
    let successCount = 0;

    // Process with concurrency limit of 2 to avoid overwhelming client/API
    const concurrency = 2;
    const queue = [...pendingItems];

    const worker = async () => {
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;

        setItems((prev) =>
          prev.map((i) => (i.id === current.id ? { ...i, status: 'processing' } : i))
        );

        try {
          const resultUrl = await processSingleItem(current);
          if (resultUrl) {
            setItems((prev) =>
              prev.map((i) =>
                i.id === current.id ? { ...i, status: 'done', resultUrl } : i
              )
            );
            successCount++;
          }
        } catch (err: any) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === current.id
                ? { ...i, status: 'error', errorMsg: err.message || 'Gagal diproses' }
                : i
            )
          );
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }).map(() => worker()));
    setIsProcessingAll(false);
    toast.success(`Batch selesai: ${successCount} foto berhasil dihapus background-nya.`);
  };

  const handleDownloadZip = async () => {
    const completedItems = items.filter((i) => i.status === 'done' && i.resultUrl);
    if (completedItems.length === 0) {
      toast.info('Belum ada foto yang selesai diproses untuk diunduh.');
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('pixellift_batch_cutouts') || zip;

      for (let idx = 0; idx < completedItems.length; idx++) {
        const item = completedItems[idx];
        const res = await fetch(item.resultUrl!);
        const blob = await res.blob();
        const baseName = item.name.replace(/\.[^/.]+$/, '');
        folder.file(`${baseName}_nobg.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `pixellift-batch-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);

      toast.success(`Arsip ZIP berisi ${completedItems.length} foto berhasil diunduh!`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat file ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleSaveAllToProjects = async () => {
    const completedItems = items.filter((i) => i.status === 'done' && i.resultUrl);
    if (completedItems.length === 0) {
      toast.info(t('Belum ada foto yang selesai diproses.', 'No photos have finished processing yet.'));
      return;
    }

    try {
      for (const item of completedItems) {
        await localProjectStorage.saveProject({
          id: 'proj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          userId: 'local_user',
          name: item.name.replace(/\.[^/.]+$/, '') + ' (Batch Cutout)',
          originalImageData: item.originalUrl,
          processedImageData: item.resultUrl,
          originalImageUrl: item.originalUrl,
          processedImageUrl: item.resultUrl,
          thumbnailUrl: item.resultUrl!,
          format: 'PNG',
          width: 1080,
          height: 1080,
          status: 'Completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      toast.success(t(`${completedItems.length} foto berhasil disimpan ke Proyek Lokal Anda.`, `${completedItems.length} photos saved to Local Projects.`));
    } catch (err: any) {
      toast.error(err.message || t('Gagal menyimpan ke proyek', 'Failed to save to projects'));
    }
  };

  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Batch Background Remover (Hapus Massal)', 'Batch Background Remover')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {t('Hingga 20 Foto', 'Up to 20 Photos')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  'Unggah banyak foto produk sekaligus, hapus background otomatis, dan unduh dalam 1 paket ZIP.',
                  'Upload multiple product photos at once, auto-remove backgrounds, and download in 1 ZIP bundle.'
                )}
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

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 rounded-3xl p-6 bg-indigo-50/40 dark:bg-indigo-950/20 text-center cursor-pointer transition-all hover:bg-indigo-50/80 group space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('Seret & Lepaskan Banyak Foto di Sini, atau ', 'Drag & Drop Multiple Photos Here, or ')}
                <span className="text-indigo-600 dark:text-indigo-400 underline">{t('Pilih File', 'Browse Files')}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Mendukung JPEG, PNG, WEBP hingga 20 gambar sekaligus.', 'Supports JPEG, PNG, WEBP up to 20 images at once.')}
              </p>
            </div>
          </div>

          {/* Queue Header & Global Controls */}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>{t('Antrean Foto', 'Photo Queue')} ({items.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({doneCount} {t('selesai diproses', 'processed')})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessingAll}
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('Bersihkan Antrean', 'Clear Queue')}
                </button>

                <button
                  type="button"
                  disabled={isProcessingAll || items.every((i) => i.status === 'done')}
                  onClick={handleStartBatchProcess}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 disabled:opacity-50 transition-all"
                >
                  {isProcessingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('Sedang Memproses...', 'Processing...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('Proses Semua Batch', 'Process All Batch')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Items Grid List */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 relative group"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0 relative border border-slate-200 dark:border-slate-700">
                    <img
                      src={item.resultUrl || item.originalUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {(item.size / 1024).toFixed(0)} KB
                      </span>
                      {item.status === 'done' && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3" />
                          <span>{t('Selesai', 'Done')}</span>
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-500">
                          <AlertCircle className="w-3 h-3" />
                          <span>{t('Gagal', 'Failed')}</span>
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {t('Menunggu', 'Pending')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Item */}
                  <button
                    type="button"
                    disabled={isProcessingAll}
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                    title={t('Hapus dari antrean', 'Remove from queue')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs space-y-1">
              <p>{t('Belum ada gambar yang dimasukkan ke antrean.', 'No images in queue yet.')}</p>
              <p className="text-[11px] text-slate-500">{t('Pilih foto produk untuk memulai pemrosesan massal.', 'Select product photos to start batch processing.')}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {doneCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {t(`${doneCount} dari ${items.length} foto siap diunduh.`, `${doneCount} of ${items.length} photos ready for download.`)}
              </span>
            ) : (
              <span>{t('Siap memproses hingga 20 foto sekaligus.', 'Ready to process up to 20 photos at once.')}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {doneCount > 0 && (
              <button
                type="button"
                onClick={handleSaveAllToProjects}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{t('Simpan ke Proyek', 'Save to Projects')}</span>
              </button>
            )}

            <button
              type="button"
              disabled={doneCount === 0 || isZipping}
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25 disabled:opacity-50 transition-all"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('Membuat ZIP...', 'Creating ZIP...')}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('Download Semua (.ZIP)', 'Download All (.ZIP)')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
