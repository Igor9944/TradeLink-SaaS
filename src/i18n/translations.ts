import { Locale } from '../types';

export const translations: Record<Locale, Record<string, string>> = {
  fr: {
    'app.title': 'TRADELINK V6.0',
    'app.subtitle': 'Plateforme SaaS B2B Commerce, Import-Export, Logistique, Comptabilité & IA',
    'nav.home': 'Accueil',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.blog': 'Blog & Ressources',
    'nav.legal': 'Mentions légales & RGPD',
    'nav.login': 'Connexion',
    'nav.register': 'Devenir Client / Partenaire',
    'nav.dashboard': 'Accéder au SaaS',
    'hero.badge': 'RÉFÉRENCE B2B V6.0 — ARCHITECTURE MULTI-RÔLES & SÉCURITÉ KMS',
    'hero.title': 'Centralisez votre Supply Chain, vos Finances B2B et vos Flux Internationaux',
    'hero.desc': 'Une plateforme unifiée connectant Clients, Fournisseurs, Transporteurs, Comptables, Support et Administrateurs avec OCR/IDP, Room Live WebRTC, Moteur Financier Decimal et Chiffrement AES-256-GCM.',
    'hero.cta.primary': 'Lancer l’Espace SaaS Interactif',
    'hero.cta.secondary': 'Explorer les 6 Espaces Métier',
    'role.ADMIN': 'Administrateur',
    'role.CLIENT': 'Client B2B',
    'role.FOURNISSEUR': 'Fournisseur',
    'role.TRANSPORTEUR': 'Transporteur',
    'role.COMPTABLE': 'Comptable (Stage 3)',
    'role.SUPPORT': 'Support Client',
    'role.VISITEUR': 'Visiteur (Pré-Client)',
    'theme.system': 'Système (Auto)',
    'theme.light': 'Thème Clair',
    'theme.dark': 'Thème Noir',
    'kyc.banner.pending': 'Parcours KYC en cours — Délai de 7 jours calendaires (Rappels J+1, J+3, J+5, J+6)',
    'kyc.banner.submitted_in_time': 'Dossier KYC soumis dans les délais — En attente de revue administrative (Aucune suspension automatique)',
    'kyc.banner.validated': 'Compte vérifié KYC & Conformité active',
    'kyc.banner.suspended': 'Compte suspendu à J+7 (Pièces obligatoires non soumises dans le délai)',
    'compta.readonly.notice': 'Mode Lecture Seule (Stage 3) sur les données commerciales sources (Produits, Clients, Fournisseurs non modifiables).',
    'room.client.restriction': 'Conformément aux règles métier, le Client rejoint uniquement les salles Room Live autorisées (pas de création générale).',
    'security.single_session': 'Session unique active : toute nouvelle connexion révoque automatiquement la session précédente (Redis + JWT rotatif).',
    'security.double_approval': 'Double validation obligatoire : l’administrateur initiateur ne peut pas approuver sa propre demande.',
    'ux.state.normal': 'État Normal',
    'ux.state.loading': 'Chargement (Skeleton)',
    'ux.state.empty': 'État Vide (EmptyState)',
    'ux.state.error': 'État Erreur',
    'common.search': 'Rechercher une référence, SKU, commande, dossier KYC...',
    'common.export': 'Exporter (CSV / PDF)',
    'common.save': 'Enregistrer les modifications',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer l’action',
    'common.back': 'Retour',
    'common.jurisdiction': 'Juridiction',
    'common.workspace': 'ESPACE',
    'common.ai_assistant': 'Assistant IA',
    'common.voice_stt': 'Dictée STT',
    'common.transversal': 'Services Transversaux',
    'common.ocr_studio': 'Studio OCR / IDP & IA',
    'common.room_active': 'Salle Room Live Active',
    'common.notifications': 'Centre de Notifications',
    'common.auth_portal': 'Portail Authentification / MFA',
  },
  en: {
    'app.title': 'TRADELINK V6.0',
    'app.subtitle': 'B2B SaaS Platform for Trade, Import-Export, Logistics, Accounting & AI',
    'nav.home': 'Home',
    'nav.about': 'About Us',
    'nav.contact': 'Contact',
    'nav.blog': 'Blog & Insights',
    'nav.legal': 'Legal & Privacy',
    'nav.login': 'Sign In',
    'nav.register': 'Register Account',
    'nav.dashboard': 'Open SaaS Workspace',
    'hero.badge': 'B2B REFERENCE V6.0 — MULTI-ROLE RBAC & KMS SECURITY',
    'hero.title': 'Unify Your Global Supply Chain, B2B Trade & Financial Operations',
    'hero.desc': 'Connect Clients, Suppliers, Carriers, Accountants, Support, and Administrators with OCR/IDP extraction, WebRTC Room Live, Deterministic Decimal Financial Engine, and AES-256-GCM Envelope Encryption.',
    'hero.cta.primary': 'Launch Interactive SaaS Workspace',
    'hero.cta.secondary': 'Explore All 6 Role Workspaces',
    'role.ADMIN': 'Administrator',
    'role.CLIENT': 'B2B Client',
    'role.FOURNISSEUR': 'Supplier',
    'role.TRANSPORTEUR': 'Carrier',
    'role.COMPTABLE': 'Accountant (Stage 3)',
    'role.SUPPORT': 'Support Agent',
    'role.VISITEUR': 'Visitor (Pre-Client)',
    'theme.system': 'System (Auto)',
    'theme.light': 'Light Theme',
    'theme.dark': 'Dark Theme',
    'kyc.banner.pending': 'KYC Verification Active — 7-Calendar-Day Window (J+1, J+3, J+5, J+6 Reminders)',
    'kyc.banner.submitted_in_time': 'KYC Submitted on Time — Pending Admin Review (Protected from automatic J+7 suspension)',
    'kyc.banner.validated': 'KYC Verified & Compliant',
    'kyc.banner.suspended': 'Account Suspended at J+7 (Mandatory documents not submitted within deadline)',
    'compta.readonly.notice': 'Read-Only Mode (Stage 3) enforced on commercial source data (Cannot modify or import Products, Clients, or Suppliers).',
    'room.client.restriction': 'Per business rules, Clients can only join authorized Room Live sessions (no general room creation right).',
    'security.single_session': 'Single active session policy: signing in automatically revokes any previous session and refresh token.',
    'security.double_approval': 'Dual-admin approval required: the initiating administrator cannot self-approve this operation.',
    'ux.state.normal': 'Normal State',
    'ux.state.loading': 'Loading (Skeleton)',
    'ux.state.empty': 'Empty State',
    'ux.state.error': 'Error State',
    'common.search': 'Search by reference, SKU, order, KYC dossier...',
    'common.export': 'Export (CSV / PDF)',
    'common.save': 'Save Changes',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm Action',
    'common.back': 'Back',
    'common.jurisdiction': 'Jurisdiction',
    'common.workspace': 'WORKSPACE',
    'common.ai_assistant': 'AI Assistant',
    'common.voice_stt': 'Voice STT',
    'common.transversal': 'Cross-Cutting Services',
    'common.ocr_studio': 'OCR / IDP & AI Studio',
    'common.room_active': 'Active Room Live Session',
    'common.notifications': 'Notifications Center',
    'common.auth_portal': 'Authentication / MFA Portal',
  },
  ar: {
    'app.title': 'تريد لينك TRADELINK V6.0',
    'app.subtitle': 'منصة SaaS للأعمال والتجارة الدولية والخدمات اللوجستية والمحاسبة والذكاء الاصطناعي',
    'nav.home': 'الرئيسية',
    'nav.about': 'من نحن',
    'nav.contact': 'اتصل بنا',
    'nav.blog': 'المدونة والموارد',
    'nav.legal': 'الشروط القانونية والخصوصية',
    'nav.login': 'تسجيل الدخول',
    'nav.register': 'إنشاء حساب',
    'nav.dashboard': 'الدخول إلى المنصة',
    'hero.badge': 'الإصدار المرجعي V6.0 — بنية متعددة الأدوار وتشفير KMS',
    'hero.title': 'وحّد سلسلة الإمداد والتجارة الدولية والعمليات المالية والمحاسبية في منصة واحدة',
    'hero.desc': 'منصة متكاملة تربط العملاء والموردين والناقلين والمحاسبين والدعم والإدارة مع استخراج المستندات OCR/IDP، غرف الاجتماعات المباشرة Room Live، ومحرك الحساب المالي الدقيق Decimal.',
    'hero.cta.primary': 'تشغيل مساحة العمل التفاعلية',
    'hero.cta.secondary': 'استكشاف مساحات العمل الست',
    'role.ADMIN': 'مدير النظام',
    'role.CLIENT': 'عميل B2B',
    'role.FOURNISSEUR': 'مورّد',
    'role.TRANSPORTEUR': 'ناقل لوجستي',
    'role.COMPTABLE': 'محاسب (المرحلة 3)',
    'role.SUPPORT': 'فريق الدعم',
    'role.VISITEUR': 'زائر (ما قبل العميل)',
    'theme.system': 'تلقائي (النظام)',
    'theme.light': 'الوضع الفاتح',
    'theme.dark': 'الوضع الداكن',
    'kyc.banner.pending': 'التحقق من الهوية KYC جارٍ — مهلة 7 أيام تقويمية (تذكيرات ي+1، ي+3، ي+5، ي+6)',
    'kyc.banner.submitted_in_time': 'تم تقديم ملف KYC في الوقت المحدد — قيد المراجعة الإدارية (محمي من الإيقاف التلقائي)',
    'kyc.banner.validated': 'تم التحقق من الحساب واعتماد KYC',
    'kyc.banner.suspended': 'تم تعليق الحساب في اليوم السابع لعدم إرسال الوثائق الإلزامية',
    'compta.readonly.notice': 'وضع القراءة فقط (المرحلة 3) مفعل على البيانات التجارية المصدرية (لا يمكن تعديل المنتجات أو العملاء أو الموردين).',
    'room.client.restriction': 'وفقاً لقواعد العمل، يمكن للعميل الانضمام فقط إلى غرف الاجتماعات المصرح بها (لا يملك صلاحية إنشاء عامة).',
    'security.single_session': 'جلسة نشطة واحدة فقط لكل مستخدم: تسجيل الدخول الجديد يلغي الجلسة السابقة تلقائياً.',
    'security.double_approval': 'موافقة مزدوجة إلزامية: لا يمكن للمدير المبادر الموافقة على طلبه الخاص.',
    'ux.state.normal': 'الحالة العادية',
    'ux.state.loading': 'جاري التحميل (Skeleton)',
    'ux.state.empty': 'لا توجد بيانات (EmptyState)',
    'ux.state.error': 'حالة خطأ',
    'common.search': 'البحث عن مرجع، رمز SKU، طلب، أو ملف KYC...',
    'common.export': 'تصدير (CSV / PDF)',
    'common.save': 'حفظ التغييرات',
    'common.cancel': 'إلغاء',
    'common.confirm': 'تأكيد الإجراء',
    'common.back': 'رجوع',
    'common.jurisdiction': 'النطاق القانوني',
    'common.workspace': 'مساحة عمل',
    'common.ai_assistant': 'المساعد الذكي IA',
    'common.voice_stt': 'الإملاء الصوتي',
    'common.transversal': 'الخدمات المشتركة',
    'common.ocr_studio': 'استوديو استخراج الوثائق OCR/IDP',
    'common.room_active': 'غرفة الاجتماع المباشر النشطة',
    'common.notifications': 'مركز الإشعارات',
    'common.auth_portal': 'بوابة المصادقة والأمان MFA',
  },
};

