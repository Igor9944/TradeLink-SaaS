// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MOTEUR CENTRAL DE FACTURATION ET GESTION DOCUMENTAIRE
// Devis, Bons de commande, Confirmations, Factures, Avoirs, Reçus, BL, e-CMR
// Règles fiscales multi-juridictions (FR_UE, MA, TN, AE_GCC, INTL_EXPORT)
// Générateur PDF standard %PDF-1.4, Scellement SHA-256 & Téléchargements temporaires
// ============================================================================

import Decimal from 'decimal.js';
import {
  generateSha256Hash,
  hmacSha256Hex,
  constantTimeEqual,
  getSecureRandomAlphanumeric,
} from './securityCrypto';
import {
  CommercialDocumentRecord,
  CommercialDocumentType,
  DocumentLifecycleStatus,
  DocumentLineItem,
  DocumentPartyInfo,
  DocumentSearchFilters,
  DocumentTransportDetails,
  Locale,
  TaxJurisdictionCode,
  TaxJurisdictionConfig,
  TemporaryDownloadTokenPayload,
  UserRoleCode,
} from '../types';

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// 1. RÉFÉRENTIEL DES JURIDICTIONS FISCALES ET MENTIONS OBLIGATOIRES
// ============================================================================

export const TAX_JURISDICTIONS: Record<TaxJurisdictionCode, TaxJurisdictionConfig> = {
  FR_UE: {
    code: 'FR_UE',
    countryCode: 'FR',
    name: {
      fr: 'France / Union Européenne',
      en: 'France / European Union',
      ar: 'فرنسا / الاتحاد الأوروبي',
    },
    currency: 'EUR',
    defaultTaxRate: '20.00',
    taxRates: [
      { code: 'FR_NORMAL', label: { fr: 'TVA Normale (20%)', en: 'Standard VAT (20%)', ar: 'الضريبة العامة (20%)' }, ratePct: '20.00', isDefault: true },
      { code: 'FR_INTERMEDIAIRE', label: { fr: 'TVA Intermédiaire (10%)', en: 'Intermediate VAT (10%)', ar: 'ضريبة متوسطة (10%)' }, ratePct: '10.00' },
      { code: 'FR_REDUIT', label: { fr: 'TVA Réduite (5.5%)', en: 'Reduced VAT (5.5%)', ar: 'ضريبة مخفضة (5.5%)' }, ratePct: '5.50' },
      { code: 'FR_EXONERE', label: { fr: 'Exonéré / Autoliquidation (0%)', en: 'Exempt / Reverse Charge (0%)', ar: 'إعفاء / تصفية ذاتية (0%)' }, ratePct: '0.00' },
    ],
    mandatoryMentions: {
      fr: [
        'TVA acquittée sur les débits.',
        'Pénalités de retard : 3 fois le taux d’intérêt légal en vigueur.',
        'Indemnité forfaitaire pour frais de recouvrement en cas de retard : 40,00 € (Art. D. 441-5 C. com.).',
        'Réserve de propriété : Les marchandises restent la propriété du vendeur jusqu’au paiement intégral du prix (Loi n° 80-335).',
      ],
      en: [
        'VAT payable upon debits.',
        'Late payment penalties: 3 times the legal interest rate in force.',
        'Statutory fixed recovery compensation in case of delay: 40.00 EUR (Art. D. 441-5 French Commercial Code).',
        'Retention of title: Goods remain seller property until full price settlement.',
      ],
      ar: [
        'تستحق الضريبة على القيمة المضافة عند استحقاق الفواتير.',
        'تطبق غرامة تأخير قدرها 3 أضعاف سعر الفائدة القانوني الساري.',
        'تعويض جزافي قانوني عن مصاريف الاسترداد عند التأخير: 40.00 يورو.',
        'شرط الاحتفاظ بالملكية: تظل البضائع ملكاً للبائع حتى استيفاء الثمن كاملاً.',
      ],
    },
    numberingPrefix: {
      QUOTE: 'DEV-FR-',
      PURCHASE_ORDER: 'BC-FR-',
      ORDER_CONFIRMATION: 'CFM-FR-',
      COMMERCIAL_INVOICE: 'FAC-FR-',
      CREDIT_NOTE: 'AVR-FR-',
      PAYMENT_RECEIPT: 'REC-FR-',
      DELIVERY_NOTE: 'BL-FR-',
      TRANSPORT_DOCUMENT: 'CMR-FR-',
    },
    legalIdentityFields: [
      { key: 'taxId', label: { fr: 'N° TVA Intracommunautaire', en: 'EU VAT Number', ar: 'رقم التعريف الضريبي الأوروبي' }, required: true },
      { key: 'registrationNumber', label: { fr: 'N° SIREN / RCS', en: 'Company Registration (SIREN/RCS)', ar: 'السجل التجاري' }, required: true },
    ],
  },
  MA: {
    code: 'MA',
    countryCode: 'MA',
    name: {
      fr: 'Maroc (CGI Royaume du Maroc)',
      en: 'Morocco (General Tax Code)',
      ar: 'المملكة المغربية (المدونة العامة للضرائب)',
    },
    currency: 'MAD',
    defaultTaxRate: '20.00',
    taxRates: [
      { code: 'MA_NORMAL', label: { fr: 'TVA Normale (20%)', en: 'Standard VAT (20%)', ar: 'الضريبة العامة (20%)' }, ratePct: '20.00', isDefault: true },
      { code: 'MA_TRANSPORT', label: { fr: 'TVA Transport Fret (14%)', en: 'Freight Transport VAT (14%)', ar: 'ضريبة النقل والشحن (14%)' }, ratePct: '14.00' },
      { code: 'MA_INTERMEDIAIRE', label: { fr: 'TVA Produits Spécifiques (10%)', en: 'Specific Products VAT (10%)', ar: 'ضريبة منتجات محددة (10%)' }, ratePct: '10.00' },
      { code: 'MA_EXPORT_EXONERE', label: { fr: 'Exonération Export (Art. 92-I-1° CGI)', en: 'Export Exemption (Art. 92 CGI)', ar: 'إعفاء التصدير (المادة 92 من م.ع.ض)' }, ratePct: '0.00' },
    ],
    mandatoryMentions: {
      fr: [
        'Facture établie conformément aux dispositions de l’article 145 du Code Général des Impôts marocain.',
        'Identifiant Commun de l’Entreprise (ICE), Identifiant Fiscal (IF) et Registre de Commerce (RC) obligatoires.',
        'Exonération de TVA à l’exportation conformément à l’article 92-I-1° du CGI pour les flux internationaux.',
      ],
      en: [
        'Invoice issued under Moroccan General Tax Code Article 145 provisions.',
        'Common Enterprise Identifier (ICE), Tax ID (IF) and Commercial Register (RC) mandatory.',
        'Export VAT exemption pursuant to Article 92-I-1 of CGI for cross-border shipments.',
      ],
      ar: [
        'فاتورة صادرة وفق مقتضيات المادة 145 من المدونة العامة للضرائب بالمملكة المغربية.',
        'المعرف الموحد للمقاولة (ICE)، ورقم التعريف الضريبي (IF)، والسجل التجاري (RC) إلزامية قانوناً.',
        'إعفاء التصدير الدولي من الضريبة على القيمة المضافة طبقاً لأحكام المادة 92-I-1° من المدونة.',
      ],
    },
    numberingPrefix: {
      QUOTE: 'DEV-MA-',
      PURCHASE_ORDER: 'BC-MA-',
      ORDER_CONFIRMATION: 'CFM-MA-',
      COMMERCIAL_INVOICE: 'FAC-MA-',
      CREDIT_NOTE: 'AVR-MA-',
      PAYMENT_RECEIPT: 'REC-MA-',
      DELIVERY_NOTE: 'BL-MA-',
      TRANSPORT_DOCUMENT: 'CMR-MA-',
    },
    legalIdentityFields: [
      { key: 'taxId', label: { fr: 'ICE (Identifiant Commun)', en: 'ICE Identifier', ar: 'المعرف الموحد للمقاولة (ICE)' }, required: true },
      { key: 'registrationNumber', label: { fr: 'N° RC (Registre Commerce)', en: 'Trade Register (RC)', ar: 'رقم السجل التجاري' }, required: true },
      { key: 'taxIdentification', label: { fr: 'N° IF (Identifiant Fiscal)', en: 'Tax ID (IF)', ar: 'رقم التعريف الضريبي (IF)' }, required: true },
    ],
  },
  TN: {
    code: 'TN',
    countryCode: 'TN',
    name: {
      fr: 'Tunisie (Code TVA & Réglementation Fiscale)',
      en: 'Tunisia (VAT Code & Regulations)',
      ar: 'الجمهورية التونسية (مجلة الأداء على القيمة المضافة)',
    },
    currency: 'TND',
    defaultTaxRate: '19.00',
    fiscalStampAmount: '1.000',
    taxRates: [
      { code: 'TN_NORMAL', label: { fr: 'TVA Normale (19%)', en: 'Standard VAT (19%)', ar: 'الضريبة العامة (19%)' }, ratePct: '19.00', isDefault: true },
      { code: 'TN_INTERMEDIAIRE', label: { fr: 'TVA Services (13%)', en: 'Services VAT (13%)', ar: 'ضريبة الخدمات (13%)' }, ratePct: '13.00' },
      { code: 'TN_REDUIT', label: { fr: 'TVA Réduite (7%)', en: 'Reduced VAT (7%)', ar: 'ضريبة مخفضة (7%)' }, ratePct: '7.00' },
      { code: 'TN_SUSPENSION', label: { fr: 'Suspension de Taxe Export (0%)', en: 'Export Suspended VAT (0%)', ar: 'توقيف العمل بالأداء للتصدير (0%)' }, ratePct: '0.00' },
    ],
    mandatoryMentions: {
      fr: [
        'Facture établie selon la législation fiscale tunisienne.',
        'Droit de timbre fiscal de 1,000 TND inclus dans le montant total.',
        'Matricule Fiscal et Registre National des Entreprises (RNE) obligatoires.',
        'Opérations en suspension de taxe soumises à la présentation du bon de commande légalisé.',
      ],
      en: [
        'Invoice issued pursuant to Tunisian tax statutes.',
        'Statutory fiscal stamp duty of 1.000 TND included in the total payable balance.',
        'Tax ID (Matricule Fiscal) and National Register of Enterprises (RNE) mandatory.',
        'Suspended VAT operations subject to formalized tax exemption documentation.',
      ],
      ar: [
        'فاتورة قانونية صادرة طبقاً لمجلة الأداء على القيمة المضافة بالبلاد التونسية.',
        'معلوم الطابع الجبائي بقيمة 1.000 دينار مدمج ضمن المبلغ الإجمالي.',
        'المعرف الجبائي والسجل الوطني للمؤسسات (RNE) إلزاميان قانوناً.',
        'العمليات تحت نظام توقيف الأداء مشروطة بإذن رسمي مؤشر من مصالح الجباية.',
      ],
    },
    numberingPrefix: {
      QUOTE: 'DEV-TN-',
      PURCHASE_ORDER: 'BC-TN-',
      ORDER_CONFIRMATION: 'CFM-TN-',
      COMMERCIAL_INVOICE: 'FAC-TN-',
      CREDIT_NOTE: 'AVR-TN-',
      PAYMENT_RECEIPT: 'REC-TN-',
      DELIVERY_NOTE: 'BL-TN-',
      TRANSPORT_DOCUMENT: 'CMR-TN-',
    },
    legalIdentityFields: [
      { key: 'taxId', label: { fr: 'Matricule Fiscal (MF)', en: 'Tax ID (MF)', ar: 'المعرف الجبائي' }, required: true },
      { key: 'registrationNumber', label: { fr: 'N° Registre (RNE)', en: 'RNE Registry', ar: 'السجل الوطني للمؤسسات' }, required: true },
    ],
  },
  AE_GCC: {
    code: 'AE_GCC',
    countryCode: 'AE',
    name: {
      fr: 'Émirats Arabes Unis / GCC (FTA)',
      en: 'United Arab Emirates / GCC (FTA)',
      ar: 'الإمارات العربية المتحدة / دول مجلس التعاون (الهيئة الاتحادية للضرائب)',
    },
    currency: 'AED',
    defaultTaxRate: '5.00',
    requiresBilingualInvoice: true,
    taxRates: [
      { code: 'AE_NORMAL', label: { fr: 'TVA Standard (5%)', en: 'Standard VAT (5%)', ar: 'الضريبة القياسية (5%)' }, ratePct: '5.00', isDefault: true },
      { code: 'AE_ZERO_EXPORT', label: { fr: 'Taux Zéro Export (0%)', en: 'Zero-Rated Export (0%)', ar: 'نسبة الصفر للتصدير (0%)' }, ratePct: '0.00' },
      { code: 'AE_EXEMPT', label: { fr: 'Exempté de Taxe', en: 'Exempt Supplies', ar: 'توريدات معفاة' }, ratePct: '0.00' },
    ],
    mandatoryMentions: {
      fr: [
        'Facture Fiscale (Tax Invoice / فاتورة ضريبية) conforme au décret-loi fédéral n° (8) sur la TVA.',
        'Numéro d’enregistrement fiscal (TRN) émetteur et acheteur obligatoires.',
        'Présentation bilingue arabe et anglais obligatoire pour toute facture officielle.',
      ],
      en: [
        'Tax Invoice / فاتورة ضريبية issued under UAE Federal Decree-Law No. (8) on Value Added Tax.',
        'Tax Registration Number (TRN) for both supplier and recipient mandatory.',
        'Bilingual English / Arabic presentation mandatory under FTA guidelines.',
      ],
      ar: [
        'فاتورة ضريبية رسمية صادرة بموجب المرسوم بقانون اتحادي رقم (8) بشأن ضريبة القيمة المضافة بدولة الإمارات.',
        'رقم التسجيل الضريبي (TRN) لكل من المورد والمشتري إلزامي على الفاتورة.',
        'العرض المزدوج باللغتين العربية والإنجليزية إلزامي وفقاً لتعليمات الهيئة الاتحادية للضرائب.',
      ],
    },
    numberingPrefix: {
      QUOTE: 'DEV-AE-',
      PURCHASE_ORDER: 'PO-AE-',
      ORDER_CONFIRMATION: 'CFM-AE-',
      COMMERCIAL_INVOICE: 'INV-AE-',
      CREDIT_NOTE: 'CRN-AE-',
      PAYMENT_RECEIPT: 'RCP-AE-',
      DELIVERY_NOTE: 'BL-AE-',
      TRANSPORT_DOCUMENT: 'CMR-AE-',
    },
    legalIdentityFields: [
      { key: 'taxId', label: { fr: 'N° TRN (Tax Registration Number)', en: 'TRN Number', ar: 'رقم التسجيل الضريبي (TRN)' }, required: true },
      { key: 'registrationNumber', label: { fr: 'Licence Commerciale (Trade License)', en: 'Trade License', ar: 'الرخصة التجارية' }, required: true },
    ],
  },
  INTL_EXPORT: {
    code: 'INTL_EXPORT',
    countryCode: 'XX',
    name: {
      fr: 'Commerce International Export (Hors Juridiction)',
      en: 'Cross-Border International Export',
      ar: 'التجارة الدولية عابرة الحدود (تصدير)',
    },
    currency: 'USD',
    defaultTaxRate: '0.00',
    taxRates: [
      { code: 'INT_ZERO_EXPORT', label: { fr: 'Exportation Hors Taxe (0%)', en: 'Zero-Rated International Export (0%)', ar: 'تصدير دولي معفى (0%)' }, ratePct: '0.00', isDefault: true },
    ],
    mandatoryMentions: {
      fr: [
        'Marchandises destinées à l’exportation internationale directe — Exonération de taxe selon conventions douanières.',
        'Règles de livraison et transfert de risques régis par les Incoterms® 2020 de la Chambre de Commerce Internationale (ICC).',
        'Codes douaniers SH (Harmonized System) déclarés sous la responsabilité de l’exportateur.',
      ],
      en: [
        'Goods supplied for direct cross-border export — Zero-rated pursuant to international trade treaties.',
        'Delivery terms and risk transfer governed by ICC Incoterms® 2020 rules.',
        'Declared Harmonized System (HS) codes stated under exporter compliance responsibility.',
      ],
      ar: [
        'بضائع مخصصة للتصدير الدولي المباشر — معفاة من الضرائب بموجب المعاهدات الجمركية الدولية.',
        'شروط التسليم وانتقال المخاطر تخضع لقواعد غرفة التجارة الدولية إنكوترمز 2020.',
        'رموز التعريفة الجمركية المنسقة (HS Code) مصرح بها تحت مسؤولية المصدر القانونية.',
      ],
    },
    numberingPrefix: {
      QUOTE: 'DEV-INT-',
      PURCHASE_ORDER: 'PO-INT-',
      ORDER_CONFIRMATION: 'CFM-INT-',
      COMMERCIAL_INVOICE: 'INV-INT-',
      CREDIT_NOTE: 'CRN-INT-',
      PAYMENT_RECEIPT: 'RCP-INT-',
      DELIVERY_NOTE: 'BL-INT-',
      TRANSPORT_DOCUMENT: 'CMR-INT-',
    },
    legalIdentityFields: [
      { key: 'taxId', label: { fr: 'Identifiant Export / EORI / Tax ID', en: 'Export ID / EORI', ar: 'معرف التصدير الجمركي' }, required: true },
      { key: 'registrationNumber', label: { fr: 'Registre de Commerce International', en: 'Business Registration', ar: 'السجل التجاري' }, required: true },
    ],
  },
};

