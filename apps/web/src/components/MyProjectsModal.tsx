import React from 'react';
import { Dialog, useLanguage } from '@pixellift/ui';
import { ProjectLibrary } from './ProjectLibrary';
import { LocalProject } from '../services/indexedDb';

export function MyProjectsModal({ isOpen, onClose, onLoadProject }: { isOpen: boolean; onClose: () => void; onLoadProject: (project: LocalProject) => void }) {
  const { t } = useLanguage();
  if (!isOpen) return null;
  return (
    <Dialog
      wide
      title={t('Proyek Saya', 'My Projects')}
      description={t('Proyek tersimpan di browser ini, terpisah untuk setiap akun.', 'Projects saved in this browser, isolated for each account.')}
      onClose={onClose}
    >
      <ProjectLibrary onLoadProject={p => { onLoadProject(p); onClose(); }} />
    </Dialog>
  );
}