const STATUS_LABELS: Record<string, Record<Locale, string>> = {
  // 8 États canoniques KYC TRADELINK V6.0
  NON_COMMENCE: { fr: 'Non commencé', en: 'Not started', ar: 'لم يبدأ' },
  EN_COURS: { fr: 'En cours', en: 'In progress', ar: 'قيد الإنجاز' },
  DOCUMENTS_SOUMIS: { fr: 'Documents soumis', en: 'Documents submitted', ar: 'تم تقديم الوثائق' },
  EN_VERIFICATION: { fr: 'En vérification', en: 'Under review', ar: 'قيد التحقق' },
  COMPLEMENT_DEMANDE: { fr: 'Complément demandé', en: 'Complement requested', ar: 'مطلوب استكمال الوثائق' },
  VALIDE: { fr: 'Validé', en: 'Validated', ar: 'معتمد' },
  REJETE: { fr: 'Rejeté', en: 'Rejected', ar: 'مرفوض' },
  SUSPENDU: { fr: 'Suspendu', en: 'Suspended', ar: 'معلق' },

  // Alias anglais & compatibilité historique
  NOT_STARTED: { fr: 'Non commencé', en: 'Not started', ar: 'لم يبدأ' },
  IN_PROGRESS: { fr: 'En cours', en: 'In progress', ar: 'قيد الإنجاز' },
  DOCUMENTS_SUBMITTED: { fr: 'Documents soumis', en: 'Documents submitted', ar: 'تم تقديم الوثائق' },
  UNDER_REVIEW: { fr: 'En vérification', en: 'Under review', ar: 'قيد التحقق' },
  SUSPENDED: { fr: 'Suspendu', en: 'Suspended', ar: 'معلق' },
  DRAFT: { fr: 'Brouillon', en: 'Draft', ar: 'مسودة' },
  PENDING: { fr: 'En attente', en: 'Pending', ar: 'قيد الانتظار' },
  ACCEPTED: { fr: 'Acceptée', en: 'Accepted', ar: 'مقبول' },
  PREPARING: { fr: 'En préparation', en: 'Preparing', ar: 'قيد التحضير' },
  SHIPPED: { fr: 'Expédiée', en: 'Shipped', ar: 'تم الشحن' },
  DELIVERED: { fr: 'Livrée', en: 'Delivered', ar: 'تم التسليم' },
  REFUSED: { fr: 'Refusée', en: 'Refused', ar: 'مرفوض' },
  CANCELLED: { fr: 'Annulée', en: 'Cancelled', ar: 'ملغى' },
  VALIDATED: { fr: 'Validé', en: 'Validated', ar: 'معتمد' },
  REJECTED: { fr: 'Rejeté', en: 'Rejected', ar: 'مرفوض' },
  COMPLEMENT_REQUESTED: {
    fr: 'Complément requis',
    en: 'Complement requested',
    ar: 'مطلوب استكمال الوثائق',
  },
  COMPLEMENT_NEEDED: {
    fr: 'Pièce à remplacer',
    en: 'Document to replace',
    ar: 'وثيقة مطلوب استبدالها',
  },
  SUSPENDED_J7: { fr: 'Suspendu J+7', en: 'Suspended D+7', ar: 'معلق (ي+7)' },
  SUSPENDED_J7_UNSUBMITTED: {
    fr: 'Suspendu J+7 (Dossier non soumis)',
    en: 'Suspended D+7 (Unsubmitted)',
    ar: 'معلق ي+7 (عدم تقديم الوثائق)',
  },
  SUBMITTED_IN_TIME_PENDING_REVIEW: {
    fr: 'Soumis à temps (En revue)',
    en: 'Submitted on time (In review)',
    ar: 'تم التقديم بالوقت المحدد (قيد المراجعة)',
  },
  PENDING_SUBMISSION: {
    fr: 'En attente de pièces',
    en: 'Pending documents',
    ar: 'بانتظار الوثائق',
  },
  PAID: { fr: 'Payée', en: 'Paid', ar: 'مدفوعة' },
  ISSUED: { fr: 'Émise', en: 'Issued', ar: 'صادرة' },
  OVERDUE: { fr: 'En retard', en: 'Overdue', ar: 'متأخرة' },
  IN_TRANSIT: { fr: 'En transit', en: 'In Transit', ar: 'في الطريق' },
  COLLECTED: { fr: 'Collectée', en: 'Collected', ar: 'تم الاستلام' },
  OUT_FOR_DELIVERY: { fr: 'En cours de livraison', en: 'Out for Delivery', ar: 'قيد التوصيل' },
  LIVE: { fr: 'En direct', en: 'Live Now', ar: 'مباشر الآن' },
  SCHEDULED: { fr: 'Programmée', en: 'Scheduled', ar: 'مجدول' },
};

