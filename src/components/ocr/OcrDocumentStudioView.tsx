// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Download,
  Edit3,
  RefreshCw,
  Eye,
  Check,
  Lock,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type {
  OcrDocumentDetail,
  OcrValidationPayload,
} from '../../types';

interface OcrDocumentStudioViewProps {
  document: OcrDocumentDetail;
  onUpdateField?: (fieldKey: string, newValue: string, reason?: string) => Promise<void> | void;
  onValidateDocument?: (payload: OcrValidationPayload) => Promise<void> | void;
  onRejectDocument?: (reason: string) => Promise<void> | void;
  onRefresh?: () => void;
  className?: string;
}

export const OcrDocumentStudioView: React.FC<OcrDocumentStudioViewProps> = ({
  document: initialDoc,
  onUpdateField,
  onValidateDocument,
  onRejectDocument,
  onRefresh,
  className = '',
}) => {
  const { currentUser, locale, isRtl } = useApp();

  const [doc, setDoc] = useState<OcrDocumentDetail>(initialDoc);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [humanReviewerNote, setHumanReviewerNote] = useState<string>('');
  const [showRawText, setShowRawText] = useState<boolean>(false);

  // Sync si initialDoc change
  React.useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  const t = (fr: string, en: string, ar: string) => {
    if (locale === 'ar') return ar;
    if (locale === 'en') return en;
    return fr;
  };

  const userDisplayName = useMemo(() => {
    if (currentUser?.firstName || currentUser?.lastName) {
      return `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    }
    return currentUser?.email || 'Opérateur Humain';
  }, [currentUser]);

  // Helper de couleur selon niveau de confiance
  const getConfidenceBadge = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    if (pct >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {pct}%
        </span>
      );
    }
    if (pct >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {pct}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        {pct}%
      </span>
    );
  };

  // Détection des champs incertains (< 80% ou marqués incertains)
  const uncertainFieldsList = useMemo(() => {
    return doc.extractedFields.filter((f) => f.confidence < 0.8 || doc.uncertainFields.includes(f.key));
  }, [doc.extractedFields, doc.uncertainFields]);

  // Vérification de cohérence arithmétique dynamique
  const arithmeticCheck = useMemo(() => {
    const amountHt = parseFloat(doc.extractedFields.find((f) => f.key === 'amountHt' || f.key === 'totalHt')?.value || '0');
    const vatAmount = parseFloat(doc.extractedFields.find((f) => f.key === 'vatAmount' || f.key === 'taxAmount')?.value || '0');
    const amountTtc = parseFloat(doc.extractedFields.find((f) => f.key === 'amountTtc' || f.key === 'totalTtc')?.value || '0');

    if (amountHt > 0 && amountTtc > 0) {
      const calculatedTtc = Math.round((amountHt + vatAmount) * 100) / 100;
      const diff = Math.abs(calculatedTtc - amountTtc);
      const isConsistent = diff <= 0.05; // Marge d'arrondi tolérée de 5 centimes
      return {
        checked: true,
        isConsistent,
        amountHt,
        vatAmount,
        amountTtc,
        calculatedTtc,
        diff,
      };
    }

    return { checked: false, isConsistent: true };
  }, [doc.extractedFields]);

  // Gestion de la modification d'un champ
  const handleFieldValueChange = (fieldKey: string, newValue: string) => {
    const oldField = doc.extractedFields.find((f) => f.key === fieldKey);
    const oldValue = oldField?.value || '';

    // Mettre à jour l'état local
    setDoc((prev) => {
      const updatedFields = prev.extractedFields.map((f) =>
        f.key === fieldKey ? { ...f, value: newValue, isModified: true } : f
      );

      const correction = {
        fieldKey,
        originalValue: oldValue,
        correctedValue: newValue,
        correctedBy: userDisplayName,
        timestamp: new Date().toISOString(),
      };

      return {
        ...prev,
        extractedFields: updatedFields,
        correctionsLog: [...prev.correctionsLog, correction],
      };
    });

    if (onUpdateField) {
      onUpdateField(fieldKey, newValue);
    }
  };

  // Validation humaine du document
  const handleConfirmHumanValidation = async () => {
    setIsValidating(true);
    try {
      const payload: OcrValidationPayload = {
        documentId: doc.id,
        validatorUserId: currentUser?.id || 'admin-1',
        validatorName: userDisplayName,
        reviewNotes: humanReviewerNote || 'Validation humaine certifiée conforme sans réserve.',
        approvedAt: new Date().toISOString(),
      };

      if (onValidateDocument) {
        await onValidateDocument(payload);
      }

      setDoc((prev) => ({
        ...prev,
        status: 'VALIDATED',
        validationMetadata: {
          validatedBy: payload.validatorName,
          validatedAt: payload.approvedAt,
          humanReviewCompleted: true,
          reviewNotes: payload.reviewNotes,
        },
      }));
    } finally {
      setIsValidating(false);
    }
  };

  // Rejet motivé
  const handleConfirmRejection = async () => {
    if (!rejectReason.trim()) return;
    if (onRejectDocument) {
      await onRejectDocument(rejectReason);
    }
    setDoc((prev) => ({
      ...prev,
      status: 'REJECTED',
      validationMetadata: {
        validatedBy: userDisplayName,
        validatedAt: new Date().toISOString(),
        humanReviewCompleted: true,
        reviewNotes: `Rejeté : ${rejectReason}`,
      },
    }));
    setIsRejectModalOpen(false);
  };

  // Exportation structurée
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(doc, null, 2));
    const downloadAnchor = window.document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tradelink_ocr_${doc.id}.json`);
    window.document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={`space-y-6 ${className}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Barre d'Informations & Contrôles Supérieurs */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E85D22] to-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-orange-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {doc.fileName}
              </h2>
              <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-teal-900/50 text-slate-700 dark:text-teal-200 border border-slate-200 dark:border-teal-800">
                Profil: {doc.profile}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  doc.status === 'VALIDATED'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : doc.status === 'REJECTED'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                }`}
              >
                {doc.status === 'VALIDATED'
                  ? t('Validé Humainement', 'Human Validated', 'معتمد بشرياً')
                  : doc.status === 'REJECTED'
                  ? t('Rejeté', 'Rejected', 'مرفوض')
                  : t('En attente de revue humaine', 'Pending Human Review', 'بانتظار المراجعة البشرية')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Réf ID : <code className="font-mono">{doc.id}</code></span>
              <span>• Hachage SHA-256 : <code className="font-mono">{doc.contentHash.substring(0, 12)}...</code></span>
              <span>• Langue détectée : <b className="uppercase">{doc.detectedLanguage}</b></span>
            </p>
          </div>
        </div>

        {/* Actions Supérieures */}
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-300 dark:border-teal-800 hover:bg-slate-100 dark:hover:bg-teal-900/40 text-slate-600 dark:text-slate-300 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-teal-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-teal-900/40 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{showRawText ? t('Voir Champs', 'View Fields', 'عرض الحقول') : t('Texte Brut OCR', 'Raw OCR Text', 'النص الخام')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-teal-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-teal-900/40 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('Export JSON', 'Export JSON', 'تصدير JSON')}</span>
          </button>
        </div>
      </div>

      {/* Alerte de Cohérence Arithmétique */}
      {arithmeticCheck.checked && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3.5 text-xs transition-colors ${
            arithmeticCheck.isConsistent
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300'
          }`}
        >
          {arithmeticCheck.isConsistent ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
          )}
          <div className="flex-1">
            <div className="font-bold text-sm">
              {arithmeticCheck.isConsistent
                ? t(
                    'Cohérence Arithmétique Validée (HT + TVA = TTC)',
                    'Arithmetic Consistency Verified (Subtotal + VAT = Total)',
                    'تم التحقق من الدقة الحسابية (الصافي + الضريبة = الإجمالي)'
                  )
                : t(
                    'ATTENTION : Incohérence Arithmétique Détectée dans les montants !',
                    'WARNING: Arithmetic Inconsistency Detected in amounts!',
                    'تحذير: تم اكتشاف تعارض حسابي في المبالغ!'
                  )}
            </div>
            <div className="mt-1 font-mono text-[11px] opacity-90 flex flex-wrap gap-4">
              <span>Total HT : {arithmeticCheck.amountHt?.toFixed(2)}</span>
              <span>+ TVA : {arithmeticCheck.vatAmount?.toFixed(2)}</span>
              <span>= Calculé : {arithmeticCheck.calculatedTtc?.toFixed(2)}</span>
              <span>| Indiqué TTC : {arithmeticCheck.amountTtc?.toFixed(2)}</span>
              {!arithmeticCheck.isConsistent && (
                <span className="font-bold underline text-rose-600 dark:text-rose-400">
                  Écart constaté : {arithmeticCheck.diff?.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alertes Champs Incertains */}
      {uncertainFieldsList.length > 0 && doc.status !== 'VALIDATED' && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {t(
                `${uncertainFieldsList.length} champ(s) avec niveau de confiance incertain (< 80%). Contrôle humain recommandé.`,
                `${uncertainFieldsList.length} field(s) with low confidence (< 80%). Manual review recommended.`,
                `يوجد ${uncertainFieldsList.length} حقل(حقول) بدرجة ثقة منخفضة (< 80%). يوصى بالمراجعة البشرية.`
              )}
            </span>
          </div>
          <div className="flex gap-1">
            {uncertainFieldsList.map((uf) => (
              <button
                key={uf.key}
                type="button"
                onClick={() => setActiveFieldKey(uf.key)}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-200 hover:bg-amber-500/30 font-bold"
              >
                {uf.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vue Côte-à-Côte Principale */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Colonne Gauche (5/12) : Document Original & Bounding Boxes */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-100 dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-teal-200">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('Document Original (URL Présignée)', 'Original Document (Presigned URL)', 'المستند الأصلي (رابط موثق)')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{t('Expire dans 15 min', 'Expires in 15 min', 'ينتهي خلال 15 دقيقة')}</span>
            </div>
          </div>

          {/* Visualisation interactive du document scanné */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] p-4 text-xs shadow-inner space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                {doc.fileName}
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {(doc.fileSize / 1024).toFixed(1)} Ko • 300 DPI
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-teal-800 bg-slate-900/10 min-h-[280px] flex items-center justify-center">
              <img
                src={doc.presignedUrl || '/logos/logo-light-horizontal.png'}
                alt="Document Source"
                className="w-full h-auto max-h-[360px] object-contain opacity-90"
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#E85D22]/40 rounded-xl" />
            </div>

            {/* Bounding Boxes Interactives */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-teal-800">
              <p className="text-[11px] font-bold text-slate-700 dark:text-teal-300">
                {t('Zones de Détection OCR (cliquez pour inspecter) :', 'Interactive Detection Zones (click to inspect):', 'مناطق الكشف الضوئي (انقر للمعاينة):')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {doc.extractedFields.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveFieldKey(f.key)}
                    className={`p-2 rounded-xl text-start border transition-all ${
                      activeFieldKey === f.key
                        ? 'border-[#E85D22] bg-[#E85D22]/15 text-[#E85D22] font-bold ring-2 ring-[#E85D22]/20'
                        : 'border-slate-200 dark:border-teal-900 bg-white dark:bg-[#0A292C] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="truncate">{f.label}</span>
                      {getConfidenceBadge(f.confidence)}
                    </div>
                    <p className="truncate font-mono text-[10px] opacity-75">{f.value || '—'}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Colonne Droite (7/12) : Formulaire Structuré & Human Validation */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-teal-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Champs Extraits Structurés & Validation Humaine', 'Structured Extracted Fields & Human Review', 'الحقول المستخرجة المهيكلة والمراجعة البشرية')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('Vérifiez et corrigez chaque champ avant validation formelle.', 'Verify and correct each field before official sign-off.', 'تحقق من كل حقل وقم بالتصحيح قبل الاعتماد الرسمي.')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{t('Confiance globale :', 'Global confidence:', 'الثقة الإجمالية:')}</span>
              {getConfidenceBadge(doc.globalConfidence)}
            </div>
          </div>

          {/* Affichage Texte Brut en mode toggle */}
          {showRawText ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t('Transcription brute IDP complète', 'Full Raw IDP Transcript', 'النص الكامل المستخرج')}</span>
                <span className="font-mono">{doc.rawText.length} caractères</span>
              </div>
              <textarea
                value={doc.rawText}
                readOnly
                rows={14}
                className="w-full rounded-xl p-3 text-xs font-mono bg-slate-50 dark:bg-[#05181A] border border-slate-300 dark:border-teal-800 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          ) : (
            /* Formulaire d'édition interactif */
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {doc.extractedFields.map((field) => (
                <div
                  key={field.key}
                  className={`p-3 rounded-xl border transition-all ${
                    activeFieldKey === field.key
                      ? 'border-[#E85D22] bg-[#E85D22]/5 shadow-sm'
                      : 'border-slate-200 dark:border-teal-900/80 bg-slate-50/50 dark:bg-[#082225]/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {field.isModified && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
                          {t('Corrigé manuellement', 'Manually Corrected', 'معدل يدوياً')}
                        </span>
                      )}
                      <span>{field.label}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {field.boundingBox && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{field.boundingBox.x},{field.boundingBox.y}]
                        </span>
                      )}
                      {getConfidenceBadge(field.confidence)}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={field.value}
                      disabled={doc.status === 'VALIDATED'}
                      onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                      onFocus={() => setActiveFieldKey(field.key)}
                      className="w-full rounded-lg border border-slate-300 dark:border-teal-800 px-3 py-2 text-xs bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#E85D22] focus:border-transparent outline-none disabled:opacity-70"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lignes d'articles si profil facture, devis ou commande */}
          {doc.lineItems && doc.lineItems.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-teal-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {t('Lignes d\'articles extraites', 'Extracted Line Items', 'بنود المواد المستخرجة')} ({doc.lineItems.length})
                </span>
                <span className="text-slate-500 text-[11px] font-mono">Tabular IDP Engine</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-teal-800">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-100 dark:bg-[#0A292C] font-semibold text-slate-700 dark:text-teal-200 border-b border-slate-200 dark:border-teal-800">
                    <tr>
                      <th className="p-2 text-start">#</th>
                      <th className="p-2 text-start">{t('Description', 'Description', 'الوصف')}</th>
                      <th className="p-2 text-start">SKU</th>
                      <th className="p-2 text-end">{t('Qté', 'Qty', 'الكمية')}</th>
                      <th className="p-2 text-end">{t('P.U HT', 'Unit Price', 'السعر الفردي')}</th>
                      <th className="p-2 text-end">{t('Total HT', 'Total', 'المجموع')}</th>
                      <th className="p-2 text-center">{t('Conf.', 'Conf.', 'الثقة')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-teal-900/60 bg-white dark:bg-[#062023]">
                    {doc.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-teal-950/40">
                        <td className="p-2 font-mono text-[11px]">#{item.lineNumber}</td>
                        <td className="p-2 font-medium">{item.description}</td>
                        <td className="p-2 font-mono text-[10px] text-slate-500">{item.sku || '—'}</td>
                        <td className="p-2 text-end font-bold">{item.quantity}</td>
                        <td className="p-2 text-end">{item.unitPrice}</td>
                        <td className="p-2 text-end font-bold text-[#E85D22]">{item.lineTotal}</td>
                        <td className="p-2 text-center">{getConfidenceBadge(item.confidence)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Journal des Corrections Humaines */}
          {doc.correctionsLog && doc.correctionsLog.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#E85D22]" />
                {t('Journal des corrections manuelles (Traçabilité immuable) :', 'Manual Corrections Log (Audit Trail):', 'سجل التعديلات اليدوية (التتبع الآمن):')}
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[10px] text-slate-500">
                {doc.correctionsLog.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>
                      Champ <b>{c.fieldKey}</b> : "{c.originalValue}" → <b className="text-blue-500">"{c.correctedValue}"</b>
                    </span>
                    <span className="opacity-70">{c.correctedBy} • {new Date(c.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note de validation humaine & Actions Finales */}
          <div className="pt-4 border-t border-slate-200 dark:border-teal-800 space-y-3">
            {doc.status !== 'VALIDATED' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('Note de contrôle humain (facultative) :', 'Human Review Note (optional):', 'ملاحظات المراجعة البشرية (اختيارية):')}
                </label>
                <input
                  type="text"
                  placeholder={t(
                    'Ex: Facture vérifiée conforme au bon de commande #PO-4402',
                    'E.g. Invoice matched with purchase order #PO-4402',
                    'مثال: تمت مطابقة الفاتورة مع أمر الشراء'
                  )}
                  value={humanReviewerNote}
                  onChange={(e) => setHumanReviewerNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {doc.validationMetadata?.humanReviewCompleted ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {t('Validé par', 'Validated by', 'معتمد من')} {doc.validationMetadata.validatedBy}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <Shield className="w-4 h-4" />
                    {t('Validation humaine obligatoire', 'Human review mandatory', 'المراجعة البشرية إلزامية')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {doc.status !== 'VALIDATED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRejectModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                    >
                      {t('Rejeter Document', 'Reject Document', 'رفض المستند')}
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmHumanValidation}
                      disabled={isValidating}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t('Certifier & Valider Humainement', 'Certify & Human Validate', 'اعتماد ومصادقة بشرية')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Rejet Motové */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle className="w-6 h-6" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {t('Rejeter le document OCR', 'Reject OCR Document', 'رفض المستند')}
              </h4>
            </div>

            <p className="text-xs text-slate-500">
              {t(
                'Indiquez le motif précis du rejet (ex: document illisible, suspicion de falsification, montants incohérents). Ce motif sera consigné dans le journal d\'audit.',
                'Specify the rejection reason (e.g. unreadable, suspected fraud, arithmetic mismatch). This reason will be logged.',
                'يرجى تحديد سبب الرفض (مثال: مستند غير مقروء، شك في التزوير، مبالغ غير متطابقة). سيتم تسجيل هذا السبب في سجل التدقيق.'
              )}
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('Motif obligatoire du rejet...', 'Mandatory rejection reason...', 'السبب الإلزامي للرفض...')}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-teal-800 text-xs bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-teal-900/40"
              >
                {t('Annuler', 'Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {t('Confirmer le rejet', 'Confirm Rejection', 'تأكيد الرفض')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
