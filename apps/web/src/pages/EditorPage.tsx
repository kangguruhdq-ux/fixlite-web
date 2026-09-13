import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast, useLanguage } from '@pixellift/ui';
import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { RemoveBackgroundPanel } from '../components/RemoveBackgroundPanel';
import { PhotoEditorSliders } from '../components/PhotoEditorSliders';
import { CanvasViewport } from '../components/CanvasViewport';
import { ComparisonAndExport } from '../components/ComparisonAndExport';
import { MyProjectsModal } from '../components/MyProjectsModal';
import { SimulatedMembershipModal } from '../components/SimulatedMembershipModal';
import { SupportFeedbackModal } from '../components/SupportFeedbackModal';
import { AuthModal } from '../components/AuthModal';

import {
  BackgroundSettings,
  PhotoBasicSettings,
  PhotoColorSettings,
  PhotoDetailSettings,
  PhotoTransformSettings,
  ProductShadowSettings,
  WatermarkSettings,
  Project,
} from '@pixellift/types';
import { api } from '../services/api';
import { localProjectStorage } from '../services/indexedDb';
import { Upload, Sparkles, Wand2, Shield, Zap, Smartphone, Monitor, Save, FolderOpen, Scissors, SlidersHorizontal, Download, ArrowLeft } from 'lucide-react';

const DEMO_PORTRAIT = '/demo-portrait.jpg';

const defaultBasic: PhotoBasicSettings = {
  exposure: 0,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
};

const defaultColor: PhotoColorSettings = {
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  hue: 0,
  colorIntensity: 0,
};

const defaultDetail: PhotoDetailSettings = {
  sharpness: 0,
  clarity: 0,
  blur: 0,
  grain: 0,
  vignette: 0,
};

const defaultTransform: PhotoTransformSettings = {
  rotate: 0,
  flipHorizontal: false,
  flipVertical: false,
  aspectRatio: 'Original',
};

const defaultBg: BackgroundSettings = {
  mode: 'transparent',
  color: '#FFFFFF',
};

const defaultShadow: ProductShadowSettings = {
  enabled: false,
  type: 'floor',
  blur: 16,
  opacity: 60,
  offsetX: 0,
  offsetY: 10,
  scale: 100,
};

const defaultWatermark: WatermarkSettings = {
  enabled: false,
  type: 'text',
  text: '© Toko Saya',
  opacity: 75,
  size: 50,
  position: 'bottom-right',
  color: '#FFFFFF',
};

