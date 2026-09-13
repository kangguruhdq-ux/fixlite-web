import { toast, useLanguage } from '@pixellift/ui';
import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Undo2, Redo2, Download, Copy, Share2, BookmarkPlus, Check, Sparkles } from 'lucide-react';

interface ComparisonAndExportProps {
  originalImage: string;
  currentPreviewImage: string;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  onResetRefinement: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: (format: 'PNG' | 'JPG' | 'WEBP', quality: number, size: 'Original' | 'Medium' | 'Small') => void;
  onSaveToProjects: () => void;
  autoFileName: string;
}

export const ComparisonAndExport: React.FC<ComparisonAndExportProps> = ({
  originalImage,
  currentPreviewImage,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onResetRefinement,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDownload,
  onSaveToProjects,
  autoFileName,
}) => {
  const { t } = useLanguage();
  const [format, setFormat] = useState<'PNG' | 'JPG' | 'WEBP'>('PNG');
  const [quality, setQuality] = useState<number>(92);
  const [size, setSize] = useState<'Original' | 'Medium' | 'Small'>('Original');
  const [isCopied, setIsCopied] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  const handleGenerateBeforeAfterCard = async () => {
    setIsGeneratingCard(true);
    try {
      const cardCanvas = document.createElement('canvas');
      const W = 1200;
      const H = 675;
      cardCanvas.width = W;
      cardCanvas.height = H;
      const ctx = cardCanvas.getContext('2d');
      if (!ctx) return;

      // Dark gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Top branding header
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(60, 52, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('PIXELIFT STUDIO', 88, 58);

      ctx.font = '600 14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('BEFORE & AFTER SHOWCASE', 320, 58);

      // Load both images
      const imgBefore = new Image();
      imgBefore.crossOrigin = 'anonymous';
      const imgAfter = new Image();
      imgAfter.crossOrigin = 'anonymous';

      await Promise.all([
        new Promise((resolve, reject) => {
          imgBefore.onload = resolve;
          imgBefore.onerror = reject;
          imgBefore.src = originalImage;
        }),
        new Promise((resolve, reject) => {
          imgAfter.onload = resolve;
          imgAfter.onerror = reject;
          imgAfter.src = currentPreviewImage || originalImage;
        }),
      ]);

      const padX = 50;
      const topY = 100;
      const cardW = (W - padX * 3) / 2; // 525 px each
      const cardH = 490;

      // Draw Left Card (Before)
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(padX, topY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();
      ctx.clip();

      const scaleB = Math.max(cardW / imgBefore.width, cardH / imgBefore.height);
      const dwB = imgBefore.width * scaleB;
      const dhB = imgBefore.height * scaleB;
      const dxB = padX + (cardW - dwB) / 2;
      const dyB = topY + (cardH - dhB) / 2;
      ctx.drawImage(imgBefore, dxB, dyB, dwB, dhB);
      ctx.restore();

      // Badge Before
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(padX + 20, topY + 20, 110, 34, 10);
      ctx.fill();
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('ORIGINAL', padX + 38, topY + 42);
      ctx.restore();

      // Draw Right Card (After)
      const rightX = padX * 2 + cardW;
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(rightX, topY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();
      ctx.clip();

      const scaleA = Math.max(cardW / imgAfter.width, cardH / imgAfter.height);
      const dwA = imgAfter.width * scaleA;
      const dhA = imgAfter.height * scaleA;
      const dxA = rightX + (cardW - dwA) / 2;
      const dyA = topY + (cardH - dhA) / 2;
      ctx.drawImage(imgAfter, dxA, dyA, dwA, dhA);
      ctx.restore();

      // Badge After
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(rightX + 20, topY + 20, 110, 34, 10);
      ctx.fill();
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('HASIL AI', rightX + 44, topY + 42);
      ctx.restore();

      // VS Pill in the center
      const centerX = W / 2;
      const centerY = topY + cardH / 2;
      ctx.save();
      ctx.fillStyle = '#6366f1';
      ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VS', centerX, centerY + 5);
      ctx.restore();

      // Bottom footer text
      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Diedit dengan Pixelift Lite • pixellift.local • 100% Bebas Watermark', W / 2, H - 24);

      // Download card
      const dataUrl = cardCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `pixellift-showcase-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('Kartu komparasi Before & After berhasil diunduh!', 'Before & After comparison card downloaded!'));
    } catch (err: any) {
      toast.error(t('Gagal membuat kartu komparasi: ', 'Failed to generate comparison card: ') + (err.message || 'Error'));
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleDownloadClick = () => {
    onDownload(format, quality, size);
    setShowSuccessToast(false);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  const handleCopyClipboard = async () => {
    try {
      if (currentPreviewImage) {
        const res = await fetch(currentPreviewImage);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setIsCopied(true);
        toast.success(t('Gambar berhasil disalin ke clipboard.', 'Image copied to clipboard successfully.'));
        setTimeout(() => setIsCopied(false), 2500);
      }
    } catch {
      toast.error(t('Salin ke papan klip tidak didukung oleh browser pada format ini.', 'Copy to clipboard not supported by browser in this format.'));
    }
  };

  const handleShare = async () => {
    if (navigator.share && currentPreviewImage) {
      try {
        const res = await fetch(currentPreviewImage);
        const blob = await res.blob();
        const file = new File([blob], autoFileName, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'Pixelift Lite Export',
          text: 'Edited with Pixelift Lite — Free Background Remover & Photo Editor',
        });
      } catch(error) { if((error as Error).name!=='AbortError')toast.error(t('Gambar belum dapat dibagikan. Gunakan Download atau Copy.', 'Image cannot be shared. Use Download or Copy.')); }
    } else {
      handleCopyClipboard();
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Comparison & Actions */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('Komparasi & Aksi', 'Comparison & Actions')}
        </div>

        {/* Before / After Thumbnail Split Preview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {t('Asli', 'Original')}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 checkerboard-pattern">
              <img src={currentPreviewImage || originalImage} alt="Final Result" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
              {t('Hasil Akhir', 'Final Result')}
            </span>
          </div>
        </div>

        {/* 1-Click Social Media Before & After Card Button */}
        <button
          type="button"
          disabled={isGeneratingCard}
          onClick={handleGenerateBeforeAfterCard}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-sm active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>
            {isGeneratingCard
              ? t('Membuat Kartu Komparasi...', 'Creating Showcase Card...')
              : t('Buat Kartu Komparasi (Sosmed)', 'Create Showcase Card (Social)')}
          </span>
        </button>

        {/* Toolbar: Zoom, Undo, Redo, Reset */}
        <div className="flex flex-wrap gap-2 items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onZoomOut}
              title={t('Perkecil', 'Zoom Out')}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-1 text-slate-500">{zoomLevel}%</span>
            <button
              type="button"
              onClick={onZoomIn}
              title={t('Perbesar', 'Zoom In')}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onFitScreen}
              title={t('Sesuaikan Layar', 'Fit to Screen')}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title={t('Urungkan (Ctrl+Z)', 'Undo (Ctrl+Z)')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title={t('Ulangi (Ctrl+Y)', 'Redo (Ctrl+Y)')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onResetRefinement}
              title={t('Reset Pengecatan', 'Reset Refinement')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Export & Download */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('Ekspor', 'Export')}
          </span>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
            {t('Tanpa Watermark', 'No Watermark')}
          </span>
        </div>

        {/* Format Selector */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('Format File:', 'Format:')}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['PNG', 'JPG', 'WEBP'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  format === fmt
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Slider (for JPG & WEBP) */}
        {format !== 'PNG' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>{t('Kualitas', 'Quality')}</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">{quality}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>
        )}

        {/* Size Selector */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('Ukuran Output:', 'Output Size:')}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['Original', 'Medium', 'Small'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSize(sz)}
                className={`py-1.5 text-xs font-medium rounded-xl border transition-all ${
                  size === sz
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {sz === 'Original' ? t('Asli', 'Original') : sz === 'Medium' ? t('Sedang', 'Medium') : t('Kecil', 'Small')}
              </button>
            ))}
          </div>
        </div>

        {/* Big Download Button */}
        <button
          type="button"
          onClick={handleDownloadClick}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 active:scale-[0.98] shadow-md shadow-brand-500/25 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>{t('Unduh Gambar', 'Download Image')}</span>
        </button>

        {/* Auto file name preview */}
        <div className="text-center">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block font-mono">
            {autoFileName}
          </span>
        </div>

        {/* Secondary Actions: Copy, Share, Save */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            title={t('Salin gambar ke papan klip', 'Copy image to clipboard')}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? t('Tersalin', 'Copied') : t('Salin', 'Copy')}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            title={t('Bagikan gambar', 'Share image')}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('Bagikan', 'Share')}</span>
          </button>

          <button
            type="button"
            onClick={onSaveToProjects}
            className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            title={t('Simpan proyek', 'Save project')}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>{t('Simpan', 'Save')}</span>
          </button>
        </div>

        {/* Download Success Toast */}
        {showSuccessToast && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center gap-2 animate-fadeIn">
            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5" />
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {t('Unduhan berhasil!', 'Download success!')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