// ============================================================================
// 2. MOTEUR ARITHMÉTIQUE DÉTERMINISTE (DECIMAL.JS) & MONTANTS EN TOUTES LETTRES
// ============================================================================

export class BillingDocumentEngine {
  private static sequenceCounters: Map<string, number> = new Map();

  /**
   * Génération d'un numéro de document unique, séquentiel et inviolable
   */
  public static generateDocumentNumber(
    type: CommercialDocumentType,
    jurisdiction: TaxJurisdictionCode,
    year = new Date().getFullYear()
  ): string {
    const config = TAX_JURISDICTIONS[jurisdiction] || TAX_JURISDICTIONS.FR_UE;
    const prefix = config.numberingPrefix[type] || 'DOC-';
    const key = `${prefix}${year}`;

    const current = (this.sequenceCounters.get(key) || 0) + 1;
    this.sequenceCounters.set(key, current);

    const paddedSeq = String(current).padStart(5, '0');
    return `${prefix}${year}-${paddedSeq}`;
  }

  /**
   * Calcul déterministe complet des lignes et totaux d'un document
   */
  public static calculateDocumentTotals(
    lines: {
      sku: string;
      description: Record<Locale, string>;
      quantity: number;
      unit: string;
      unitPrice: string;
      discountPct?: string;
      taxRatePct?: string;
      hsCode?: string;
    }[],
    jurisdiction: TaxJurisdictionCode,
    shippingAmountStr = '0.00',
    currency = 'EUR'
  ): {
    calculatedLines: DocumentLineItem[];
    subtotalHt: string;
    totalDiscountAmount: string;
    netCommercialHt: string;
    shippingAmount: string;
    taxBreakdown: { ratePct: string; taxableBase: string; taxAmount: string }[];
    totalTaxAmount: string;
    fiscalStampAmount?: string;
    totalTtc: string;
    amountInWords: Record<Locale, string>;
  } {
    const config = TAX_JURISDICTIONS[jurisdiction] || TAX_JURISDICTIONS.FR_UE;
    const defaultTaxRate = config.defaultTaxRate;

    let subtotalHtDec = new Decimal(0);
    let totalDiscountDec = new Decimal(0);
    let netCommercialHtDec = new Decimal(0);

    const taxBasesMap = new Map<string, Decimal>();

    const calculatedLines: DocumentLineItem[] = lines.map((l, idx) => {
      const qtyDec = new Decimal(l.quantity);
      const unitPriceDec = new Decimal(l.unitPrice);
      const discountPctDec = new Decimal(l.discountPct || '0.00');
      const taxRateDec = new Decimal(l.taxRatePct !== undefined ? l.taxRatePct : defaultTaxRate);

      const grossLineHt = qtyDec.times(unitPriceDec);
      const discountLine = grossLineHt.times(discountPctDec).dividedBy(100);
      const netLineHt = grossLineHt.minus(discountLine).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      const lineTaxAmount = netLineHt.times(taxRateDec).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const lineTtc = netLineHt.plus(lineTaxAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      subtotalHtDec = subtotalHtDec.plus(grossLineHt);
      totalDiscountDec = totalDiscountDec.plus(discountLine);
      netCommercialHtDec = netCommercialHtDec.plus(netLineHt);

      const rateKey = taxRateDec.toFixed(2);
      const existingBase = taxBasesMap.get(rateKey) || new Decimal(0);
      taxBasesMap.set(rateKey, existingBase.plus(netLineHt));

      return {
        id: `line-${idx + 1}-${Date.now()}`,
        sku: l.sku,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: unitPriceDec.toFixed(2),
        discountPct: discountPctDec.toFixed(2),
        taxRatePct: taxRateDec.toFixed(2),
        taxAmount: lineTaxAmount.toFixed(2),
        totalLineHt: netLineHt.toFixed(2),
        totalLineTtc: lineTtc.toFixed(2),
        hsCode: l.hsCode,
      };
    });

    const shippingDec = new Decimal(shippingAmountStr || '0.00');

    // Ventilation fiscale déterministe
    const taxBreakdown: { ratePct: string; taxableBase: string; taxAmount: string }[] = [];
    let totalTaxDec = new Decimal(0);

    for (const [ratePctStr, baseDec] of taxBasesMap.entries()) {
      const rateDec = new Decimal(ratePctStr);
      const taxAmountDec = baseDec.times(rateDec).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalTaxDec = totalTaxDec.plus(taxAmountDec);

      taxBreakdown.push({
        ratePct: ratePctStr,
        taxableBase: baseDec.toFixed(2),
        taxAmount: taxAmountDec.toFixed(2),
      });
    }

    // Gestion du droit de timbre fiscal (ex: 1.000 TND pour la Tunisie)
    let stampDec = new Decimal(0);
    if (config.fiscalStampAmount) {
      stampDec = new Decimal(config.fiscalStampAmount);
    }

    const totalTtcDec = netCommercialHtDec
      .plus(shippingDec)
      .plus(totalTaxDec)
      .plus(stampDec)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const amountInWords = this.convertAmountToWords(totalTtcDec.toFixed(2), currency);

    return {
      calculatedLines,
      subtotalHt: subtotalHtDec.toFixed(2),
      totalDiscountAmount: totalDiscountDec.toFixed(2),
      netCommercialHt: netCommercialHtDec.toFixed(2),
      shippingAmount: shippingDec.toFixed(2),
      taxBreakdown,
      totalTaxAmount: totalTaxDec.toFixed(2),
      fiscalStampAmount: config.fiscalStampAmount ? stampDec.toFixed(3) : undefined,
      totalTtc: totalTtcDec.toFixed(2),
      amountInWords,
    };
  }

  /**
   * Traduction déterministe d'un montant en toutes lettres (FR, EN, AR)
   */
  public static convertAmountToWords(amountStr: string, currency: string): Record<Locale, string> {
    const parts = amountStr.split('.');
    const integerPart = parseInt(parts[0], 10) || 0;
    const decimalPart = parts[1] ? parseInt(parts[1].slice(0, 2), 10) : 0;

    const currUpper = currency.toUpperCase();
    const currFr = currUpper === 'EUR' ? 'euros' : currUpper === 'USD' ? 'dollars américains' : currUpper === 'TND' ? 'dinars tunisiens' : 'dirhams marocains';
    const currEn = currUpper === 'EUR' ? 'euros' : currUpper === 'USD' ? 'US dollars' : currUpper === 'TND' ? 'Tunisian dinars' : 'Moroccan dirhams';
    const currAr = currUpper === 'EUR' ? 'يورو' : currUpper === 'USD' ? 'دولار أمريكي' : currUpper === 'TND' ? 'دينار تونسي' : 'درهم مغربي';

    const frWords = `${this.integerToFrenchWords(integerPart)} ${currFr} et ${decimalPart}/100`;
    const enWords = `${this.integerToEnglishWords(integerPart)} ${currEn} and ${decimalPart}/100`;
    const arWords = `${this.integerToArabicWords(integerPart)} ${currAr} و ${decimalPart} سنتيماً لا غير`;

    return {
      fr: frWords.charAt(0).toUpperCase() + frWords.slice(1),
      en: enWords.charAt(0).toUpperCase() + enWords.slice(1),
      ar: arWords,
    };
  }

  private static integerToFrenchWords(n: number): string {
    if (n === 0) return 'zéro';
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const rem = n % 10;
      if (ten === 7) return `soixante-${teens[rem]}`;
      if (ten === 9) return `quatre-vingt-${teens[rem]}`;
      if (rem === 0) return tens[ten];
      if (rem === 1 && ten < 8) return `${tens[ten]} et un`;
      return `${tens[ten]}-${units[rem]}`;
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rem = n % 100;
      const hStr = hundred === 1 ? 'cent' : `${units[hundred]} cents`;
      return rem === 0 ? hStr : `${hundred === 1 ? 'cent' : units[hundred] + ' cent'} ${this.integerToFrenchWords(rem)}`;
    }
    if (n < 1000000) {
      const thousand = Math.floor(n / 1000);
      const rem = n % 1000;
      const tStr = thousand === 1 ? 'mille' : `${this.integerToFrenchWords(thousand)} mille`;
      return rem === 0 ? tStr : `${tStr} ${this.integerToFrenchWords(rem)}`;
    }
    const million = Math.floor(n / 1000000);
    const rem = n % 1000000;
    const mStr = million === 1 ? 'un million' : `${this.integerToFrenchWords(million)} millions`;
    return rem === 0 ? mStr : `${mStr} ${this.integerToFrenchWords(rem)}`;
  }