export const EditorPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const location = useLocation(), navigate = useNavigate();
  const [mobileTool, setMobileTool] = useState(new URLSearchParams(location.search).get('tool') || 'background');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const projectMeta = useRef<any>(null);
  // Main state
  const [originalImage, setOriginalImage] = useState<string>(DEMO_PORTRAIT);
  const [originalFileName, setOriginalFileName] = useState<string>('sarah_portrait.png');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [hasRemovedBg, setHasRemovedBg] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Settings
  const [basic, setBasic] = useState<PhotoBasicSettings>(defaultBasic);
  const [color, setColor] = useState<PhotoColorSettings>(defaultColor);
  const [detail, setDetail] = useState<PhotoDetailSettings>(defaultDetail);
  const [transform, setTransform] = useState<PhotoTransformSettings>(defaultTransform);
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>(defaultBg);
  const [shadowSettings, setShadowSettings] = useState<ProductShadowSettings>(defaultShadow);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(defaultWatermark);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedAiModel, setSelectedAiModel] = useState<string>('ISNet');
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState<number>(50);

  // Viewport & Refinement
  const [refinementEnabled, setRefinementEnabled] = useState<boolean>(false);
  const [brushMode, setBrushMode] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState<number>(50);
  const [brushSoftness, setBrushSoftness] = useState<number>(30);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [previewMode, setPreviewMode] = useState<'original' | 'transparent' | 'background' | 'final'>('final');

  // Preview data URL rendered by canvas
  const [currentRenderedUrl, setCurrentRenderedUrl] = useState<string>(DEMO_PORTRAIT);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Modals
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Mobile frame simulator on desktop

  const historyRef = useRef<any[]>([]), historyIndexRef = useRef(-1), restoringHistory = useRef(false);
  const pushHistory = (snapshot: any) => {
    const items = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (JSON.stringify(items[items.length - 1]) === JSON.stringify(snapshot)) return false;
    const next = [...items, snapshot].slice(-40);
    historyRef.current = next; historyIndexRef.current = next.length - 1;
    setHistory(next); setHistoryIndex(next.length - 1);
    return true;
  };
  useEffect(() => {
    if (restoringHistory.current) { restoringHistory.current = false; return; }
    const timer = setTimeout(() => {
      const baseline = historyRef.current.length === 0;
      const changed = pushHistory({ basic, color, detail, transform, bg: backgroundSettings, activeFilter, processedImage, shadow: shadowSettings, watermark: watermarkSettings });
      if(changed && !baseline) setDirty(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [basic, color, detail, transform, backgroundSettings, activeFilter, processedImage, shadowSettings, watermarkSettings]);
  const restoreHistory = (index: number) => {
    const target = historyRef.current[index]; if (!target) return;
    restoringHistory.current = true;
    setBasic(target.basic); setColor(target.color); setDetail(target.detail); setTransform(target.transform); setBackgroundSettings(target.bg);
    maskCanvasRef.current=null;
    setActiveFilter(target.activeFilter); setProcessedImage(target.processedImage); setHasRemovedBg(Boolean(target.processedImage));
    if (target.shadow) setShadowSettings(target.shadow);
    if (target.watermark) setWatermarkSettings(target.watermark);
    historyIndexRef.current = index; setHistoryIndex(index); setDirty(true);
  };
  const handleUndo = () => { if(historyIndexRef.current > 0) restoreHistory(historyIndexRef.current - 1); };
  const handleRedo = () => { if(historyIndexRef.current < historyRef.current.length - 1) restoreHistory(historyIndexRef.current + 1); };
  const clearHistory = () => { historyRef.current = []; historyIndexRef.current = -1; setHistory([]); setHistoryIndex(-1); };
  // Upload handler
  const handleFileUpload = (file: File) => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast.error('Pilih foto JPG, PNG, atau WEBP.'); return; }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal adalah 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const validation = new Image();
      validation.src = result;
      try { await validation.decode(); } catch { toast.error("File ini bukan gambar yang dapat dibaca."); return; }
      setActiveProjectId(null); projectMeta.current = null; clearHistory(); setDirty(true);
      setOriginalImage(result);
      setCurrentRenderedUrl(result);
      setZoomLevel(100);
      setRefinementEnabled(false);
      toast.success('Foto berhasil diunggah. Saatnya berkreasi!');
      setOriginalFileName(file.name);
      setProcessedImage(null);
      setHasRemovedBg(false);
      maskCanvasRef.current = null;
      setBasic(defaultBasic);
      setColor(defaultColor);
      setDetail(defaultDetail);
      setTransform(defaultTransform);
      setBackgroundSettings(defaultBg);
      setShadowSettings(defaultShadow);
      setWatermarkSettings(defaultWatermark);
      setActiveFilter(null);
      setPreviewMode('final');
    };
    reader.onerror = () => toast.error('Foto tidak dapat dibaca. Silakan pilih file lain.');
    reader.readAsDataURL(file);
  };

  const imageSourceRef=useRef(originalImage);imageSourceRef.current=originalImage;
  // Remove Background trigger
  const handleRemoveBg = async () => {
    const requestedImage=originalImage;
    setIsProcessing(true);
    try {
      // Fetch blob from originalImage URL
      const res = await fetch(originalImage);
      const blob = await res.blob();
      const response = await api.removeBackground(blob, originalFileName, {
        model: selectedAiModel,
        confidenceThreshold: aiConfidenceThreshold,
        refinementLevel: 'high',
      });
      if(imageSourceRef.current!==requestedImage){toast.info('Foto telah diganti. Hasil proses sebelumnya ada di riwayat admin.');return;}

      maskCanvasRef.current = null;
      setProcessedImage(response.resultImageUrl);
      setHasRemovedBg(true);
      setPreviewMode('final');

      toast.success('Background berhasil dihapus dengan '+response.modelUsed+'.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus latar belakang');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preset Filters apply
  const handleApplyFilter = (name: string) => {
    setBasic(defaultBasic); setColor(defaultColor); setDetail(defaultDetail);
    setActiveFilter(name);
    if (name === 'Natural') {
      setBasic({ ...defaultBasic, contrast: 10 });
      setColor({ ...defaultColor, saturation: 5 });
    } else if (name === 'Bright') {
      setBasic({ ...defaultBasic, brightness: 15, contrast: 12, highlights: -5, shadows: 10 });
      setColor({ ...defaultColor, vibrance: 15 });
    } else if (name === 'Warm') {
      setColor({ ...defaultColor, temperature: 25, saturation: 10 });
      setDetail({ ...defaultDetail, vignette: 10 });
    } else if (name === 'Cool') {
      setColor({ ...defaultColor, temperature: -25, vibrance: 10 });
    } else if (name === 'Film') {
      setBasic({ ...defaultBasic, contrast: -10, shadows: 20 });
      setDetail({ ...defaultDetail, grain: 30, vignette: 25 });
    } else if (name === 'Mono') {
      setColor({ ...defaultColor, saturation: -100, vibrance: -100 });
      setBasic({ ...defaultBasic, contrast: 25 });
      setDetail({ ...defaultDetail, sharpness: 20 });
    } else if (name === 'Vintage') {
      setColor({ ...defaultColor, temperature: 30, saturation: -15 });
      setDetail({ ...defaultDetail, grain: 35, vignette: 30 });
    }
  };

  // Reset section
  const handleResetSection = (section: 'basic' | 'color' | 'detail' | 'transform' | 'all') => {
    if (section === 'basic' || section === 'all') setBasic(defaultBasic);
    if (section === 'color' || section === 'all') setColor(defaultColor);
    if (section === 'detail' || section === 'all') setDetail(defaultDetail);
    if (section === 'transform' || section === 'all') setTransform(defaultTransform);
    if (section === 'all') {
      setBackgroundSettings(defaultBg);
      setActiveFilter(null);
      setShadowSettings(defaultShadow);
      setWatermarkSettings(defaultWatermark);
      maskCanvasRef.current = null;
    }
  };

  // Export Download
  const autoFileName = `pixellift-${hasRemovedBg ? 'background-removed' : 'edited'}-${originalFileName.replace(/\.[^/.]+$/, '')}.png`;

  const handleDownload = (format: 'PNG' | 'JPG' | 'WEBP', quality: number, size: 'Original' | 'Medium' | 'Small') => {
    if (!currentRenderedUrl) return;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let scale = 1;
      if (size === 'Medium') scale = 0.75;
      if (size === 'Small') scale = 0.5;

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (format === 'JPG') {
        ctx.fillStyle = backgroundSettings.mode === 'solid' ? backgroundSettings.color || '#FFFFFF' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mimeType = format === 'PNG' ? 'image/png' : format === 'JPG' ? 'image/jpeg' : 'image/webp';
      let dataUrl: string;
      try { dataUrl = canvas.toDataURL(mimeType, quality / 100); }
      catch { toast.error('Gambar tidak dapat diekspor. Coba unggah file dari perangkat Anda.'); return; }

      const link = document.createElement('a');
      link.download = `pixellift-${hasRemovedBg ? 'background-removed' : 'edited'}-${Date.now()}.${format.toLowerCase()}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      fetch('/api/background/exports',{method:'POST',headers:{'Content-Type':'application/json',...(localStorage.getItem('pixellift_token')?{Authorization:'Bearer '+localStorage.getItem('pixellift_token')}: {})},body:JSON.stringify({id:crypto.randomUUID(),format,width:canvas.width,height:canvas.height})}).catch(()=>{});
      toast.success('Unduhan ' + format + ' dimulai. Periksa folder unduhan Anda.');
    };
    img.onerror = () => toast.error('Gambar ekspor belum siap. Silakan coba lagi.');
    img.src = currentRenderedUrl;
  };

  const handleSaveToProjects = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const img = new Image(); img.src = currentRenderedUrl; await img.decode();
      const now = new Date().toISOString();
      const project: any = {
        ...projectMeta.current, id: activeProjectId || 'proj_' + crypto.randomUUID(), userId: user?.id || 'local_user',
        name: projectMeta.current?.name || originalFileName, originalImageData: originalImage, processedImageData: processedImage,
        maskData: maskCanvasRef.current?.toDataURL() || null,
        originalImageUrl: originalImage, thumbnailUrl: currentRenderedUrl, format: 'png',
        width: img.naturalWidth, height: img.naturalHeight, status: hasRemovedBg ? 'Completed' : 'Draft',
        settings: { basic, color, detail, transform, background: backgroundSettings, activeFilter, shadow: shadowSettings, watermark: watermarkSettings },
        createdAt: projectMeta.current?.createdAt || now, updatedAt: now,
      };
      await localProjectStorage.saveProject(project);
      projectMeta.current = project; setActiveProjectId(project.id);
      pushHistory({ basic, color, detail, transform, bg:backgroundSettings, activeFilter, processedImage, shadow: shadowSettings, watermark: watermarkSettings }); setDirty(false);
      toast.success('Proyek tersimpan. Anda bisa melanjutkannya dari dashboard.');
    } catch(err) { toast.error((err as Error).message || 'Proyek belum berhasil disimpan.'); }
    finally { setSaving(false); }
  };
  const handleLoadProject = (p: any) => {
    projectMeta.current = p; setActiveProjectId(p.id); clearHistory();
    setOriginalImage(p.originalImageData || p.originalImageUrl); setOriginalFileName(p.name);
    setProcessedImage(p.processedImageData || null); setHasRemovedBg(Boolean(p.processedImageData));
    setCurrentRenderedUrl(p.thumbnailUrl || p.originalImageData);
    maskCanvasRef.current = null;
    if (p.maskData) {
      const mask = new Image();
      mask.onload = () => { const canvas = document.createElement('canvas'); canvas.width=mask.width; canvas.height=mask.height; canvas.getContext('2d')?.drawImage(mask,0,0); maskCanvasRef.current=canvas; setBackgroundSettings(prev=>({...prev})); };
      mask.src=p.maskData;
    }
    setBasic({ ...defaultBasic, ...p.settings?.basic }); setColor({ ...defaultColor, ...p.settings?.color });
    setDetail({ ...defaultDetail, ...p.settings?.detail }); setTransform({ ...defaultTransform, ...p.settings?.transform });
    setBackgroundSettings({ ...defaultBg, ...p.settings?.background }); setActiveFilter(p.settings?.activeFilter || null);
    if (p.settings?.shadow) setShadowSettings(p.settings.shadow);
    if (p.settings?.watermark) setWatermarkSettings(p.settings.watermark);
    setZoomLevel(100); setPreviewMode('final'); setRefinementEnabled(false); setDirty(false);
  };
  useEffect(() => {
    const file = (location.state as any)?.file;
    const id = new URLSearchParams(location.search).get('project');
    let active = true;
    if (file instanceof File) { handleFileUpload(file); navigate('/editor', { replace:true, state:null }); }
    else if (id) localProjectStorage.getProject(id, user?.id || 'local_user').then(p => { if(active) { if(p) handleLoadProject(p); else toast.error('Proyek tidak ditemukan untuk akun ini.'); } }).catch(e=>toast.error(e.message));
    return () => { active=false; };
  },[location.key, user?.id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 's') { e.preventDefault(); handleSaveToProjects(); }
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); if(e.shiftKey) handleRedo(); else handleUndo(); }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown',handler);
    return () => window.removeEventListener('keydown',handler);
  });
  return (
    <div className="studio-shell">
      <Navbar
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenMembership={() => setIsMembershipOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onTryDemo={() => {
          setOriginalImage(DEMO_PORTRAIT);
          setOriginalFileName('sarah_portrait.png');
          setProcessedImage(null);
          setHasRemovedBg(false);
          maskCanvasRef.current = null;
        }}
      />

      {/* Main Workspace */}
      <main className="editor-main">
        <div className="editor-heading pl-toolbar">
          <div>
            <div className="studio-eyebrow">PIXELIFT STUDIO</div>
            <h1>{t('Sentuhan kecil. Hasil besar.', 'Subtle touch. Powerful results.')}</h1>
            <p title={originalFileName}>
              {originalFileName} &middot; {dirty || !activeProjectId ? t('Belum disimpan', 'Not saved') : t('Tersimpan', 'Saved')}
            </p>
          </div>
          <div className="editor-heading-actions">
            <button className="pl-btn desktop-only" onClick={() => setIsProjectsOpen(true)}>
              <FolderOpen size={16}/>{t('Proyek', 'Projects')}
            </button>
            <button className="pl-btn" onClick={() => uploadInput.current?.click()}>
              <Upload size={16}/>{t('Unggah', 'Upload')}
            </button>
            <button className="pl-btn pl-btn-primary" disabled={saving} onClick={handleSaveToProjects}>
              <Save size={16}/>{saving ? t('Menyimpan...', 'Saving...') : t('Simpan', 'Save')}
            </button>
          </div>
        </div>
        <input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label={t('Unggah foto editor', 'Upload photo editor')} className="hidden" onChange={e=>{if(e.target.files?.[0]) handleFileUpload(e.target.files[0]);e.target.value='';}} />
        <div
          className={`editor-container w-full mx-auto transition-all ${
            ''
          }`}
        >
          <div className="editor-grid" data-tool={mobileTool}>
            {/* Left Column: Remove Background & Lightroom Lite Sliders (Col 1 to 4) */}
            <div className="editor-tools space-y-4">
              <div className="editor-background"><RemoveBackgroundPanel
                isProcessing={isProcessing}
                onRemoveBackground={handleRemoveBg}
                hasRemovedBg={hasRemovedBg}
                refinementEnabled={refinementEnabled}
                onToggleRefinement={setRefinementEnabled}
                brushMode={brushMode}
                onChangeBrushMode={setBrushMode}
                brushSize={brushSize}
                onChangeBrushSize={setBrushSize}
                brushSoftness={brushSoftness}
                onChangeBrushSoftness={setBrushSoftness}
                backgroundSettings={backgroundSettings}
                onChangeBackground={value=>{setBackgroundSettings(value);setPreviewMode("final");}}
                shadowSettings={shadowSettings}
                onChangeShadow={setShadowSettings}
                selectedModel={selectedAiModel}
                onChangeModel={setSelectedAiModel}
                confidenceThreshold={aiConfidenceThreshold}
                onChangeConfidenceThreshold={setAiConfidenceThreshold}
              /></div>

              <div className="editor-adjustments"><PhotoEditorSliders
                basic={basic}
                color={color}
                detail={detail}
                transform={transform}
                activeFilter={activeFilter}
                watermarkSettings={watermarkSettings}
                onChangeBasic={setBasic}
                onChangeColor={setColor}
                onChangeDetail={setDetail}
                onChangeTransform={setTransform}
                onChangeWatermark={setWatermarkSettings}
                onApplyFilter={handleApplyFilter}
                onApplyCustomFilter={(settings,name)=>{setBasic({...defaultBasic,...settings.basic});setColor({...defaultColor,...settings.color});setDetail({...defaultDetail,...settings.detail});setActiveFilter(name);}}
                onResetSection={handleResetSection}
              /></div>
            </div>

            {/* Center Column: Canvas Viewport & Bottom Preview Radios (Col 5 to 9) */}
            <div className="editor-canvas">
              <div className="editor-preview-caption">
                <span>{t('PREVIEW', 'PREVIEW')}</span>
                <span>{zoomLevel}% &middot; {hasRemovedBg ? t('Background diproses', 'Background processed') : t('Foto asli', 'Original photo')}</span>
              </div>
              <CanvasViewport
                originalImage={originalImage}
                processedImage={processedImage}
                maskCanvasRef={maskCanvasRef}
                backgroundSettings={backgroundSettings}
                basicSettings={basic}
                colorSettings={color}
                detailSettings={detail}
                transformSettings={transform}
                shadowSettings={shadowSettings}
                watermarkSettings={watermarkSettings}
                refinementEnabled={refinementEnabled}
                brushMode={brushMode}
                brushSize={brushSize}
                brushSoftness={brushSoftness}
                zoomLevel={zoomLevel}
                previewMode={previewMode}
                onChangePreviewMode={setPreviewMode}
                onCanvasRendered={setCurrentRenderedUrl}
                onRefinementCommitted={data=>{setProcessedImage(data);setDirty(true);}}
              />

              {/* Quick Image Replacement Dropzone */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t('Ganti Foto Lain?', 'Change Photo?')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t('Mendukung JPG, PNG, WEBP hingga 10MB', 'Supports JPG, PNG, WEBP up to 10MB')}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('Upload Foto', 'Upload Photo')}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="editor-mobile-tabs" role="tablist" aria-label={t('Alat editor', 'Editor tools')}>
              {[
                {id:'background',label:t('Latar', 'Background'),icon:Scissors},
                {id:'adjust',label:t('Sesuaikan', 'Adjust'),icon:SlidersHorizontal},
                {id:'export',label:t('Ekspor', 'Export'),icon:Download}
              ].map(({id,label,icon:Icon})=><button key={id} role="tab" aria-selected={mobileTool===id} onClick={()=>setMobileTool(id)}><Icon size={16}/>{label}</button>)}
            </div>
            {/* Right Column: Comparison & Export (Col 10 to 12) */}
            <div className="editor-export space-y-4">
              <ComparisonAndExport
                originalImage={originalImage}
                currentPreviewImage={currentRenderedUrl}
                zoomLevel={zoomLevel}
                onZoomIn={() => setZoomLevel((prev) => Math.min(200, prev + 15))}
                onZoomOut={() => setZoomLevel((prev) => Math.max(50, prev - 15))}
                onFitScreen={() => setZoomLevel(100)}
                onResetRefinement={() => {
                  maskCanvasRef.current = null;
                  handleResetSection('all');
                }}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onDownload={handleDownload}
                onSaveToProjects={handleSaveToProjects}
                autoFileName={autoFileName}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <MyProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        onLoadProject={handleLoadProject}
      />

      <SimulatedMembershipModal
        isOpen={isMembershipOpen}
        onClose={() => setIsMembershipOpen(false)}
      />

      <SupportFeedbackModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};
