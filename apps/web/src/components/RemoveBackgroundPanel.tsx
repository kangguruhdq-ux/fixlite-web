import { api } from '../services/api';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '@pixellift/ui';
import { BackgroundSettings, ProductShadowSettings } from '@pixellift/types';
import { Scissors, Eraser, Paintbrush, Image as ImageIcon, Sparkles, Sliders, Box, Sun, Layers } from 'lucide-react';

interface RemoveBackgroundPanelProps {
  isProcessing: boolean;
  onRemoveBackground: () => void;
  hasRemovedBg: boolean;
  refinementEnabled: boolean;
  onToggleRefinement: (enabled: boolean) => void;
  brushMode: 'erase' | 'restore';
  onChangeBrushMode: (mode: 'erase' | 'restore') => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  brushSoftness: number;
  onChangeBrushSoftness: (softness: number) => void;
  backgroundSettings: BackgroundSettings;
  onChangeBackground: (settings: BackgroundSettings) => void;
  shadowSettings?: ProductShadowSettings;
  onChangeShadow?: (settings: ProductShadowSettings) => void;
  selectedModel?: string;
  onChangeModel?: (model: string) => void;
  confidenceThreshold?: number;
  onChangeConfidenceThreshold?: (val: number) => void;
}

export const RemoveBackgroundPanel: React.FC<RemoveBackgroundPanelProps> = ({
  isProcessing,
  onRemoveBackground,
  hasRemovedBg,
  refinementEnabled,
  onToggleRefinement,
  brushMode,
  onChangeBrushMode,
  brushSize,
  onChangeBrushSize,
  brushSoftness,
  onChangeBrushSoftness,
  backgroundSettings,
  onChangeBackground,
  shadowSettings,
  onChangeShadow,
  selectedModel = 'ISNet',
  onChangeModel,
  confidenceThreshold = 50,
  onChangeConfidenceThreshold,
}) => {
  const { t } = useLanguage();
  const [catalog,setCatalog] = useState<any[] | null>(null);
  useEffect(()=>{let active=true;api.getPresets().then(data=>{if(active)setCatalog(data.presets);}).catch(()=>{});return()=>{active=false;};},[]);
  const defaultSolidColors = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#0F172A' },
    { name: 'Light Gray', hex: '#E2E8F0' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Green', hex: '#22C55E' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Beige', hex: '#F5E6D3' },
  ];

  const defaultGradients = [
    { name: 'Indigo Dream', css: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
    { name: 'Sunset Glow', css: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
    { name: 'Ocean Breeze', css: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' },
    { name: 'Mint Fresh', css: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
    { name: 'Studio Soft', css: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' },
  ];

  const defaultStudioBackdrops = [
    { name: 'Wood Podium', css: 'linear-gradient(to bottom, #fdf6ec 0%, #faedcd 60%, #d4a373 100%)' },
    { name: 'Luxury Marble', css: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)' },
    { name: 'Industrial Concrete', css: 'linear-gradient(to bottom, #475569 0%, #1e293b 80%, #0f172a 100%)' },
    { name: 'Shopee Peach', css: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fed7aa 100%)' },
    { name: 'Tokopedia Mint', css: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)' },
    { name: 'Dark Spotlight', css: 'radial-gradient(circle at 50% 35%, #334155 0%, #0f172a 100%)' },
  ];

  const solidColors = catalog ? catalog.filter(p=>p.type==='solid').map(p=>({name:p.name,hex:p.value})) : defaultSolidColors;
  const gradients = catalog ? catalog.filter(p=>p.type==='gradient').map(p=>({name:p.name,css:p.value})) : defaultGradients;
  const studioBackdrops = catalog ? catalog.filter(p=>p.type==='studio').map(p=>({name:p.name,css:p.value})) : defaultStudioBackdrops;
  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onChangeBackground({
          mode: 'image',
          imageUrl: reader.result as string,
          blurLevel: backgroundSettings.blurLevel || 0,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Remove Background Button */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('Hapus background', 'Remove Background')}
          </span>
          {hasRemovedBg && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              {t('Diproses AI', 'AI Processed')}
            </span>
          )}
        </div>

        <div className="space-y-2.5 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t('Pilihan Model AI:', 'AI Model Selection:')}
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onChangeModel && onChangeModel(e.target.value)}
              className="w-full text-xs font-medium py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ISNet">⚡ IS-Net DIS5K ({t('Presisi Tinggi - Rekomendasi', 'High Precision - Recommended')})</option>
              <option value="RMBG14">🌟 BRIA RMBG-1.4 ({t('Studio Matting & Anti-Bayangan', 'Studio Matting & Anti-Shadow')})</option>
              <option value="U2NetHumanSeg">👤 U2Net Human Seg ({t('Potret & Orang', 'Portraits & People')})</option>
              <option value="BiRefNet">🧠 BiRefNet General ({t('1024px Swin-Tiny', '1024px Swin-Tiny')})</option>
              <option value="U2Net">🚀 U2Net Standard ({t('Ringan & Cepat', 'Light & Fast')})</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span>{t('Sensitivitas / Threshold:', 'Sensitivity / Threshold:')}</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">{confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={confidenceThreshold}
              onChange={(e) => onChangeConfidenceThreshold && onChangeConfidenceThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>{t('Pertahankan detail', 'Preserve details')}</span>
              <span>{t('Bersihkan bayangan', 'Clean shadows')}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isProcessing}
          onClick={onRemoveBackground}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 active:scale-[0.98] shadow-md shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('Memproses Model AI...', 'Processing AI Model...')}</span>
            </>
          ) : (
            <>
              <Scissors className="w-4 h-4" />
              <span>{t('Hapus background', 'Remove Background')}</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Manual Refinement */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('Perbaikan manual', 'Manual Refinement')}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              aria-label={t('Perbaikan manual', 'Manual Refinement')}
              checked={refinementEnabled}
              onChange={(e) => onToggleRefinement(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {refinementEnabled && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            {/* Eraser vs Restore */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeBrushMode('erase')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  brushMode === 'erase'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>{t('Hapus', 'Eraser')}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeBrushMode('restore')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  brushMode === 'restore'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>{t('Pulihkan', 'Restore')}</span>
              </button>
            </div>

            {/* Brush Size Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>{t('Ukuran Brush', 'Brush Size')}</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">{brushSize}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => onChangeBrushSize(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Softness Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>{t('Kelembutan', 'Softness')}</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">{brushSoftness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={brushSoftness}
                onChange={(e) => onChangeBrushSoftness(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Background Options */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('Pilihan Background', 'Background Options')}
        </div>

        {/* Tab switcher: Transparent vs Solid vs Gradient */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeBackground({ mode: 'transparent' })}
            className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
              backgroundSettings.mode === 'transparent'
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded checkerboard-pattern border border-slate-300 dark:border-slate-600" />
            <span>{t('Transparan', 'Transparent')}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeBackground({ mode: 'solid', color: backgroundSettings.color || '#FFFFFF' })}
            className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
              backgroundSettings.mode === 'solid'
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div
              className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600"
              style={{ backgroundColor: backgroundSettings.color || '#FFFFFF' }}
            />
            <span>{t('Warna Solid', 'Solid Color')}</span>
          </button>
        </div>

        {/* Solid Color Presets */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('Presets & Kustom:', 'Presets & Custom:')}</div>
          <div className="flex flex-wrap items-center gap-2">
            {solidColors.map((sc) => (
              <button
                key={sc.name}
                type="button"
                title={sc.name}
                onClick={() => onChangeBackground({ mode: 'solid', color: sc.hex })}
                className={`w-7 h-7 rounded-lg border transition-all ${
                  backgroundSettings.mode === 'solid' && backgroundSettings.color?.toLowerCase() === sc.hex.toLowerCase()
                    ? 'ring-2 ring-brand-500 ring-offset-2 scale-110'
                    : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                }`}
                style={{ backgroundColor: sc.hex }}
              />
            ))}
            {/* Native Color Picker */}
            <label
              title="Custom Color Picker"
              className="w-7 h-7 rounded-lg border border-dashed border-slate-400 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-brand-500"
            >
              <input
                type="color"
                value={backgroundSettings.color || '#FFFFFF'}
                onChange={(e) => onChangeBackground({ mode: 'solid', color: e.target.value })}
                className="sr-only"
              />
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
            </label>
          </div>
        </div>

        {/* Gradient Swatches */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gradients:</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gradients.map((g) => (
              <button
                key={g.name}
                type="button"
                title={g.name}
                onClick={() => onChangeBackground({ mode: 'gradient', gradient: g.css })}
                className={`h-7 min-w-[44px] rounded-lg border transition-all ${
                  backgroundSettings.mode === 'gradient' && backgroundSettings.gradient === g.css
                    ? 'ring-2 ring-brand-500 ring-offset-2 scale-105'
                    : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                }`}
                style={{ background: g.css }}
              />
            ))}
          </div>
        </div>

        {/* Studio & Podium E-Commerce Swatches */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Studio & Podium E-Commerce:
            </span>
            <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-1.5 py-0.5 rounded">
              Katalog
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {studioBackdrops.map((sb) => (
              <button
                key={sb.name}
                type="button"
                title={sb.name}
                onClick={() => onChangeBackground({ mode: 'gradient', gradient: sb.css })}
                className={`flex flex-col items-center p-1 rounded-xl border transition-all ${
                  backgroundSettings.mode === 'gradient' && backgroundSettings.gradient === sb.css
                    ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-50/50 dark:bg-brand-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div
                  className="w-full h-8 rounded-lg shadow-inner border border-black/10"
                  style={{ background: sb.css }}
                />
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate w-full text-center mt-1">
                  {sb.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Upload "My Photo" & Blur */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all">
            <ImageIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>My Photo</span>
            <input type="file" accept="image/*" onChange={handleCustomBgUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => onChangeBackground({ ...backgroundSettings, mode: 'blur', blurLevel: backgroundSettings.blurLevel ? 0 : 20 })}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
              backgroundSettings.mode === 'blur'
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Blur</span>
          </button>
        </div>

        {backgroundSettings.mode === 'blur' && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Blur Intensity</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{backgroundSettings.blurLevel || 20}px</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              value={backgroundSettings.blurLevel || 20}
              onChange={(e) => onChangeBackground({ ...backgroundSettings, blurLevel: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>
        )}
      </div>

      {/* 4. Realistic Drop & Floor Shadow */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bayangan Produk
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              aria-label="Bayangan produk"
              checked={Boolean(shadowSettings?.enabled)}
              onChange={(e) => {
                if (onChangeShadow) {
                  onChangeShadow({
                    enabled: e.target.checked,
                    type: shadowSettings?.type || 'floor',
                    blur: shadowSettings?.blur ?? 16,
                    opacity: shadowSettings?.opacity ?? 60,
                    offsetX: shadowSettings?.offsetX ?? 0,
                    offsetY: shadowSettings?.offsetY ?? 10,
                    scale: shadowSettings?.scale ?? 100,
                  });
                }
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {shadowSettings?.enabled && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            {/* Type selector: Drop vs Floor vs Reflection */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'floor', label: 'Lantai / Podium' },
                { id: 'drop', label: 'Drop Shadow' },
                { id: 'reflection', label: 'Refleksi' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    onChangeShadow &&
                    onChangeShadow({
                      ...shadowSettings,
                      type: t.id as any,
                    })
                  }
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    shadowSettings.type === t.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Opacity Bayangan</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {shadowSettings.opacity}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={shadowSettings.opacity}
                onChange={(e) =>
                  onChangeShadow &&
                  onChangeShadow({
                    ...shadowSettings,
                    opacity: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Blur Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Blur & Kelembutan</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {shadowSettings.blur}px
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                value={shadowSettings.blur}
                onChange={(e) =>
                  onChangeShadow &&
                  onChangeShadow({
                    ...shadowSettings,
                    blur: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Offset Y Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Posisi Vertikal (Offset Y)</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {shadowSettings.offsetY}px
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                value={shadowSettings.offsetY}
                onChange={(e) =>
                  onChangeShadow &&
                  onChangeShadow({
                    ...shadowSettings,
                    offsetY: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {shadowSettings.type === 'floor' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span>Lebar Bayangan (Scale)</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {shadowSettings.scale || 100}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={shadowSettings.scale || 100}
                  onChange={(e) =>
                    onChangeShadow &&
                    onChangeShadow({
                      ...shadowSettings,
                      scale: Number(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
