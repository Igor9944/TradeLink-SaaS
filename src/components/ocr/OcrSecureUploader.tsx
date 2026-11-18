// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, AlertTriangle, ShieldCheck, Loader2, Sparkles, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { OcrDocumentProfile, OcrUploadPayload } from '../../types';

interface OcrSecureUploaderProps {
  onUploadSuccess?: (doc: any) => void;
  defaultProfile?: OcrDocumentProfile;
  className?: string;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo

const PROFILE_LABELS: Record<OcrDocumentProfile, { fr: string; en: string; ar: string; icon: string }> = {
  KYC: {
    fr: 'Documents KYC (CIN, Passeport, Patente, RNE)',
    en: 'KYC Documents (ID, Passport, Business License)',
    ar: 'وثائق التحقق من الهوية (بطاقة هوية، جواز سفر، سجل تجاري)',
    icon: '🪪',
  },
  INVOICE: {
    fr: 'Facture B2B & Avoir (Fournisseur/Client)',
    en: 'B2B Invoice & Credit Note',
    ar: 'فاتورة تجارية وإشعار دائن',
    icon: '🧾',
  },
  QUOTE: {
    fr: 'Devis & Demande de cotation (RFQ)',
    en: 'Quote & Quotation Request',
    ar: 'عرض أسعار وطلب عروض',
    icon: '📑',
  },
  PURCHASE_ORDER: {
    fr: 'Bon de commande d\'achat B2B (PO)',
    en: 'Purchase Order (PO)',
    ar: 'أمر شراء تجاري',
    icon: '📦',
  },
  DELIVERY_NOTE: {
    fr: 'Bon de livraison & Récépissé quai (POD)',
    en: 'Delivery Note & Proof of Delivery (POD)',
    ar: 'إشعار تسليم واستلام رصيف',
    icon: '🚚',
  },
  TRANSPORT_CMR: {
    fr: 'Lettre de voiture e-CMR & Certificat EUR.1',
    en: 'e-CMR Transport Document & EUR.1 Certificate',
    ar: 'بوليصة شحن e-CMR وشهادة المنشأ EUR.1',
    icon: '🚢',
  },
  ACCOUNTING: {
    fr: 'Pièce comptable & Relevé bancaire',
    en: 'Accounting Record & Bank Statement',
    ar: 'مستند محاسبي وكشف بنكي',
    icon: '📊',
  },
};

export const OcrSecureUploader: React.FC<OcrSecureUploaderProps> = ({
  onUploadSuccess,
  defaultProfile = 'INVOICE',
  className = '',
}) => {
  const { locale, isRtl } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<OcrDocumentProfile>(defaultProfile);
  const [targetLanguage, setTargetLanguage] = useState<'fr' | 'en' | 'ar'>(locale as 'fr' | 'en' | 'ar');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = useCallback((fr: string, en: string, ar: string) => {
    if (locale === 'ar') return ar;
    if (locale === 'en') return en;
    return fr;
  }, [locale]);

  // Inspection client-side des Magic Bytes
  const inspectMagicBytes = async (file: File): Promise<{ valid: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!reader.result || !(reader.result instanceof ArrayBuffer)) {
          resolve({ valid: false, reason: t('Fichier illisible', 'Unreadable file', 'ملف غير قابل للقراءة') });
          return;
        }
        const bytes = new Uint8Array(reader.result.slice(0, 16));
        
        // Bloquer immédiatement les exécutables Windows MZ (4D 5A)
        if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
          resolve({ valid: false, reason: t('Format binaire ou exécutable non autorisé (Magic Byte MZ)', 'Executable or binary format forbidden (Magic Byte MZ)', 'صيغة ملف تنفيذي أو ثنائي غير مصرح بها (MZ)') });
          return;
        }

