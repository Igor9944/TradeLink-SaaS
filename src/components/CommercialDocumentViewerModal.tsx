// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — COMPOSANT DE VISUALISATION ET GESTION DES DOCUMENTS COMMERCIAUX
// Prévisualisation trilingue (FR/EN/AR), Scellement SHA-256, Téléchargement PDF %PDF-1.4,
// Liens temporaires présignés (900s), Vérification d'intégrité et Émission d'Avoirs
// ============================================================================

import React, { useState } from 'react';
import {
  Download,
  Share2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Globe,
  Building,
  Truck,
  Hash,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CommercialDocumentRecord, Locale } from '../types';
import { Button, Badge, Modal } from './ui/DesignSystem';
import { TAX_JURISDICTIONS } from '../services/billingDocumentEngine';

interface Props {
  document: CommercialDocumentRecord | null;
  onClose: () => void;
}

export const CommercialDocumentViewerModal: React.FC<Props> = ({ document: doc, onClose }) => {
  const {
    locale: appLocale,
    currentUser,
    downloadCommercialDocumentPdfAction,
    generateDocumentDownloadLinkAction,
    verifyDocumentSealAction,
    createCreditNoteAction,
    notifyToast,
  } = useApp();

  const [displayLocale, setDisplayLocale] = useState<Locale>(appLocale || 'fr');
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    isAuthentic: boolean;
    hash: string;
  } | null>(null);

  // État de la modal d'émission d'avoir
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [creditReason, setCreditReason] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  if (!doc) return null;

  const jurisdictionConfig = TAX_JURISDICTIONS[doc.jurisdiction] || TAX_JURISDICTIONS.FR_UE;
  const isRtl = displayLocale === 'ar';

  const docTypeLabels: Record<string, Record<Locale, string>> = {
    QUOTE: { fr: 'DEVIS COMMERCIAL', en: 'COMMERCIAL QUOTE', ar: 'عرض سعر تجاري' },
    PURCHASE_ORDER: { fr: 'BON DE COMMANDE', en: 'PURCHASE ORDER', ar: 'أمر شراء' },
    ORDER_CONFIRMATION: { fr: 'CONFIRMATION DE COMMANDE', en: 'ORDER CONFIRMATION', ar: 'تأكيد الطلب' },
    COMMERCIAL_INVOICE: { fr: 'FACTURE COMMERCIALE', en: 'COMMERCIAL INVOICE', ar: 'فاتورة تجارية' },
    CREDIT_NOTE: { fr: 'FACTURE D’AVOIR / RECTIFICATION', en: 'CREDIT NOTE', ar: 'إشعار دائن / فاتورة تسوية' },
    PAYMENT_RECEIPT: { fr: 'REÇU DE RÈGLEMENT', en: 'PAYMENT RECEIPT', ar: 'إيصال دفع' },
    DELIVERY_NOTE: { fr: 'BON DE LIVRAISON', en: 'DELIVERY NOTE', ar: 'إشعار تسليم' },
    TRANSPORT_DOCUMENT: { fr: 'DOCUMENT DE TRANSPORT e-CMR', en: 'e-CMR TRANSPORT DOCUMENT', ar: 'وثيقة نقل دولية e-CMR' },
  };

  const currentTypeLabel = docTypeLabels[doc.documentType]?.[displayLocale] || doc.documentType;

  const handleDownloadPdf = () => {
    downloadCommercialDocumentPdfAction(doc.id, displayLocale);
  };

  const handleCopyLink = () => {
    const res = generateDocumentDownloadLinkAction(doc.id);
    if (res.ok && res.url) {
      navigator.clipboard.writeText(res.url);
      notifyToast(`Lien temporaire (15 min) copié dans le presse-papier !`, 'success');
    } else {
      notifyToast('Impossible de générer le lien de téléchargement', 'error');
    }
  };

  const handleVerifySeal = () => {
    const res = verifyDocumentSealAction(doc.id);
    setVerificationResult({
      tested: true,
      isAuthentic: res.isAuthentic,
      hash: res.storedHash,
    });
    if (res.isAuthentic) {
      notifyToast('Sceau cryptographique SHA-256 certifié intègre !', 'success');
    } else {
      notifyToast('ALERTE : Altération ou non-conformité du sceau détectée !', 'error');
    }
  };

  const handleEmitCreditNote = () => {
    if (!creditReason.trim()) {
      notifyToast('Veuillez spécifier le motif commercial ou légal de l’avoir.', 'warning');
      return;
    }
    setIsSubmittingCredit(true);
    const res = createCreditNoteAction(doc.id, creditReason);
    setIsSubmittingCredit(false);
    if (res.ok) {
      setShowCreditNoteModal(false);
      setCreditReason('');
      onClose();
    }
  };

  const canEmitCreditNote =
    doc.documentType === 'COMMERCIAL_INVOICE' &&
    doc.status !== 'CANCELLED' &&
    (currentUser.role === 'ADMIN' || currentUser.role === 'FOURNISSEUR');

  return (
    <>
      <Modal
        open={true}
        onClose={onClose}
        title={`${currentTypeLabel} — ${doc.documentNumber}`}
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-6 text-slate-800 dark:text-slate-100">
          {/* BARRE D'OUTILS SUPÉRIEURE */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800/70">
            {/* SÉLECTEUR DE LANGUE INFORMATIVE */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Vue informative :
              </span>
              <div className="inline-flex rounded-xl bg-white dark:bg-[#0E3A3F] p-0.5 border border-slate-200 dark:border-teal-700/60 text-xs">
                {(['fr', 'en', 'ar'] as Locale[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setDisplayLocale(l)}
                    className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
                      displayLocale === l
                        ? 'bg-[#E85D22] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTIONS DOCUMENT */}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleVerifySeal}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Vérifier Sceau SHA-256
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCopyLink}>
                <Share2 className="w-3.5 h-3.5 text-sky-600" />
                Lien 15 min
              </Button>
              <Button size="sm" variant="primary" onClick={handleDownloadPdf}>
                <Download className="w-3.5 h-3.5" />
                Télécharger PDF (%PDF-1.4)
              </Button>
              {canEmitCreditNote && (
                <Button size="sm" variant="danger" onClick={() => setShowCreditNoteModal(true)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Émettre un Avoir
                </Button>
              )}
            </div>
          </div>

          {/* RÉSULTAT DE VÉRIFICATION DU SCEAU */}
          {verificationResult && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                verificationResult.isAuthentic
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {verificationResult.isAuthentic ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold">
                    {verificationResult.isAuthentic
                      ? 'Sceau cryptographique SHA-256 valide et non altéré'
                      : 'Attention : discordance cryptographique détectée !'}
                  </span>
                  <p className="font-mono text-[10px] opacity-80 truncate max-w-xl">
                    Empreinte numérique : {verificationResult.hash}
                  </p>
                </div>
              </div>
              <Badge variant={verificationResult.isAuthentic ? 'success' : 'danger'}>
                {verificationResult.isAuthentic ? 'CERTIFIÉ CONFORME' : 'ALTÉRÉ'}
              </Badge>
            </div>
          )}

          {/* VUE PAPIER DU DOCUMENT */}
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="p-6 md:p-8 rounded-2xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 shadow-md space-y-6 text-xs"
          >
            {/* EN-TÊTE DU DOCUMENT */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-teal-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl tracking-wider text-[#0B3438] dark:text-teal-400">
                    TRADELINK
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                    B2B CLOUD
                  </span>
                </div>
                <h2 className="text-lg font-black text-[#E85D22]">{currentTypeLabel}</h2>
                <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                  <Hash className="w-3.5 h-3.5" />
                  <strong className="text-slate-800 dark:text-slate-100">{doc.documentNumber}</strong>
                  <span>• Version v{doc.version}</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <Badge
                  variant={
                    doc.status === 'PAID'
                      ? 'success'
                      : doc.status === 'CANCELLED'
                      ? 'danger'
                      : doc.status === 'ISSUED'
                      ? 'info'
                      : 'neutral'
                  }
                >
                  {doc.status}
                </Badge>
                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                  <p>
                    Date d’émission : <strong className="font-mono text-slate-700 dark:text-slate-200">{doc.issuedAt.slice(0, 10)}</strong>
                  </p>
                  {doc.dueAt && (
                    <p>
                      Échéance : <strong className="font-mono text-slate-700 dark:text-slate-200">{doc.dueAt.slice(0, 10)}</strong>
                    </p>
                  )}
                  {doc.orderNumber && (
                    <p>
                      Réf. Commande : <strong className="font-mono text-slate-700 dark:text-slate-200">{doc.orderNumber}</strong>
                    </p>
                  )}
                  {doc.originalInvoiceNumber && (
                    <p className="text-[#E85D22] font-semibold">
                      Avoir sur facture : {doc.originalInvoiceNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* PARTIES : ÉMETTEUR & DESTINATAIRE */}
            <div className="grid md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 dark:bg-[#0B3438]/40 border border-slate-200 dark:border-teal-800/60">
              {/* ÉMETTEUR */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  Émetteur / Vendeur
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {doc.issuer.companyName}
                </p>
                {doc.issuer.legalForm && <p className="text-slate-500">{doc.issuer.legalForm}</p>}
                <p className="text-slate-600 dark:text-slate-300">
                  {doc.issuer.address}, {doc.issuer.postalCode} {doc.issuer.city} ({doc.issuer.country})
                </p>
                {doc.issuer.taxId && (
                  <p className="font-mono text-[11px]">
                    Identifiant Fiscal : <strong>{doc.issuer.taxId}</strong>
                  </p>
                )}
                {doc.issuer.registrationNumber && (
                  <p className="font-mono text-[11px] text-slate-500">
                    Immatriculation : {doc.issuer.registrationNumber}
                  </p>
                )}
              </div>

              {/* DESTINATAIRE */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E85D22] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  Destinataire / Acheteur
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {doc.recipient.companyName}
                </p>
                {doc.recipient.legalForm && <p className="text-slate-500">{doc.recipient.legalForm}</p>}
                <p className="text-slate-600 dark:text-slate-300">
                  {doc.recipient.address}, {doc.recipient.postalCode} {doc.recipient.city} ({doc.recipient.country})
                </p>
                {doc.recipient.taxId && (
                  <p className="font-mono text-[11px]">
                    Identifiant Fiscal : <strong>{doc.recipient.taxId}</strong>
                  </p>
                )}
                {doc.recipient.registrationNumber && (
                  <p className="font-mono text-[11px] text-slate-500">
                    Immatriculation : {doc.recipient.registrationNumber}
                  </p>
                )}
              </div>
            </div>

            {/* DÉTAILS DU TRANSPORT SI APPLICABLE */}
            {doc.transportDetails && (
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                  <Truck className="w-3.5 h-3.5" />
                  Renseignements de Transport & Chaîne du Froid
                </div>
                <div className="grid sm:grid-cols-3 gap-2 text-slate-600 dark:text-slate-300">
                  <p>Véhicule : <strong className="font-mono">{doc.transportDetails.licensePlate}</strong></p>
                  <p>Chauffeur : <strong>{doc.transportDetails.driverName}</strong></p>
                  {doc.transportDetails.cmrNumber && (
                    <p>Lettre e-CMR : <strong className="font-mono">{doc.transportDetails.cmrNumber}</strong></p>
                  )}
                  {doc.transportDetails.targetTemperatureRange && (
                    <p>Température consignée : <strong className="font-mono text-cyan-600">{doc.transportDetails.targetTemperatureRange}</strong></p>
                  )}
                </div>
              </div>
            )}

            {/* MOTIF DE L'AVOIR SI APPLICABLE */}
            {doc.creditNoteReason && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200">
                <strong>Motif de l’Avoir / Rectification :</strong> {doc.creditNoteReason}
              </div>
            )}

            {/* TABLEAU DES LIGNES DU DOCUMENT */}
            <div className="overflow-x-auto border border-slate-200 dark:border-teal-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#0B3438] text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-teal-800">
                  <tr>
                    <th className="py-2.5 px-3">Réf / SKU</th>
                    <th className="py-2.5 px-3">Désignation</th>
                    <th className="py-2.5 px-3 text-right">Qté</th>
                    <th className="py-2.5 px-3 text-right">P.U. HT</th>
                    <th className="py-2.5 px-3 text-right">Remise</th>
                    <th className="py-2.5 px-3 text-right">Taux TVA</th>
                    <th className="py-2.5 px-3 text-right">Total Net HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-teal-800/40 font-mono">
                  {doc.lines.map((line, idx) => {
                    const desc = line.description[displayLocale] || line.description.fr;
                    return (
                      <tr key={line.id || idx} className="hover:bg-slate-50 dark:hover:bg-[#0E3A3F]/50">
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{line.sku}</td>
                        <td className="py-2 px-3 font-sans">{desc}</td>
                        <td className="py-2 px-3 text-right">{line.quantity} {line.unit}</td>
                        <td className="py-2 px-3 text-right">{line.unitPrice}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{line.discountPct || '0.00'}%</td>
                        <td className="py-2 px-3 text-right">{line.taxRatePct}%</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {line.totalLineHt} {doc.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* DÉCOMPTE FISCAL ET TOTAUX DÉTERMINISTES */}
            <div className="grid md:grid-cols-2 gap-6 items-start pt-2">
              {/* CONDITIONS ET MENTIONS LÉGALES */}
              <div className="space-y-3 text-[11px] text-slate-500 dark:text-slate-400">
                <div>
                  <strong className="text-slate-700 dark:text-slate-200 block mb-1">
                    Conditions de Paiement & Pénalités :
                  </strong>
                  <p>{doc.paymentTerms[displayLocale] || doc.paymentTerms.fr}</p>
                  <p>{doc.latePaymentPenalties[displayLocale] || doc.latePaymentPenalties.fr}</p>
                </div>
                <div>
                  <strong className="text-slate-700 dark:text-slate-200 block mb-1">
                    Mentions Obligatoires ({jurisdictionConfig.name[displayLocale] || jurisdictionConfig.name.fr}) :
                  </strong>
                  <p className="italic">{doc.legalNotice[displayLocale] || doc.legalNotice.fr}</p>
                </div>
              </div>

              {/* BLOC DES TOTAUX DÉTERMINISTES */}
              <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 dark:bg-[#0B3438]/50 border border-slate-200 dark:border-teal-800 font-mono text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Sous-total HT Brut :</span>
                  <span>{doc.subtotalHt} {doc.currency}</span>
                </div>
                {parseFloat(doc.totalDiscountAmount) > 0 && (
                  <div className="flex justify-between py-0.5 text-[#E85D22]">
                    <span>Remises accordées :</span>
                    <span>- {doc.totalDiscountAmount} {doc.currency}</span>
                  </div>
                )}
                <div className="flex justify-between py-0.5 font-bold">
                  <span>Net Commercial HT :</span>
                  <span>{doc.netCommercialHt} {doc.currency}</span>
                </div>
                {parseFloat(doc.shippingAmount) > 0 && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Frais de transport / Fret :</span>
                    <span>{doc.shippingAmount} {doc.currency}</span>
                  </div>
                )}

                {/* DÉCOMPOSITION TVA */}
                <div className="pt-2 border-t border-slate-200 dark:border-teal-800 space-y-1">
                  {doc.taxBreakdown.map((tx, i) => (
                    <div key={i} className="flex justify-between text-[11px] text-slate-500">
                      <span>TVA ({tx.ratePct}%) sur base {tx.taxableBase} :</span>
                      <span>{tx.taxAmount} {doc.currency}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-1">
                    <span>Total Taxes :</span>
                    <span>{doc.totalTaxAmount} {doc.currency}</span>
                  </div>
                </div>

                {doc.fiscalStampAmount && parseFloat(doc.fiscalStampAmount) > 0 && (
                  <div className="flex justify-between text-teal-600 dark:text-teal-400 pt-1">
                    <span>Droit de Timbre Fiscal (TN) :</span>
                    <span>{doc.fiscalStampAmount} {doc.currency}</span>
                  </div>
                )}

                {/* TOTAL TTC FINAL */}
                <div className="flex justify-between items-baseline pt-3 border-t-2 border-slate-300 dark:border-teal-700 text-sm font-black text-[#E85D22]">
                  <span>TOTAL TTC À RÉGLER :</span>
                  <span className="text-base">{doc.totalTtc} {doc.currency}</span>
                </div>

                {/* MONTANT EN TOUTES LETTRES */}
                <div className="pt-2 font-sans italic text-[11px] text-slate-500 dark:text-slate-400">
                  Arrêté la présente à la somme de :<br />
                  <strong className="font-semibold text-slate-700 dark:text-slate-200">
                    {doc.amountInWords[displayLocale] || doc.amountInWords.fr}
                  </strong>
                </div>
              </div>
            </div>

            {/* SCEAU CRYPTOGRAPHIQUE SHA-256 */}
            <div className="pt-4 border-t border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Sceau d'intégrité SHA-256 : <strong className="text-slate-700 dark:text-slate-300">{doc.digitalSealSha256}</strong>
                </span>
              </div>
              <div className="text-right">
                <span>Émis par TRADELINK Engine • Inviolabilité certifiée</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* SOUS-MODAL : ÉMISSION D'AVOIR / RECTIFICATION FISCALE */}
      {showCreditNoteModal && (
        <Modal
          open={true}
          onClose={() => setShowCreditNoteModal(false)}
          title={`Émettre un Avoir sur la facture ${doc.documentNumber}`}
          maxWidthClass="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200">
              <strong>Règle d'inviolabilité fiscale :</strong>
              <p className="mt-1">
                La facture émise ne peut être modifiée ni supprimée. L'émission d'un avoir officiel est
                l'unique procédure légale d'annulation totale ou partielle de la créance.
              </p>
            </div>

            <div>
              <label className="block font-bold mb-1">Motif commercial ou légal de l'avoir *</label>
              <textarea
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Ex : Annulation de commande pour rupture fournisseur, litige transport, geste commercial..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#071E22] text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => setShowCreditNoteModal(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={isSubmittingCredit}
                onClick={handleEmitCreditNote}
              >
                Confirmer l'Émission de l'Avoir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
