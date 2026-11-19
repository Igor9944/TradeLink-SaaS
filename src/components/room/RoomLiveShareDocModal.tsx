// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MODAL DE PARTAGE DE DOCUMENTS EN ROOM LIVE (PROMPT 07)
// Permet de partager à l'écran un document commercial ou logistique certifié
// avec contrôle strict des permissions et diffusion HD dans le flux SFU.
// ============================================================================

import React, { useState } from 'react';
import {
  FileText,
  Truck,
  Receipt,
  FileCheck,
  Check,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Modal, Button, Badge } from '../ui/DesignSystem';

interface RoomLiveShareDocModalProps {
  open: boolean;
  onClose: () => void;
  onSelectDocument: (doc: {
    id: string;
    title: string;
    type: string;
    url?: string;
    previewUrl?: string;
  }) => void;
}

const AUTHORIZED_BUSINESS_DOCUMENTS = [
  {
    id: 'doc-cmr-9901',
    title: 'Lettre de Voiture Internationale e-CMR #CMR-2026-9901',
    type: 'TRANSPORT',
    description: 'Protocole de transit maritime et routier Tanger Med - Marseille sous Incoterm CIP.',
    status: 'SCELLÉ DOUANE',
    badgeVariant: 'orange' as const,
  },
  {
    id: 'doc-fac-0042',
    title: 'Facture Commerciale Pro-Forma #FAC-2026-0042',
    type: 'FINANCE',
    description: 'Montant total 48 500.00 EUR avec clause de séquestre bancaire Stripe Escrow.',
    status: 'VALIDE',
    badgeVariant: 'success' as const,
  },
  {
    id: 'doc-dev-1029',
    title: 'Offre Commerciale / Devis Négocié #DEV-2026-1029',
    type: 'COMMERCIAL',
    description: 'Bordereau des prix unitaires révisé avec remise quantitative de 5.0%.',
    status: 'EN NÉGOCIATION',
    badgeVariant: 'info' as const,
  },
  {
    id: 'doc-gdp-2026',
    title: 'Certificat Thermique ATP / GDP #GDP-2026-CMN',
    type: 'COMPLIANCE',
    description: 'Rapport télémétrique de la sonde active (+2.0°C à +6.0°C) vérifié sans rupture.',
    status: 'CONFORME',
    badgeVariant: 'success' as const,
  },
];

export const RoomLiveShareDocModal: React.FC<RoomLiveShareDocModalProps> = ({
  open,
  onClose,
  onSelectDocument,
}) => {
  const { locale } = useApp();
  const [selectedId, setSelectedId] = useState<string>(AUTHORIZED_BUSINESS_DOCUMENTS[0].id);

  const t = (fr: string, en: string, ar: string) => {
    if (locale === 'ar') return ar;
    if (locale === 'en') return en;
    return fr;
  };

  const handleConfirm = () => {
    const doc = AUTHORIZED_BUSINESS_DOCUMENTS.find((d) => d.id === selectedId);
    if (doc) {
      onSelectDocument(doc);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Partager un Document Commercial en Séance', 'Share Business Document in Meeting', 'مشاركة وثيقة تجارية في الجلسة')}
    >
      <div className="space-y-4 text-xs">
        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-200">
          <p className="leading-relaxed">
            {t(
              'Sélectionnez un document officiel préalablement certifié dans votre espace TRADELINK pour le diffuser en haute définition (1080p) aux participants.',
              'Select an officially verified document to broadcast in 1080p HD to meeting participants.',
              'حدد وثيقة رسمية معتمدة من حسابك لبثها بدقة عالية (1080p) لجميع المشاركين.'
            )}
          </p>
        </div>

        <div className="space-y-2">
          {AUTHORIZED_BUSINESS_DOCUMENTS.map((doc) => {
            const isSelected = doc.id === selectedId;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#E85D22] bg-orange-500/10 dark:bg-orange-500/20'
                    : 'border-slate-200 dark:border-teal-800 hover:border-teal-600 bg-white dark:bg-[#071E22]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {doc.type === 'TRANSPORT' && <Truck className="w-4 h-4 text-orange-500" />}
                    {doc.type === 'FINANCE' && <Receipt className="w-4 h-4 text-emerald-500" />}
                    {doc.type === 'COMMERCIAL' && <FileText className="w-4 h-4 text-blue-500" />}
                    {doc.type === 'COMPLIANCE' && <FileCheck className="w-4 h-4 text-teal-500" />}
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{doc.title}</span>
                  </div>
                  <Badge variant={doc.badgeVariant}>{doc.status}</Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 ps-6">
                  {doc.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-teal-800">
          <Button variant="secondary" onClick={onClose}>
            {t('Annuler', 'Cancel', 'إلغاء')}
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            <Check className="w-4 h-4" />
            {t('Diffuser ce Document à l’Écran', 'Broadcast Document', 'بث الوثيقة على الشاشة')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