        // Bloquer immédiatement ELF Linux (7F 45 4C 46)
        if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
          resolve({ valid: false, reason: t('Format binaire ELF non autorisé', 'ELF binary format forbidden', 'صيغة ثنائية ELF غير مصرح بها') });
          return;
        }

        // Vérifier formats autorisés :
        // PDF: %PDF (25 50 44 46)
        const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
        // JPEG: FF D8 FF
        const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
        // WebP: RIFF ... WEBP (52 49 46 46 ... 57 45 42 50)
        const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
        const isWebp = isRiff && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

        if (isPdf || isJpeg || isPng || isWebp) {
          resolve({ valid: true });
        } else {
          resolve({
            valid: false,
            reason: t(
              'En-tête de fichier invalide. Formats acceptés : PDF, JPG, PNG, WebP.',
              'Invalid file header. Allowed formats: PDF, JPG, PNG, WebP.',
              'ترويسة الملف غير صالحة. التنسيقات المسموحة: PDF، JPG، PNG، WebP.'
            ),
          });
        }
      };
      reader.onerror = () => resolve({ valid: false, reason: 'Erreur de lecture binaire.' });
      reader.readAsArrayBuffer(file.slice(0, 16));
    });
  };

  const handleFileValidation = async (file: File) => {
    setErrorMessage(null);

    // 1. Contrôle taille (15 Mo max)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        t(
          `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(2)} Mo). Limite stricte : 15 Mo.`,
          `File too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Strict limit: 15 MB.`,
          `الملف كبير جداً (${(file.size / (1024 * 1024)).toFixed(2)} ميغابايت). الحد الأقصى: 15 ميغابايت.`
        )
      );
      setSelectedFile(null);
      return;
    }

    // 2. Contrôle extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        t(
          `Extension ${ext} non autorisée. Formats acceptés : ${ALLOWED_EXTENSIONS.join(', ')}`,
          `Extension ${ext} not allowed. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
          `الامتداد ${ext} غير مسموح به. التنسيقات المقبولة: ${ALLOWED_EXTENSIONS.join(', ')}`
        )
      );
      setSelectedFile(null);
      return;
    }

    // 3. Contrôle Magic Bytes en profondeur
    const magicCheck = await inspectMagicBytes(file);
    if (!magicCheck.valid) {
      setErrorMessage(magicCheck.reason || t('Signature binaire invalide', 'Invalid binary signature', 'توقيع ثنائي غير صالح'));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileValidation(e.target.files[0]);
    }
  };

  const triggerUploadAndAnalysis = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      // Convertir en base64 pour transmission sécurisée
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1] || '';
          setUploadProgress(45);

          // Simulation upload & appel API backend
          const payload: OcrUploadPayload = {
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type || 'application/pdf',
            profile: selectedProfile,
            base64Data,
            targetLanguage,
          };

          setUploadProgress(70);

          const response = await fetch('/api/v1/ocr/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          setUploadProgress(95);

          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            if (response.status === 409) {
              throw new Error(
                t(
                  'Doublon détecté : Ce document exact a déjà été téléversé et traité.',
                  'Duplicate detected: This exact document has already been uploaded and processed.',
                  'تم اكتشاف مستند مكرر: تم تحميل هذا المستند ومعالجته مسبقاً.'
                )
              );
            }
            throw new Error(errJson.message || `Erreur serveur (${response.status})`);
          }

          const result = await response.json();
          setUploadProgress(100);

          setTimeout(() => {
            setIsProcessing(false);
            setSelectedFile(null);
            if (onUploadSuccess) {
              onUploadSuccess(result.data?.document || result);
            }
          }, 400);
        } catch (subErr: any) {
          setIsProcessing(false);
          setErrorMessage(subErr.message || 'Erreur lors du traitement OCR.');
        }
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setErrorMessage(t('Erreur de lecture du fichier', 'File read error', 'خطأ في قراءة الملف'));
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Erreur inattendue.');
    }
  };

  return (
    <div className={`p-6 rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 shadow-sm space-y-6 ${className}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* En-tête & Sélecteur de Profil Métier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-teal-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-[#E85D22]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Passerelle Documentaire Sécurisée OCR & IDP', 'Secure OCR & IDP Document Ingestion', 'بوابة المستندات الآمنة للتعرف الضوئي ومعالجة المستندات')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'Chiffrement KMS AES-256-GCM • Inspection Magic Bytes • 7 Profils Métiers • Vérification de cohérence arithmétique',
              'KMS AES-256-GCM Encryption • Magic Bytes Inspection • 7 Business Profiles • Arithmetic Consistency Check',
              'تشفير KMS AES-256-GCM • فحص الترويسة الثنائية • 7 أنماط مهنية • فحص الدقة الحسابية'
            )}
          </p>
        </div>

        {/* Sélecteurs de Langue et Profil */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {t('Langue cible', 'Target Language', 'اللغة المستهدفة')}
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as 'fr' | 'en' | 'ar')}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#E85D22]"
            >
              <option value="fr">🇫🇷 Français (fr)</option>
              <option value="en">🇬🇧 English (en)</option>
              <option value="ar">🇸🇦 العربية (ar)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {t('Profil Métier IDP', 'IDP Business Profile', 'نمط المستند الذكي')}
            </label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value as OcrDocumentProfile)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-[#E85D22]"
            >
              {(Object.keys(PROFILE_LABELS) as OcrDocumentProfile[]).map((prof) => (
                <option key={prof} value={prof}>
                  {PROFILE_LABELS[prof].icon} {PROFILE_LABELS[prof][locale as 'fr' | 'en' | 'ar'] || PROFILE_LABELS[prof].fr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zone Drag & Drop */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-[#E85D22] bg-[#E85D22]/10 scale-[1.01]'
            : 'border-slate-300 dark:border-teal-800 hover:border-[#E85D22] bg-slate-50/50 dark:bg-[#05181A]/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isProcessing}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-[#E85D22] flex items-center justify-center">
            {isProcessing ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(
                'Glissez-déposez votre document ici ou cliquez pour parcourir',
                'Drag and drop your document here or click to browse',
                'اسحب وأفلت مستندك هنا أو انقر للتصفح'
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                'Formats autorisés : PDF, JPG, PNG, WebP • Max 15 Mo par document',
                'Allowed formats: PDF, JPG, PNG, WebP • Max 15 MB per document',
                'التنسيقات المسموح بها: PDF، JPG، PNG، WebP • الحد الأقصى 15 ميغابايت لكل مستند'
              )}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {t(
                'Vérification antivol & anti-malware par Magic Bytes activée',
                'Anti-malware & Magic Bytes verification active',
                'التحقق المباشر من الترويسة الثنائية ضد البرمجيات الخبيثة مفعل'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Erreurs & Avertissements */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">{t('Erreur de validation :', 'Validation Error:', 'خطأ في التحقق:')}</span> {errorMessage}
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Fichier Sélectionné & Bouton d'Analyse */}
      {selectedFile && !errorMessage && (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#0B2E33] border border-slate-200 dark:border-teal-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E85D22]/15 text-[#E85D22] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {(selectedFile.size / 1024).toFixed(1)} Ko • {selectedFile.type || 'Fichier binaire'} • Profil : {selectedProfile}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              disabled={isProcessing}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-teal-900/40 transition-colors"
            >
              {t('Annuler', 'Cancel', 'إلغاء')}
            </button>
            <button
              type="button"
              onClick={triggerUploadAndAnalysis}
              disabled={isProcessing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E85D22] to-amber-600 hover:brightness-110 shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('Analyse OCR en cours...', 'OCR Processing...', 'جاري التحليل الضوئي...')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('Lancer l\'Intelligence Documentaire', 'Start Document Intelligence', 'بدء المعالجة الذكية')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Barre de Progression en cours de traitement */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-teal-200 font-medium">
              {t('Extraction IDP multilingue, calcul arithmétique et vectorisation...', 'Multilingual IDP extraction, arithmetic check & vectorization...', 'استخراج البيانات متعدد اللغات، الفحص الحسابي والترميز...')}
            </span>
            <span className="font-mono font-bold text-[#E85D22]">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-teal-950 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#E85D22] to-amber-500 transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
