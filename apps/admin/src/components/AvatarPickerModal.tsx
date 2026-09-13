import React, { useState, useRef } from 'react';
import { Dialog, toast } from '@pixellift/ui';
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
  const [selected, setSelected] = useState<string>(currentAvatar || PRESET_AVATARS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
          toast.success('Foto profil admin kustom berhasil dimuat.');
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
      toast.success('Foto profil admin berhasil diperbarui.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan foto profil admin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      title="Ganti Foto Profil Admin (PP)"
      description="Pilih avatar representatif atau unggah foto Anda."
      onClose={() => {
        if (!isSaving) onClose();
      }}
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div className="relative">
            <img
              src={selected}
              alt="Admin Avatar Preview"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-500/40 shadow-xl transition-all"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all"
              title="Unggah Foto Baru"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Pratinjau Foto Profil Admin</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Unggah Foto dari Komputer</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Pilihan Avatar Studio:
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
                      ? 'border-indigo-600 ring-2 ring-indigo-500/50 scale-105'
                      : 'border-transparent hover:opacity-80'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Terapkan Foto Profil</span>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