  private static integerToEnglishWords(n: number): string {
    if (n === 0) return 'zero';
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const rem = n % 10;
      return rem === 0 ? tens[Math.floor(n / 10)] : `${tens[Math.floor(n / 10)]}-${units[rem]}`;
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rem = n % 100;
      return rem === 0 ? `${units[hundred]} hundred` : `${units[hundred]} hundred and ${this.integerToEnglishWords(rem)}`;
    }
    if (n < 1000000) {
      const thousand = Math.floor(n / 1000);
      const rem = n % 1000;
      return rem === 0 ? `${this.integerToEnglishWords(thousand)} thousand` : `${this.integerToEnglishWords(thousand)} thousand ${this.integerToEnglishWords(rem)}`;
    }
    const million = Math.floor(n / 1000000);
    const rem = n % 1000000;
    return rem === 0 ? `${this.integerToEnglishWords(million)} million` : `${this.integerToEnglishWords(million)} million ${this.integerToEnglishWords(rem)}`;
  }

  private static integerToArabicWords(n: number): string {
    if (n === 0) return 'صفر';
    if (n >= 1000000) {
      const mil = Math.floor(n / 1000000);
      const rem = n % 1000000;
      return rem === 0 ? `${this.integerToArabicWords(mil)} مليون` : `${this.integerToArabicWords(mil)} مليون و${this.integerToArabicWords(rem)}`;
    }
    if (n >= 1000) {
      const thou = Math.floor(n / 1000);
      const rem = n % 1000;
      return rem === 0 ? `${this.integerToArabicWords(thou)} ألف` : `${this.integerToArabicWords(thou)} ألف و${this.integerToArabicWords(rem)}`;
    }
    if (n >= 100) {
      const hund = Math.floor(n / 100);
      const rem = n % 100;
      const hundWords = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
      return rem === 0 ? hundWords[hund] : `${hundWords[hund]} و${this.integerToArabicWords(rem)}`;
    }
    const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    if (n === 10) return 'عشرة';
    if (n === 11) return 'أحد عشر';
    if (n === 12) return 'اثنا عشر';
    if (n < 20) return `${units[n - 10]} عشر`;
    const unitDigit = n % 10;
    const tenDigit = Math.floor(n / 10);
    return unitDigit === 0 ? tens[tenDigit] : `${units[unitDigit]} و${tens[tenDigit]}`;
  }

  // ============================================================================
  // 3. SCELLEMENT NUMÉRIQUE SHA-256 ET IMMUTABILITÉ FISCALE
  // ============================================================================

  /**
   * Calcul d'une empreinte cryptographique SHA-256 infalsifiable pour un document
   */
  public static computeDigitalSealSha256(doc: Omit<CommercialDocumentRecord, 'digitalSealSha256'>): string {
    const linesDigest = doc.lines
      .map((l) => `${l.sku}:${l.quantity}:${l.unitPrice}:${l.discountPct}:${l.taxRatePct}:${l.totalLineHt}`)
      .join('|');

    const rawPayload = [
      doc.documentNumber,
      doc.documentType,
      doc.jurisdiction,
      doc.issuer.taxId || doc.issuer.companyName,
      doc.recipient.taxId || doc.recipient.companyName,
      doc.netCommercialHt,
      doc.totalTaxAmount,
      doc.totalTtc,
      doc.currency,
      doc.issuedAt,
      linesDigest,
    ].join('||');

    return generateSha256Hash(`seal:${rawPayload}`);
  }

  /**
   * Vérification de l'intégrité scellée d'un document
   */
  public static verifyDocumentSeal(doc: CommercialDocumentRecord): boolean {
    const expectedSeal = this.computeDigitalSealSha256(doc);
    return doc.digitalSealSha256 === expectedSeal;
  }

  // ============================================================================
  // 4. CRÉATION DES 7 TYPES DE DOCUMENTS COMMERCIAUX
  // ============================================================================

  /**
   * Création générique d'un document commercial complet
   */
  public static createCommercialDocument(input: {
    documentType: CommercialDocumentType;
    jurisdiction: TaxJurisdictionCode;
    issuer: DocumentPartyInfo;
    recipient: DocumentPartyInfo;
    carrier?: DocumentPartyInfo;
    lines: {
      sku: string;
      description: Record<Locale, string>;
      quantity: number;
      unit: string;
      unitPrice: string;
      discountPct?: string;
      taxRatePct?: string;
      hsCode?: string;
    }[];
    orderId?: string;
    orderNumber?: string;
    quoteId?: string;
    quoteNumber?: string;
    originalInvoiceId?: string;
    originalInvoiceNumber?: string;
    creditNoteReason?: string;
    paymentId?: string;
    paymentReference?: string;
    shipmentId?: string;
    trackingNumber?: string;
    shippingAmount?: string;
    currency?: string;
    validityDays?: number;
    dueInDays?: number;
    incoterm?: string;
    incotermLocation?: string;
    transportDetails?: DocumentTransportDetails;
    createdByUserId: string;
    createdByUserName: string;
    status?: DocumentLifecycleStatus;
  }): CommercialDocumentRecord {
    const config = TAX_JURISDICTIONS[input.jurisdiction] || TAX_JURISDICTIONS.FR_UE;
    const currency = input.currency || config.currency;
    const documentNumber = this.generateDocumentNumber(input.documentType, input.jurisdiction);
    const issuedAt = new Date().toISOString();

    let dueAt: string | undefined;
    if (input.dueInDays) {
      const d = new Date();
      d.setDate(d.getDate() + input.dueInDays);
      dueAt = d.toISOString().split('T')[0];
    } else if (input.documentType === 'COMMERCIAL_INVOICE') {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      dueAt = d.toISOString().split('T')[0];
    }

    let validUntil: string | undefined;
    if (input.validityDays) {
      const d = new Date();
      d.setDate(d.getDate() + input.validityDays);
      validUntil = d.toISOString().split('T')[0];
    }

    const totals = this.calculateDocumentTotals(
      input.lines,
      input.jurisdiction,
      input.shippingAmount || '0.00',
      currency
    );

    const docDraft: Omit<CommercialDocumentRecord, 'digitalSealSha256'> = {
      id: `doc-${Date.now()}-${getSecureRandomAlphanumeric(5)}`,
      documentType: input.documentType,
      documentNumber,
      version: 1,
      status: input.status || 'ISSUED',
      jurisdiction: input.jurisdiction,
      issuedAt,
      dueAt,
      validUntil,
      deliveryDate: input.transportDetails ? new Date().toISOString().split('T')[0] : undefined,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      quoteId: input.quoteId,
      quoteNumber: input.quoteNumber,
      originalInvoiceId: input.originalInvoiceId,
      originalInvoiceNumber: input.originalInvoiceNumber,
      creditNoteReason: input.creditNoteReason,
      paymentId: input.paymentId,
      paymentReference: input.paymentReference,
      shipmentId: input.shipmentId,
      trackingNumber: input.trackingNumber,
      issuer: input.issuer,
      recipient: input.recipient,
      carrier: input.carrier,
      lines: totals.calculatedLines,
      subtotalHt: totals.subtotalHt,
      totalDiscountAmount: totals.totalDiscountAmount,
      netCommercialHt: totals.netCommercialHt,
      shippingAmount: totals.shippingAmount,
      taxBreakdown: totals.taxBreakdown,
      totalTaxAmount: totals.totalTaxAmount,
      fiscalStampAmount: totals.fiscalStampAmount,
      totalTtc: totals.totalTtc,
      currency,
      amountInWords: totals.amountInWords,
      incoterm: input.incoterm || 'DAP',
      incotermLocation: input.incotermLocation || input.recipient.city,
      paymentTerms: {
        fr: 'Règlement à 30 jours par virement bancaire ou carte corporate',
        en: 'Settlement within 30 days via bank wire or corporate card',
        ar: 'السداد خلال 30 يوماً عبر تحويل بنكي أو بطاقة تجارية',
      },
      latePaymentPenalties: {
        fr: config.mandatoryMentions.fr.join(' '),
        en: config.mandatoryMentions.en.join(' '),
        ar: config.mandatoryMentions.ar.join(' '),
      },
      legalNotice: {
        fr: `Document émis sous la juridiction : ${config.name.fr}`,
        en: `Document issued under jurisdiction: ${config.name.en}`,
        ar: `وثيقة قانونية صادرة بموجب: ${config.name.ar}`,
      },
      transportDetails: input.transportDetails,
      qrPayload: `TRADELINK|${documentNumber}|${input.documentType}|${totals.totalTtc}|${currency}|${issuedAt}`,
      isArchived: false,
      createdAt: issuedAt,
      updatedAt: issuedAt,
      createdByUserId: input.createdByUserId,
      createdByUserName: input.createdByUserName,
      revisionHistory: [
        {
          version: 1,
          modifiedAt: issuedAt,
          modifiedBy: input.createdByUserName,
          changeNote: `Émission initiale certifiée du document ${documentNumber}`,
        },
      ],
    };

    const digitalSealSha256 = this.computeDigitalSealSha256(docDraft);

    return {
      ...docDraft,
      digitalSealSha256,
    };
  }

  /**
   * Émission d'une Facture d'Avoir (Credit Note) pour annuler ou rectifier une facture
   * Règle d'inviolabilité : Une facture émise ne peut être modifiée ni supprimée
   */
  public static createCreditNoteFromInvoice(
    originalInvoice: CommercialDocumentRecord,
    reason: string,
    actor: { id: string; name: string; role: UserRoleCode },
    partialLines?: { sku: string; quantity: number }[]
  ): { creditNote: CommercialDocumentRecord; updatedOriginalInvoice: CommercialDocumentRecord } {
    if (originalInvoice.documentType !== 'COMMERCIAL_INVOICE') {
      throw new Error(`Seule une facture (COMMERCIAL_INVOICE) peut faire l’objet d’un avoir (statut actuel: ${originalInvoice.documentType}).`);
    }
    if (originalInvoice.status === 'CANCELLED') {
      throw new Error(`La facture ${originalInvoice.documentNumber} est déjà annulée par un avoir précédent.`);
    }
    if (!reason || reason.trim().length < 8) {
      throw new Error('Un motif détaillé d’au moins 8 caractères est requis pour émettre un avoir légal.');
    }

    const linesToCredit = partialLines
      ? originalInvoice.lines.filter((l) => partialLines.some((p) => p.sku === l.sku))
      : originalInvoice.lines;

    const creditLinesInput = linesToCredit.map((l) => {
      const matchPartial = partialLines?.find((p) => p.sku === l.sku);
      const qty = matchPartial ? matchPartial.quantity : l.quantity;
      return {
        sku: l.sku,
        description: l.description,
        quantity: qty,
        unit: l.unit,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
        hsCode: l.hsCode,
      };
    });

    const isFullCancellation = !partialLines || linesToCredit.length === originalInvoice.lines.length;

    const creditNote = this.createCommercialDocument({
      documentType: 'CREDIT_NOTE',
      jurisdiction: originalInvoice.jurisdiction,
      issuer: originalInvoice.issuer,
      recipient: originalInvoice.recipient,
      lines: creditLinesInput,
      orderId: originalInvoice.orderId,
      orderNumber: originalInvoice.orderNumber,
      originalInvoiceId: originalInvoice.id,
      originalInvoiceNumber: originalInvoice.documentNumber,
      creditNoteReason: reason.trim(),
      shippingAmount: isFullCancellation ? originalInvoice.shippingAmount : '0.00',
      currency: originalInvoice.currency,
      createdByUserId: actor.id,
      createdByUserName: actor.name,
      status: 'ISSUED',
    });

    const updatedOriginalInvoice: CommercialDocumentRecord = {
      ...originalInvoice,
      status: isFullCancellation ? 'CANCELLED' : originalInvoice.status,
      updatedAt: new Date().toISOString(),
      revisionHistory: [
        ...(originalInvoice.revisionHistory || []),
        {
          version: originalInvoice.version + 1,
          modifiedAt: new Date().toISOString(),
          modifiedBy: actor.name,
          changeNote: `Facture d’avoir émise : ${creditNote.documentNumber} (Motif : ${reason.trim()})`,
        },
      ],
    };

    return { creditNote, updatedOriginalInvoice };
  }

  // ============================================================================
  // 5. GÉNÉRATEUR PDF PROFESSIONNEL STANDARD %PDF-1.4 (STANDALONE TYPESCRIPT)
  // ============================================================================

  /**
   * Génère un buffer binaire standard %PDF-1.4 avec structure conforme
   */
  public static generateStandardPdfBuffer(
    doc: CommercialDocumentRecord,
    targetLocale: Locale = 'fr'
  ): Buffer {
    const titleMap: Record<CommercialDocumentType, Record<Locale, string>> = {
      QUOTE: { fr: 'DEVIS COMMERCIAL', en: 'PROFORMA QUOTE', ar: 'عرض أسعار تجاري' },
      PURCHASE_ORDER: { fr: 'BON DE COMMANDE', en: 'PURCHASE ORDER', ar: 'سند طلبية شراء' },
      ORDER_CONFIRMATION: { fr: 'CONFIRMATION DE COMMANDE', en: 'ORDER CONFIRMATION', ar: 'تأكيد الطلبية' },
      COMMERCIAL_INVOICE: { fr: 'FACTURE COMMERCIALE', en: 'COMMERCIAL INVOICE', ar: 'فاتورة تجارية' },
      CREDIT_NOTE: { fr: 'FACTURE D’AVOIR', en: 'CREDIT NOTE', ar: 'فاتورة دائنة (إشعار خصم)' },
      PAYMENT_RECEIPT: { fr: 'REÇU DE PAIEMENT CERTIFIÉ', en: 'CERTIFIED PAYMENT RECEIPT', ar: 'وصل استلام دفع معتمد' },
      DELIVERY_NOTE: { fr: 'BON DE LIVRAISON', en: 'DELIVERY PACKING SLIP', ar: 'سند تسليم وشحن' },
      TRANSPORT_DOCUMENT: { fr: 'LETTRE DE VOITURE INTERNATIONALE (e-CMR)', en: 'INTERNATIONAL CONSIGNMENT NOTE (e-CMR)', ar: 'سند نقل دولي (e-CMR)' },
    };

    const docTitle = titleMap[doc.documentType][targetLocale] || titleMap[doc.documentType].fr;
    const jurConfig = TAX_JURISDICTIONS[doc.jurisdiction] || TAX_JURISDICTIONS.FR_UE;

    // Construction d'une séquence de commandes graphiques PDF textuelles
    const contentLines: string[] = [];

    // Bannière Titre
    contentLines.push('q');
    contentLines.push('0.05 0.15 0.35 rg'); // Bleu TRADELINK
    contentLines.push('20 780 555 42 re');
    contentLines.push('f');
    contentLines.push('1 1 1 rg');
    contentLines.push('BT');
    contentLines.push('/F2 16 Tf');
    contentLines.push('30 798 Td');
    contentLines.push(`(TRADELINK GLOBAL B2B - ${this.escapePdfString(docTitle)}) Tj`);
    contentLines.push('ET');

    // Métadonnées document
    contentLines.push('0 0 0 rg');
    contentLines.push('BT');
    contentLines.push('/F2 11 Tf');
    contentLines.push('30 750 Td');
    contentLines.push(`(Document N: ${this.escapePdfString(doc.documentNumber)}) Tj`);
    contentLines.push('/F1 9 Tf');
    contentLines.push('0 -14 Td');
    contentLines.push(`(Date: ${doc.issuedAt.slice(0, 10)}  |  Echeance: ${doc.dueAt || 'A reception'}  |  Devise: ${doc.currency}) Tj`);
    contentLines.push('0 -14 Td');
    contentLines.push(`(Juridiction: ${this.escapePdfString(jurConfig.name.fr)}  |  Incoterm: ${doc.incoterm || 'DAP'} ${this.escapePdfString(doc.incotermLocation || '')}) Tj`);
    if (doc.orderNumber) {
      contentLines.push('0 -14 Td');
      contentLines.push(`(Reference Commande: ${this.escapePdfString(doc.orderNumber)}) Tj`);
    }
    if (doc.originalInvoiceNumber) {
      contentLines.push('0 -14 Td');
      contentLines.push(`(Reference Facture d'Origine: ${this.escapePdfString(doc.originalInvoiceNumber)} - Motif: ${this.escapePdfString(doc.creditNoteReason || '')}) Tj`);
    }
    contentLines.push('ET');

    // Boîtes Émetteur & Destinataire
    contentLines.push('0.95 0.95 0.97 rg');
    contentLines.push('30 600 250 80 re'); // Émetteur
    contentLines.push('305 600 270 80 re'); // Destinataire
    contentLines.push('f');

    contentLines.push('0 0 0 rg');
    // Émetteur texte
    contentLines.push('BT');
    contentLines.push('/F2 10 Tf');
    contentLines.push('40 662 Td');
    contentLines.push(`(EMETTEUR: ${this.escapePdfString(doc.issuer.companyName)}) Tj`);
    contentLines.push('/F1 8 Tf');
    contentLines.push('0 -12 Td');
    contentLines.push(`(Adresse: ${this.escapePdfString(doc.issuer.address)}, ${this.escapePdfString(doc.issuer.city)} (${doc.issuer.country})) Tj`);
    contentLines.push('0 -12 Td');
    contentLines.push(`(ID Fiscal: ${this.escapePdfString(doc.issuer.taxId || 'N/A')}  |  Reg: ${this.escapePdfString(doc.issuer.registrationNumber || 'N/A')}) Tj`);
    contentLines.push('0 -12 Td');
    contentLines.push(`(Email: ${this.escapePdfString(doc.issuer.email)}) Tj`);
    contentLines.push('ET');

    // Destinataire texte
    contentLines.push('BT');
    contentLines.push('/F2 10 Tf');
    contentLines.push('315 662 Td');
    contentLines.push(`(DESTINATAIRE: ${this.escapePdfString(doc.recipient.companyName)}) Tj`);
    contentLines.push('/F1 8 Tf');
    contentLines.push('0 -12 Td');
    contentLines.push(`(Adresse: ${this.escapePdfString(doc.recipient.address)}, ${this.escapePdfString(doc.recipient.city)} (${doc.recipient.country})) Tj`);
    contentLines.push('0 -12 Td');
    contentLines.push(`(ID Fiscal: ${this.escapePdfString(doc.recipient.taxId || 'N/A')}  |  Email: ${this.escapePdfString(doc.recipient.email)}) Tj`);
    contentLines.push('ET');

    // Tableau Lignes Produits (Header)
    contentLines.push('0.1 0.2 0.4 rg');
    contentLines.push('30 560 545 20 re');
    contentLines.push('f');
    contentLines.push('1 1 1 rg');
    contentLines.push('BT');
    contentLines.push('/F2 8 Tf');
    contentLines.push('40 566 Td');
    contentLines.push('(SKU) Tj');
    contentLines.push('80 0 Td');
    contentLines.push('(DESIGNATION) Tj');
    contentLines.push('190 0 Td');
    contentLines.push('(QTE) Tj');
    contentLines.push('40 0 Td');
    contentLines.push('(PRIX U. HT) Tj');
    contentLines.push('60 0 Td');
    contentLines.push('(REMISE) Tj');
    contentLines.push('50 0 Td');
    contentLines.push('(TVA) Tj');
    contentLines.push('50 0 Td');
    contentLines.push('(TOTAL HT) Tj');
    contentLines.push('ET');

    // Lignes Produits
    let curY = 540;
    doc.lines.slice(0, 10).forEach((l, i) => {
      if (i % 2 === 1) {
        contentLines.push('0.97 0.97 0.99 rg');
        contentLines.push(`30 ${curY - 4} 545 16 re`);
        contentLines.push('f');
      }
      contentLines.push('0 0 0 rg');
      contentLines.push('BT');
      contentLines.push('/F1 8 Tf');
      contentLines.push(`40 ${curY} Td`);
      contentLines.push(`(${this.escapePdfString(l.sku)}) Tj`);
      contentLines.push('80 0 Td');
      const desc = l.description[targetLocale] || l.description.fr || l.sku;
      contentLines.push(`(${this.escapePdfString(desc.slice(0, 32))}) Tj`);
      contentLines.push('190 0 Td');
      contentLines.push(`(${l.quantity} ${l.unit}) Tj`);
      contentLines.push('40 0 Td');
      contentLines.push(`(${l.unitPrice}) Tj`);
      contentLines.push('60 0 Td');
      contentLines.push(`(${l.discountPct}%) Tj`);
      contentLines.push('50 0 Td');
      contentLines.push(`(${l.taxRatePct}%) Tj`);
      contentLines.push('50 0 Td');
      contentLines.push(`(${l.totalLineHt} ${doc.currency}) Tj`);
      contentLines.push('ET');
      curY -= 16;
    });

    // Bloc Totaux & Fiscalité
    const boxY = Math.max(curY - 20, 220);
    contentLines.push('0.92 0.94 0.98 rg');
    contentLines.push(`330 ${boxY - 80} 245 90 re`);
    contentLines.push('f');

    contentLines.push('0 0 0 rg');
    contentLines.push('BT');
    contentLines.push('/F1 8 Tf');
    contentLines.push(`340 ${boxY} Td`);
    contentLines.push(`(Sous-Total Brut HT: ${doc.subtotalHt} ${doc.currency}) Tj`);
    contentLines.push('0 -12 Td');
    contentLines.push(`(Total Remises Commerciales: -${doc.totalDiscountAmount} ${doc.currency}) Tj`);
    contentLines.push('0 -12 Td');
    contentLines.push(`(Net Commercial HT: ${doc.netCommercialHt} ${doc.currency}) Tj`);
    contentLines.push('0 -12 Td');
    contentLines.push(`(Frais d'Expedition & Fret: ${doc.shippingAmount} ${doc.currency}) Tj`);
    contentLines.push('0 -12 Td');
    contentLines.push(`(Total TVA / Taxes: ${doc.totalTaxAmount} ${doc.currency}) Tj`);
    if (doc.fiscalStampAmount) {
      contentLines.push('0 -12 Td');
      contentLines.push(`(Timbre Fiscal: ${doc.fiscalStampAmount} ${doc.currency}) Tj`);
    }
    contentLines.push('0 -14 Td');
    contentLines.push('/F2 10 Tf');
    contentLines.push(`(TOTAL TTC A PAYER: ${doc.totalTtc} ${doc.currency}) Tj`);
    contentLines.push('ET');

    // Montant en toutes lettres
    contentLines.push('BT');
    contentLines.push('/F2 8 Tf');
    contentLines.push(`30 ${boxY - 40} Td`);
    contentLines.push(`(Arrete la presente facture a la somme de:) Tj`);
    contentLines.push('/F1 8 Tf');
    contentLines.push('0 -12 Td');
    contentLines.push(`(${this.escapePdfString(doc.amountInWords[targetLocale] || doc.amountInWords.fr)}) Tj`);
    contentLines.push('ET');

    // Mentions Légales & Sceau Cryptographique SHA-256
    contentLines.push('0.92 0.92 0.92 rg');
    contentLines.push('30 50 545 65 re');
    contentLines.push('f');

    contentLines.push('0 0 0 rg');
    contentLines.push('BT');
    contentLines.push('/F2 7 Tf');
    contentLines.push('35 102 Td');
    contentLines.push(`(CONDITIONS COMMERCIALES & MENTIONS OBLIGATOIRES - ${this.escapePdfString(jurConfig.name.fr)}) Tj`);
    contentLines.push('/F1 6 Tf');
    const legalNotices = jurConfig.mandatoryMentions[targetLocale] || jurConfig.mandatoryMentions.fr;
    legalNotices.slice(0, 3).forEach((notice) => {
      contentLines.push('0 -9 Td');
      contentLines.push(`(- ${this.escapePdfString(notice.slice(0, 110))}) Tj`);
    });
    contentLines.push('0 -9 Td');
    contentLines.push(`(SCELLEMENT NUMERIQUE SHA-256: ${doc.digitalSealSha256}) Tj`);
    contentLines.push('ET');
    contentLines.push('Q');

    const streamContent = contentLines.join('\n');
    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    // Construction du document PDF standardisé avec catalogue et xref
    const objects: string[] = [
      '%PDF-1.4\n',
      // Obj 1: Catalog
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      // Obj 2: Pages
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      // Obj 3: Page (A4 standard: 595.28 x 841.89 points)
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
      // Obj 4: Content Stream
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
      // Obj 5: Font F1 (Helvetica Regular)
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      // Obj 6: Font F2 (Helvetica Bold)
      '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    ];

    let offset = 0;
    const xrefOffsets: number[] = [0];

    for (let i = 0; i < objects.length; i++) {
      if (i > 0) {
        xrefOffsets.push(offset);
      }
      offset += Buffer.byteLength(objects[i], 'utf8');
    }

    const xrefStart = offset;
    let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < xrefOffsets.length; i++) {
      xref += String(xrefOffsets[i]).padStart(10, '0') + ' 00000 n \n';
    }

    const trailer = `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    const fullPdf = objects.join('') + xref + trailer;
    return Buffer.from(fullPdf, 'utf8');
  }

  private static escapePdfString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n]+/g, ' ');
  }

  // ============================================================================
  // 6. GESTION DES TÉLÉCHARGEMENTS SÉCURISÉS (URL PRÉSIGNÉES TEMPORAIRES - 900s)
  // ============================================================================

  /**
   * Génération d'un token d'accès temporaire signé HMAC-SHA256 (expiration 15 min / 900 s)
   */
  public static generateTemporaryDownloadToken(
    documentId: string,
    documentNumber: string,
    userId: string,
    secretKey: string,
    expirySeconds = 900
  ): TemporaryDownloadTokenPayload {
    const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
    const rawPayload = `${documentId}|${documentNumber}|${userId}|${expiresAt}`;
    let hmacSignature: string;
    try {
      hmacSignature = hmacSha256Hex(secretKey, rawPayload);
    } catch {
      throw new Error('DOWNLOAD_TOKEN_SIGNING_FAILED');
    }

    return {
      documentId,
      documentNumber,
      userId,
      expiresAt,
      hmacSignature,
    };
  }

  /**
   * Vérification cryptographique et d'horodatage d'un token de téléchargement
   */
  public static verifyTemporaryDownloadToken(
    documentId: string,
    documentNumber: string,
    userId: string,
    expiresAt: number,
    hmacSignature: string,
    secretKey: string
  ): { valid: boolean; reason?: string } {
    const nowSec = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(expiresAt) || expiresAt <= 0 || nowSec > expiresAt) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    const rawPayload = `${documentId}|${documentNumber}|${userId}|${expiresAt}`;
    let expectedSignature: string;
    try {
      expectedSignature = hmacSha256Hex(secretKey, rawPayload);
    } catch {
      return { valid: false, reason: 'SIGNATURE_INVALID' };
    }

    const isMatch = constantTimeEqual(hmacSignature, expectedSignature);
    return isMatch ? { valid: true } : { valid: false, reason: 'SIGNATURE_INVALID' };
  }

  // ============================================================================
  // 7. SÉCURITÉ & CONTRÔLE D'ACCÈS RBAC (ANTI-IDOR & DROITS COMPTABLES STAGE 3)
  // ============================================================================

  /**
   * Vérifie formellement si l'utilisateur est autorisé à consulter/télécharger le document
   */
  public static enforceDocumentAccess(
    actor: { id: string; email: string; role: UserRoleCode },
    document: CommercialDocumentRecord,
    action: 'VIEW' | 'DOWNLOAD' | 'CREATE_CREDIT_NOTE' | 'ARCHIVE'
  ): void {
    // 1. Administrateur a un droit de supervision global
    if (actor.role === 'ADMIN') {
      return;
    }

    // 2. Règle Stage 3 Comptable : Lecture seule stricte sur les documents fiscaux
    if (actor.role === 'COMPTABLE') {
      if (action === 'CREATE_CREDIT_NOTE' || action === 'ARCHIVE') {
        throw new Error(
          'ACCÈS REFUSÉ (Stage 3 Cahier des Charges) : Le profil COMPTABLE dispose uniquement d’un droit de consultation/lecture seule. La création d’avoirs et l’archivage sont réservés au Fournisseur émetteur et à l’Administrateur.'
        );
      }
      return; // Autorisé en VIEW / DOWNLOAD
    }

    // 3. Client : cloisonnement strict à ses documents
    if (actor.role === 'CLIENT') {
      if (action === 'CREATE_CREDIT_NOTE' || action === 'ARCHIVE') {
        throw new Error('ACCÈS REFUSÉ : Le Client ne peut ni émettre d’avoir ni archiver un document commercial.');
      }
      const isRecipient = document.recipient.email === actor.email || document.createdByUserId === actor.id;
      if (!isRecipient) {
        throw new Error('ACCÈS REFUSÉ (Anti-IDOR) : Vous ne pouvez accéder qu’aux documents commerciaux émis à votre intention.');
      }
      return;
    }

    // 4. Fournisseur : accès aux documents où il est émetteur ou destinataire
    if (actor.role === 'FOURNISSEUR') {
      const isParty =
        document.issuer.email === actor.email ||
        document.recipient.email === actor.email ||
        document.createdByUserId === actor.id;
      if (!isParty) {
        throw new Error('ACCÈS REFUSÉ (Anti-IDOR) : Ce document n’appartient pas à votre organisation fournisseur.');
      }
      return;
    }

    // 5. Transporteur : accès restreint aux documents de transport et bons de livraison
    if (actor.role === 'TRANSPORTEUR') {
      if (document.documentType !== 'TRANSPORT_DOCUMENT' && document.documentType !== 'DELIVERY_NOTE') {
        throw new Error('ACCÈS REFUSÉ : Le Transporteur est uniquement habilité à consulter les lettres de voiture e-CMR et les bons de livraison.');
      }
      return;
    }

    throw new Error('ACCÈS REFUSÉ : Rôle non autorisé à effectuer cette opération documentaire.');
  }

  // ============================================================================
  // 8. MOTEUR DE RECHERCHE ET FILTRAGE FACETTÉ MULTI-CRITÈRES
  // ============================================================================

  /**
   * Filtrage et recherche avancée sur la base documentaire
   */
  public static filterDocuments(
    documents: CommercialDocumentRecord[],
    filters: DocumentSearchFilters
  ): CommercialDocumentRecord[] {
    return documents.filter((doc) => {
      if (filters.documentType && doc.documentType !== filters.documentType) {
        return false;
      }
      if (filters.jurisdiction && doc.jurisdiction !== filters.jurisdiction) {
        return false;
      }
      if (filters.status && doc.status !== filters.status) {
        return false;
      }
      if (filters.currency && doc.currency !== filters.currency) {
        return false;
      }
      if (filters.orderNumber && doc.orderNumber !== filters.orderNumber) {
        return false;
      }
      if (filters.dateFrom && doc.issuedAt.slice(0, 10) < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && doc.issuedAt.slice(0, 10) > filters.dateTo) {
        return false;
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesNum = doc.documentNumber.toLowerCase().includes(q);
        const matchesIssuer = doc.issuer.companyName.toLowerCase().includes(q);
        const matchesRecipient = doc.recipient.companyName.toLowerCase().includes(q);
        const matchesOrder = doc.orderNumber ? doc.orderNumber.toLowerCase().includes(q) : false;
        const matchesSku = doc.lines.some((l) => l.sku.toLowerCase().includes(q));
        if (!matchesNum && !matchesIssuer && !matchesRecipient && !matchesOrder && !matchesSku) {
          return false;
        }
      }
      return true;
    });
  }
}