export function translateStatus(status: string, locale: Locale = 'fr'): string {
  return STATUS_LABELS[status]?.[locale] ?? status;
}

export function formatCurrency(amount: string | number, currency = 'EUR', locale: Locale = 'fr'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return `0.00 ${currency}`;
  const localeMap: Record<Locale, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    ar: 'ar-MA',
  };
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function sanitizeCsvCellFormula(cellValue: string): string {
  if (!cellValue) return '';
  const trimmed = cellValue.trimStart();
  if (/^[=+@|%\t\r]/.test(trimmed) || (/^-[^\d]/.test(trimmed) && trimmed.startsWith('-'))) {
    return `'${cellValue}`;
  }
  return cellValue;
}

export function downloadDataExport(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
  let safeContent = content;
  if (mime.toLowerCase().includes('csv') || filename.toLowerCase().endsWith('.csv')) {
    safeContent = content
      .split(/\r?\n/)
      .map((line) =>
        line
          .split(/([;,])/)
          .map((token) => {
            if (token === ';' || token === ',') return token;
            const unquoted = token.replace(/^"|"$/g, '');
            const sanitized = sanitizeCsvCellFormula(unquoted);
            return token.startsWith('"') && token.endsWith('"') ? `"${sanitized}"` : sanitized;
          })
          .join('')
      )
      .join('\r\n');
  }
  const blob = new Blob([safeContent], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
