import React, { useState, useRef } from 'react';
import { Dialog, toast, useLanguage } from '@pixellift/ui';
import { Camera, Check, UploadCloud, RefreshCw } from 'lucide-react';

interface AvatarPickerModalProps {
  isOpen: boolean;
  currentAvatar?: string | null;
  onClose: () => void;
  onSelectAvatar: (url: string) => Promise<void> | void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  currentAvatar,
  onClose,
  onSelectAvatar,
}) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string>(currentAvatar || PRESET_AVATARS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('Harap pilih file gambar (JPG, PNG, atau WEBP).', 'Please select an image file (JPG, PNG, or WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to 200x200 max to keep DB record super lightweight
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelected(compressedDataUrl);
          toast.success(t('Foto profil kustom berhasil dimuat.', 'Custom profile photo loaded.'));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSelectAvatar(selected);
      toast.success(t('Foto profil berhasil diperbarui.', 'Profile photo updated successfully.'));
      onClose();
    } catch (err: any) {
      toast.error(err.message || t('Gagal menyimpan foto profil.', 'Failed to save profile photo.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      title={t('Ganti Foto Profil (PP)', 'Change Profile Photo')}
      description={t('Pilih dari koleksi avatar studio atau unggah foto Anda sendiri.', 'Choose from studio avatars or upload your own photo.')}
      onClose={() => {
        if (!isSaving) onClose();
      }}
    >
      <div className="space-y-5">
        {/* Preview Container */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div className="relative">
            <img
              src={selected}
              alt="Avatar Preview"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-500/40 shadow-xl transition-all"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-all"
              title={t('Unggah Foto Baru', 'Upload New Photo')}
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('Pratinjau Foto Profil', 'Profile Photo Preview')}
          </span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
        </div>

        {/* Upload Button */}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
          >
            <UploadCloud className="w-4 h-4 text-brand-600" />
            <span>{t('Unggah Foto dari Komputer', 'Upload Photo from Device')}</span>
          </button>
        </div>

        {/* Presets Grid */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            {t('Pilihan Avatar Studio:', 'Studio Avatar Choices:')}
          </label>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_AVATARS.map((url, idx) => {
              const isCurrent = selected === url;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelected(url)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                    isCurrent
                      ? 'border-brand-600 ring-2 ring-brand-500/50 scale-105'
                      : 'border-transparent hover:opacity-80'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-brand-600/30 flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {t('Batal', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('Menyimpan...', 'Saving...')}</span>
              </>
            ) : (
              <span>{t('Terapkan Foto Profil', 'Apply Profile Photo')}</span>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
