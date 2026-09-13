import { api } from '../services/api';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@pixellift/ui';
import {
  PhotoBasicSettings,
  PhotoColorSettings,
  PhotoDetailSettings,
  PhotoTransformSettings,
  WatermarkSettings,
} from '@pixellift/types';
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  Sparkles,
  Type,
  Image as ImageIcon,
  Shield,
} from 'lucide-react';

interface PhotoEditorSlidersProps {
  basic: PhotoBasicSettings;
  color: PhotoColorSettings;
  detail: PhotoDetailSettings;
  transform: PhotoTransformSettings;
  activeFilter?: string | null;
  watermarkSettings?: WatermarkSettings;
  onChangeBasic: (basic: PhotoBasicSettings) => void;
  onChangeColor: (color: PhotoColorSettings) => void;
  onChangeDetail: (detail: PhotoDetailSettings) => void;
  onChangeTransform: (transform: PhotoTransformSettings) => void;
  onChangeWatermark?: (settings: WatermarkSettings) => void;
  onApplyFilter: (name: string) => void;
  onApplyCustomFilter?: (settings: any, name: string) => void;
  onResetSection: (section: 'basic' | 'color' | 'detail' | 'transform' | 'all') => void;
}

export const PhotoEditorSliders: React.FC<PhotoEditorSlidersProps> = ({
  basic,
  color,
  detail,
  transform,
  activeFilter,
  watermarkSettings,
  onChangeBasic,
  onChangeColor,
  onChangeDetail,
  onChangeTransform,
  onChangeWatermark,
  onApplyFilter,
  onApplyCustomFilter,
  onResetSection,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'basic' | 'color' | 'detail' | 'transform' | 'watermark'>('basic');

  const [catalog,setCatalog] = useState<any[] | null>(null);
  useEffect(()=>{let active=true;api.getPresets().then(data=>{if(active)setCatalog(data.filters);}).catch(()=>{});return()=>{active=false;};},[]);
  const defaultFilters = [
    { name: 'Natural', thumb: '/demo-portrait.jpg' },
    { name: 'Bright', thumb: '/demo-portrait.jpg' },
    { name: 'Warm', thumb: '/demo-portrait.jpg' },
    { name: 'Cool', thumb: '/demo-portrait.jpg' },
    { name: 'Film', thumb: '/demo-portrait.jpg' },
    { name: 'Mono', thumb: '/demo-portrait.jpg' },
    { name: 'Vintage', thumb: '/demo-portrait.jpg' },
  ];

  const filters = catalog ? catalog.map(f=>({...f,thumb:f.previewUrl || defaultFilters.find(p=>p.name===f.name)?.thumb || defaultFilters[0].thumb})) : defaultFilters;
  const aspectRatios = ['Original', '1:1', '4:5', '3:4', '9:16', '16:9'];

  const handleAutoEnhance = () => {
    onChangeBasic({
      ...basic,
      brightness: 8,
      contrast: 14,
      highlights: -6,
      shadows: 10,
      exposure: 4,
    });
    onChangeColor({
      ...color,
      vibrance: 16,
      saturation: 8,
    });
    onChangeDetail({
      ...detail,
      sharpness: 35,
      clarity: 15,
    });
  };

  const renderSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (val: number) => void
  ) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
      />
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Title & Section Reset & AI Auto-Enhance */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('Editor Foto', 'Photo Editor')}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoEnhance}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-sm shadow-brand-500/25 active:scale-95 transition-all"
            title={t('Terapkan preset warna & ketajaman otomatis', 'Apply auto color & sharpness presets')}
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto Enhance</span>
          </button>
          <button
            type="button"
            onClick={() => onResetSection(activeTab === 'watermark' ? 'all' : activeTab)}
            title={`Reset ${activeTab}`}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 text-xs font-semibold overflow-x-auto">
        {(['basic', 'color', 'detail', 'transform', 'watermark'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 px-2 rounded-lg capitalize whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab === 'basic'
              ? t('Dasar', 'Basic')
              : tab === 'color'
              ? t('Warna', 'Color')
              : tab === 'detail'
              ? t('Detail', 'Detail')
              : tab === 'transform'
              ? t('Transformasi', 'Transform')
              : 'Watermark'}
          </button>
        ))}
      </div>

      {/* Basic Panel */}
      {activeTab === 'basic' && (
        <div className="space-y-3 animate-fadeIn">
          {renderSlider(t('Exposure', 'Exposure'), basic.exposure, -100, 100, (v) => onChangeBasic({ ...basic, exposure: v }))}
          {renderSlider(t('Kecerahan (Brightness)', 'Brightness'), basic.brightness, -100, 100, (v) => onChangeBasic({ ...basic, brightness: v }))}
          {renderSlider(t('Kontras (Contrast)', 'Contrast'), basic.contrast, -100, 100, (v) => onChangeBasic({ ...basic, contrast: v }))}
          {renderSlider(t('Highlights', 'Highlights'), basic.highlights, -100, 100, (v) => onChangeBasic({ ...basic, highlights: v }))}
          {renderSlider(t('Bayangan (Shadows)', 'Shadows'), basic.shadows, -100, 100, (v) => onChangeBasic({ ...basic, shadows: v }))}
          {renderSlider(t('Whites', 'Whites'), basic.whites, -100, 100, (v) => onChangeBasic({ ...basic, whites: v }))}
          {renderSlider(t('Blacks', 'Blacks'), basic.blacks, -100, 100, (v) => onChangeBasic({ ...basic, blacks: v }))}
        </div>
      )}

      {/* Color Panel */}
      {activeTab === 'color' && (
        <div className="space-y-3 animate-fadeIn">
          {renderSlider(t('Suhu (Temperature)', 'Temperature (Kelvin)'), color.temperature, -100, 100, (v) => onChangeColor({ ...color, temperature: v }))}
          {renderSlider(t('Tint', 'Tint'), color.tint, -100, 100, (v) => onChangeColor({ ...color, tint: v }))}
          {renderSlider(t('Saturasi (Saturation)', 'Saturation'), color.saturation, -100, 100, (v) => onChangeColor({ ...color, saturation: v }))}
          {renderSlider(t('Vibrance', 'Vibrance'), color.vibrance, -100, 100, (v) => onChangeColor({ ...color, vibrance: v }))}
          {renderSlider(t('Hue', 'Hue'), color.hue, -180, 180, (v) => onChangeColor({ ...color, hue: v }))}
        </div>
      )}

      {/* Detail Panel */}
      {activeTab === 'detail' && (
        <div className="space-y-3 animate-fadeIn">
          {renderSlider(t('Ketajaman (Sharpness)', 'Sharpness'), detail.sharpness, 0, 100, (v) => onChangeDetail({ ...detail, sharpness: v }))}
          {renderSlider(t('Kejelasan (Clarity)', 'Clarity'), detail.clarity, -100, 100, (v) => onChangeDetail({ ...detail, clarity: v }))}
          {renderSlider(t('Blur', 'Blur'), detail.blur, 0, 100, (v) => onChangeDetail({ ...detail, blur: v }))}
          {renderSlider(t('Grain', 'Grain'), detail.grain, 0, 100, (v) => onChangeDetail({ ...detail, grain: v }))}
          {renderSlider(t('Vignette', 'Vignette'), detail.vignette, 0, 100, (v) => onChangeDetail({ ...detail, vignette: v }))}
        </div>
      )}

        {/* Transform Panel */}
      {activeTab === 'transform' && (
        <div className="space-y-3.5 animate-fadeIn">
          {/* Marketplace & Sosmed 1-Click Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t('Preset Marketplace & Sosmed:', 'Marketplace & Social Presets:')}
              </span>
              <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-1.5 py-0.5 rounded">
                Auto-Fit
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Shopee / Tokped', ratio: '1:1', tag: '1:1 Square' },
                { name: 'Instagram Feed', ratio: '4:5', tag: '4:5 Feed' },
                { name: 'Story / TikTok', ratio: '9:16', tag: '9:16 Story' },
                { name: 'Banner Toko', ratio: '16:9', tag: '16:9 Banner' },
              ].map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => onChangeTransform({ ...transform, aspectRatio: m.ratio })}
                  className={`flex flex-col p-2 rounded-xl text-left border transition-all ${
                    transform.aspectRatio === m.ratio
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-1 ring-brand-500/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[11px] font-bold truncate">{m.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{m.tag}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('Rasio Kustom:', 'Custom Ratio:')}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onChangeTransform({ ...transform, aspectRatio: ratio })}
                className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all ${
                  transform.aspectRatio === ratio
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {ratio === 'Original' ? t('Asli', 'Original') : ratio}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('Rotasi & Balik (Flip):', 'Rotate & Flip:')}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChangeTransform({ ...transform, rotate: (transform.rotate + 90) % 360 })}
              className="flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>90°</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTransform({ ...transform, flipHorizontal: !transform.flipHorizontal })}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                transform.flipHorizontal
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Flip H</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTransform({ ...transform, flipVertical: !transform.flipVertical })}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                transform.flipVertical
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FlipVertical className="w-3.5 h-3.5" />
              <span>Flip V</span>
            </button>
          </div>
        </div>
      )}

      {/* Watermark & Logo Toko Panel */}
      {activeTab === 'watermark' && (
        <div className="space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('Watermark & Logo Toko', 'Watermark & Brand Logo')}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label={t('Aktifkan watermark', 'Enable watermark')}
                checked={Boolean(watermarkSettings?.enabled)}
                onChange={(e) => {
                  if (onChangeWatermark) {
                    onChangeWatermark({
                      enabled: e.target.checked,
                      type: watermarkSettings?.type || 'text',
                      text: watermarkSettings?.text || (language === 'en' ? '© My Brand' : '© Toko Saya'),
                      logoUrl: watermarkSettings?.logoUrl,
                      opacity: watermarkSettings?.opacity ?? 75,
                      size: watermarkSettings?.size ?? 50,
                      position: watermarkSettings?.position || 'bottom-right',
                      color: watermarkSettings?.color || '#FFFFFF',
                    });
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {watermarkSettings?.enabled && (
            <div className="space-y-3 pt-1">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeWatermark &&
                    onChangeWatermark({
                      ...watermarkSettings,
                      type: 'text',
                    })
                  }
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    watermarkSettings.type === 'text'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>{t('Teks', 'Text')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeWatermark &&
                    onChangeWatermark({
                      ...watermarkSettings,
                      type: 'image',
                    })
                  }
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    watermarkSettings.type === 'image'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t('Logo Gambar', 'Image Logo')}</span>
                </button>
              </div>

              {/* Text Input & Color */}
              {watermarkSettings.type === 'text' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('Masukkan nama toko / teks...', 'Enter brand name / text...')}
                      value={watermarkSettings.text || ''}
                      onChange={(e) =>
                        onChangeWatermark &&
                        onChangeWatermark({
                          ...watermarkSettings,
                          text: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <label
                      title={t('Warna Teks', 'Text Color')}
                      className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                      style={{ backgroundColor: watermarkSettings.color || '#FFFFFF' }}
                    >
                      <input
                        type="color"
                        value={watermarkSettings.color || '#FFFFFF'}
                        onChange={(e) =>
                          onChangeWatermark &&
                          onChangeWatermark({
                            ...watermarkSettings,
                            color: e.target.value,
                          })
                        }
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* Logo Upload */
                <div className="space-y-1">
                  <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all">
                    <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                    <span className="truncate">
                      {watermarkSettings.logoUrl
                        ? t('Ganti File Logo Toko', 'Change Brand Logo')
                        : t('Upload Logo PNG (Transparan)', 'Upload PNG Logo (Transparent)')}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (onChangeWatermark) {
                              onChangeWatermark({
                                ...watermarkSettings,
                                logoUrl: reader.result as string,
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Opacity Slider */}
              {renderSlider(t('Transparansi / Opacity', 'Opacity'), watermarkSettings.opacity, 10, 100, (v) =>
                onChangeWatermark && onChangeWatermark({ ...watermarkSettings, opacity: v })
              )}

              {/* Size Slider */}
              {renderSlider(t('Ukuran Watermark', 'Watermark Size'), watermarkSettings.size ?? watermarkSettings.scale ?? 50, 15, 100, (v) =>
                onChangeWatermark && onChangeWatermark({ ...watermarkSettings, size: v, scale: v })
              )}

              {/* 9-Point Grid Position Selector */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span>{t('Posisi Watermark (9-Grid):', 'Watermark Position (9-Grid):')}</span>
                  <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-semibold">{watermarkSettings.position}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 w-36 mx-auto bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  {[
                    'top-left', 'top-center', 'top-right',
                    'center-left', 'center', 'center-right',
                    'bottom-left', 'bottom-center', 'bottom-right'
                  ].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      title={pos}
                      onClick={() =>
                        onChangeWatermark &&
                        onChangeWatermark({
                          ...watermarkSettings,
                          position: pos as any,
                        })
                      }
                      className={`h-7 rounded-lg border transition-all ${
                        watermarkSettings.position === pos
                          ? 'bg-brand-600 border-brand-700 ring-2 ring-brand-500/40 text-white font-bold'
                          : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preset Filters Row */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('Filter Preset', 'Filter Presets')}
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => 'settings' in f && onApplyCustomFilter ? onApplyCustomFilter(f.settings,f.name) : onApplyFilter(f.name)}
              className="flex flex-col items-center gap-1 group focus:outline-none min-w-[56px]"
            >
              <div
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                  activeFilter === f.name
                    ? 'border-brand-600 ring-2 ring-brand-500/40 scale-105'
                    : 'border-slate-200 dark:border-slate-800 group-hover:border-brand-400'
                }`}
              >
                <img src={f.thumb} alt={f.name} className="w-full h-full object-cover" />
              </div>
              <span
                className={`text-[10px] font-semibold truncate ${
                  activeFilter === f.name ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {f.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
