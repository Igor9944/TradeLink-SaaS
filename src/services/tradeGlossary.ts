// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — GLOSSAIRE TERMINOLOGIQUE CENTRALISÉ DU COMMERCE INTERNATIONAL
// Vocabulaire officiel standardisé B2B : Commercial, Douane, Logistique,
// Comptabilité, Finance Séquestre, Incoterms et Compliance KYC (FR / EN / AR).
// ============================================================================

import { TranslationGlossaryTerm, SupportedLocale } from '../types';

export const OFFICIAL_TRADE_GLOSSARY: TranslationGlossaryTerm[] = [
  // 1. Acteurs et Rôles
  {
    id: 'glo-001',
    termKey: 'FOURNISSEUR',
    category: 'COMMERCIAL',
    sourceTextFr: 'Fournisseur',
    targetTextEn: 'Supplier',
    targetTextAr: 'مورّد',
    isStrict: true,
    contextNotes: 'Partie venderesse industrielle ou grossiste dans la transaction B2B.',
  },
  {
    id: 'glo-002',
    termKey: 'ACHETEUR',
    category: 'COMMERCIAL',
    sourceTextFr: 'Acheteur',
    targetTextEn: 'Buyer / Client',
    targetTextAr: 'مشتري / عميل',
    isStrict: true,
    contextNotes: 'Donneur d’ordre commercial B2B.',
  },
  {
    id: 'glo-003',
    termKey: 'TRANSPORTEUR',
    category: 'LOGISTIQUE',
    sourceTextFr: 'Transporteur',
    targetTextEn: 'Carrier / Freight Forwarder',
    targetTextAr: 'ناقل لوجستي / متعهد شحن',
    isStrict: true,
    contextNotes: 'Opérateur en charge du fret routier, maritime ou aérien.',
  },
  {
    id: 'glo-004',
    termKey: 'COMPTABLE',
    category: 'FINANCE',
    sourceTextFr: 'Comptable',
    targetTextEn: 'Accountant',
    targetTextAr: 'محاسب',
    isStrict: true,
    contextNotes: 'Agent en charge de la tenue des livres et de l’audit fiscal.',
  },

  // 2. Flux Commerciaux & Documents
  {
    id: 'glo-005',
    termKey: 'COMMANDE',
    category: 'COMMERCIAL',
    sourceTextFr: 'Bon de commande',
    targetTextEn: 'Purchase Order (PO)',
    targetTextAr: 'أمر توريد / طلب شراء',
    isStrict: true,
    contextNotes: 'Engagement contractuel d’achat ferme.',
  },
  {
    id: 'glo-006',
    termKey: 'DEVIS',
    category: 'COMMERCIAL',
    sourceTextFr: 'Devis / Demande de cotation',
    targetTextEn: 'Request for Quotation (RFQ)',
    targetTextAr: 'عرض أسعار / طلب تسعير',
    isStrict: true,
    contextNotes: 'Proposition commerciale précontractuelle.',
  },
  {
    id: 'glo-007',
    termKey: 'FACTURE_COMMERCIALE',
    category: 'FINANCE',
    sourceTextFr: 'Facture commerciale',
    targetTextEn: 'Commercial Invoice',
    targetTextAr: 'فاتورة تجارية رسمية',
    isStrict: true,
    contextNotes: 'Document légal de facturation opposable en douane.',
  },
  {
    id: 'glo-008',
    termKey: 'FACTURE_PROFORMA',
    category: 'FINANCE',
    sourceTextFr: 'Facture pro forma',
    targetTextEn: 'Pro Forma Invoice',
    targetTextAr: 'فاتورة أولية شكلية',
    isStrict: true,
    contextNotes: 'Document préparatoire préalable au dédouanement et au virement.',
  },

  // 3. Logistique & Douane
  {
    id: 'glo-009',
    termKey: 'EXPEDITION',
    category: 'LOGISTIQUE',
    sourceTextFr: 'Expédition',
    targetTextEn: 'Shipment / Consignment',
    targetTextAr: 'شحنة / إرسالية',
    isStrict: true,
    contextNotes: 'Lot de marchandises acheminé d’un point A à un point B.',
  },
  {
    id: 'glo-010',
    termKey: 'LIVRAISON',
    category: 'LOGISTIQUE',
    sourceTextFr: 'Livraison',
    targetTextEn: 'Delivery',
    targetTextAr: 'تسليم / توصيل',
    isStrict: true,
    contextNotes: 'Remise matérielle de la marchandise au destinataire.',
  },
  {
    id: 'glo-011',
    termKey: 'POD',
    category: 'LOGISTIQUE',
    sourceTextFr: 'Preuve de livraison (POD)',
    targetTextEn: 'Proof of Delivery (POD)',
    targetTextAr: 'إثبات الاستلام والتسليم',
    isStrict: true,
    contextNotes: 'Reçu signé numériquement et horodaté certifiant la bonne réception.',
  },
  {
    id: 'glo-012',
    termKey: 'CMR',
    category: 'DOUANE',
    sourceTextFr: 'Lettre de voiture CMR',
    targetTextEn: 'CMR International Consignment Note',
    targetTextAr: 'بوليصة الشحن البري الدولي CMR',
    isStrict: true,
    contextNotes: 'Contrat de transport routier international régi par la convention de Genève.',
  },
  {
    id: 'glo-013',
    termKey: 'EUR1',
    category: 'DOUANE',
    sourceTextFr: 'Certificat de circulation EUR.1',
    targetTextEn: 'EUR.1 Movement Certificate',
    targetTextAr: 'شهادة حركة البضائع يورو 1 (EUR.1)',
    isStrict: true,
    contextNotes: 'Certificat d’origine préférentielle pour l’accord UE-Maroc.',
  },
  {
    id: 'glo-014',
    termKey: 'FROID_ATP',
    category: 'LOGISTIQUE',
    sourceTextFr: 'Agrément frigorifique ATP (FRC)',
    targetTextEn: 'ATP Cold Chain Certification (FRC)',
    targetTextAr: 'شهادة النقل المبرد المعتمدة ATP (فئة FRC)',
    isStrict: true,
    contextNotes: 'Norme internationale pour le transport de denrées périssables sous température dirigée.',
  },

  // 4. Stocks & Gestion Marchande
  {
    id: 'glo-015',
    termKey: 'STOCK_DISPO',
    category: 'COMMERCIAL',
    sourceTextFr: 'Stock disponible',
    targetTextEn: 'Available Stock',
    targetTextAr: 'المخزون المتاح',
    isStrict: true,
    contextNotes: 'Quantité physique immédiatement prête à la vente non grevée de réservation.',
  },
  {
    id: 'glo-016',
    termKey: 'STOCK_RESERVE',
    category: 'COMMERCIAL',
    sourceTextFr: 'Stock réservé',
    targetTextEn: 'Reserved Stock',
    targetTextAr: 'المخزون المحجوز',
    isStrict: true,
    contextNotes: 'Unités affectées à des commandes en cours de préparation.',
  },

  // 5. Finance & Séquestre
  {
    id: 'glo-017',
    termKey: 'SEQUESTRE_ESCROW',
    category: 'FINANCE',
    sourceTextFr: 'Paiement sous séquestre sécurisé (Escrow)',
    targetTextEn: 'Escrow Payment Hold',
    targetTextAr: 'الضمان المالي المشروط (سيكرو)',
    isStrict: true,
    contextNotes: 'Mécanisme de retenue des fonds jusqu’à confirmation conforme de la livraison.',
  },
  {
    id: 'glo-018',
    termKey: 'COMMISSION_STRIPE',
    category: 'FINANCE',
    sourceTextFr: 'Commission de séquestre Stripe (1.40% + 0.25€)',
    targetTextEn: 'Stripe Escrow Processing Fee (1.40% + €0.25)',
    targetTextAr: 'عمولة معالجة الضمان المالي سترايب (1.40% + 0.25 يورو)',
    isStrict: true,
    contextNotes: 'Frais d’intermédiation financière imputés au compte de charges 627800.',
  },
  {
    id: 'glo-019',
    termKey: 'RAPPROCHEMENT_BANCAIRE',
    category: 'FINANCE',
    sourceTextFr: 'Rapprochement bancaire',
    targetTextEn: 'Bank Reconciliation',
    targetTextAr: 'المطابقة المصرفية الآلية',
    isStrict: true,
    contextNotes: 'Pointage concordant entre relevé de compte 512 et factures payées.',
  },
  {
    id: 'glo-020',
    termKey: 'GRAND_LIVRE',
    category: 'FINANCE',
    sourceTextFr: 'Grand Livre',
    targetTextEn: 'General Ledger',
    targetTextAr: 'دفتر الأستاذ العام',
    isStrict: true,
    contextNotes: 'Registre comptable centralisé de tous les comptes avec soldes progressifs.',
  },
  {
    id: 'glo-021',
    termKey: 'BALANCE_GENERALE',
    category: 'FINANCE',
    sourceTextFr: 'Balance générale des comptes',
    targetTextEn: 'Trial Balance',
    targetTextAr: 'ميزان المراجعة العام',
    isStrict: true,
    contextNotes: 'État périodique synthétisant l’égalité stricte entre le total débit et le total crédit.',
  },

  // 6. Conformité & Sécurité
  {
    id: 'glo-022',
    termKey: 'KYC_COMPLIANCE',
    category: 'JURIDIQUE',
    sourceTextFr: 'Dossier de conformité KYC',
    targetTextEn: 'KYC Compliance Dossier',
    targetTextAr: 'ملف التحقق من هوية المنشأة (KYC)',
    isStrict: true,
    contextNotes: 'Procédure légale Know Your Customer avec délai réglementaire de 7 jours calendaires.',
  },
  {
    id: 'glo-023',
    termKey: 'DOUBLE_APPROBATION',
    category: 'JURIDIQUE',
    sourceTextFr: 'Règle de double approbation administrative',
    targetTextEn: 'Dual-Admin Approval Rule',
    targetTextAr: 'قاعدة الموافقة الإدارية المزدوجة',
    isStrict: true,
    contextNotes: 'Interdiction d’auto-approbation : une opération sensible requiert deux administrateurs distincts.',
  },

  // 7. Incoterms Officiels ICC 2020
  {
    id: 'glo-024',
    termKey: 'INCOTERM_CIF',
    category: 'INCOTERMS',
    sourceTextFr: 'CIF (Coût, Assurance et Fret)',
    targetTextEn: 'CIF (Cost, Insurance and Freight)',
    targetTextAr: 'CIF (التكلفة والتأمين وأجور الشحن)',
    isStrict: true,
    contextNotes: 'Incoterm maritime où le vendeur assume fret et assurance jusqu’au port de destination convenu.',
  },
  {
    id: 'glo-025',
    termKey: 'INCOTERM_FOB',
    category: 'INCOTERMS',
    sourceTextFr: 'FOB (Franco à bord)',
    targetTextEn: 'FOB (Free On Board)',
    targetTextAr: 'FOB (تسليم على ظهر السفينة)',
    isStrict: true,
    contextNotes: 'Transfert de frais et risques dès passage du bastingage du navire au port de chargement.',
  },
  {
    id: 'glo-026',
    termKey: 'INCOTERM_DAP',
    category: 'INCOTERMS',
    sourceTextFr: 'DAP (Rendu au lieu de destination)',
    targetTextEn: 'DAP (Delivered at Place)',
    targetTextAr: 'DAP (التسليم في مكان الوصول المسمى)',
    isStrict: true,
    contextNotes: 'Marchandise mise à disposition de l’acheteur sur le moyen de transport sans déchargement.',
  },
  {
    id: 'glo-027',
    termKey: 'INCOTERM_EXW',
    category: 'INCOTERMS',
    sourceTextFr: 'EXW (Départ usine)',
    targetTextEn: 'EXW (Ex Works)',
    targetTextAr: 'EXW (تسليم في المصنع)',
    isStrict: true,
    contextNotes: 'Obligation minimale pour le vendeur : mise à disposition dans ses propres locaux.',
  },
  {
    id: 'glo-028',
    termKey: 'SEQUESTRE_SIMPLE',
    category: 'FINANCE',
    sourceTextFr: 'Séquestre',
    targetTextEn: 'Escrow',
    targetTextAr: 'الضمان المالي المشروط (Escrow)',
    isStrict: true,
    contextNotes: 'Séquestre bancaire B2B',
  },
  {
    id: 'glo-029',
    termKey: 'INCOTERM_CIP',
    category: 'INCOTERMS',
    sourceTextFr: 'CIP (Port payé, assurance comprise)',
    targetTextEn: 'CIP (Carriage and Insurance Paid to)',
    targetTextAr: 'CIP (أجور النقل والتأمين مدفوعة إلى)',
    isStrict: true,
    contextNotes: 'Incoterm multimodal incluant le transport et l assurance marchandise.',
  },
  {
    id: 'glo-030',
    termKey: 'INCOTERM_DDP',
    category: 'INCOTERMS',
    sourceTextFr: 'DDP (Rendu droits acquittés)',
    targetTextEn: 'DDP (Delivered Duty Paid)',
    targetTextAr: 'DDP (التسليم خالِ من الرسوم الجمركية)',
    isStrict: true,
    contextNotes: 'Obligation maximale pour le vendeur, incluant toutes les formalités douanières d importation.',
  },
  {
    id: 'glo-031',
    termKey: 'INCOTERM_FCA',
    category: 'INCOTERMS',
    sourceTextFr: 'FCA (Franco transporteur)',
    targetTextEn: 'FCA (Free Carrier)',
    targetTextAr: 'FCA (تسليم إلى الناقل المعتمد)',
    isStrict: true,
    contextNotes: 'Marchandise dédouanée pour l export remise au transporteur désigné par l acheteur.',
  },
  {
    id: 'glo-032',
    termKey: 'DOUANE_DECLARATION',
    category: 'DOUANE',
    sourceTextFr: 'Déclaration en douane',
    targetTextEn: 'Customs Declaration',
    targetTextAr: 'تصريح جمركي رسمي',
    isStrict: true,
    contextNotes: 'Document légal assignant un régime douanier aux marchandises.',
  },
  {
    id: 'glo-033',
    termKey: 'DOUANE_BORDEREAU',
    category: 'DOUANE',
    sourceTextFr: 'Bordereau de dédouanement',
    targetTextEn: 'Customs Clearance Slip',
    targetTextAr: 'إشعار الإفراج الجمركي',
    isStrict: true,
    contextNotes: 'Attestation de dédouanement et de mainlevée de la cargaison.',
  },
  {
    id: 'glo-034',
    termKey: 'COMPTA_PCG',
    category: 'FINANCE',
    sourceTextFr: 'Plan Comptable Général (PCG)',
    targetTextEn: 'General Accounting Chart (PCG)',
    targetTextAr: 'دليل الحسابات المحاسبي العام (PCG)',
    isStrict: true,
    contextNotes: 'Nomenclature officielle des comptes en comptabilité générale.',
  },
  {
    id: 'glo-035',
    termKey: 'COMPTA_CONTREPASSATION',
    category: 'FINANCE',
    sourceTextFr: 'Écriture de contre-passation',
    targetTextEn: 'Reversal Accounting Entry',
    targetTextAr: 'قيد محاسبي عكسي (تسوية وتصحيح)',
    isStrict: true,
    contextNotes: 'Écriture équilibrée inversant une écriture antérieure immuable pour correction.',
  },
  {
    id: 'glo-036',
    termKey: 'COMPTA_TVA',
    category: 'FINANCE',
    sourceTextFr: 'Taxe sur la Valeur Ajoutée (TVA)',
    targetTextEn: 'Value Added Tax (VAT)',
    targetTextAr: 'ضريبة القيمة المضافة (TVA)',
    isStrict: true,
    contextNotes: 'Impôt indirect sur la consommation collecté et déduit selon la juridiction fiscale.',
  },
];

export class TradeGlossaryManager {
  private static dynamicTerms: Map<string, TranslationGlossaryTerm> = new Map();

  static {
    // Initialisation avec le glossaire officiel
    for (const term of OFFICIAL_TRADE_GLOSSARY) {
      this.dynamicTerms.set(term.termKey, {
        ...term,
        status: 'VALIDATED',
        validatedBy: 'TRADELINK Standards Committee',
        validatedAt: '2026-01-01T00:00:00Z',
      });
    }
  }

  /**
   * Retourne tous les termes du glossaire
   */
  public static getAllTerms(): TranslationGlossaryTerm[] {
    return Array.from(this.dynamicTerms.values());
  }

  /**
   * Filtrage des termes par catégorie, statut ou mot-clé
   */
  public static filterTerms(params?: {
    category?: string;
    status?: string;
    search?: string;
  }): TranslationGlossaryTerm[] {
    let list = Array.from(this.dynamicTerms.values());
    if (params?.category && params.category !== 'ALL') {
      list = list.filter((t) => t.category === params.category);
    }
    if (params?.status && params.status !== 'ALL') {
      list = list.filter((t) => t.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.termKey.toLowerCase().includes(q) ||
          t.sourceTextFr.toLowerCase().includes(q) ||
          t.targetTextEn.toLowerCase().includes(q) ||
          t.targetTextAr.includes(params.search!) ||
          t.contextNotes?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  /**
   * Recherche un terme par sa clé ou son libellé
   */
  public static findTerm(query: string): TranslationGlossaryTerm | undefined {
    const q = query.trim().toUpperCase();
    if (this.dynamicTerms.has(q)) {
      return this.dynamicTerms.get(q);
    }
    return Array.from(this.dynamicTerms.values()).find(
      (t) =>
        t.id === query ||
        t.termKey.toUpperCase() === q ||
        t.sourceTextFr.toUpperCase() === q ||
        t.targetTextEn.toUpperCase() === q ||
        t.targetTextAr === query.trim()
    );
  }

  public static lookupTerm(query: string): TranslationGlossaryTerm | undefined {
    return this.findTerm(query);
  }

  /**
   * Ajout ou mise à jour administrative d'un terme
   */
  public static upsertTerm(term: TranslationGlossaryTerm): void {
    this.dynamicTerms.set(term.termKey, {
      ...term,
      sourceTextFr: term.sourceTextFr.trim(),
      targetTextEn: term.targetTextEn.trim(),
      targetTextAr: term.targetTextAr.trim(),
      status: term.status || 'VALIDATED',
    });
  }

  /**
   * Validation administrative d'un terme
   */
  public static validateTerm(id: string, validatorEmail: string): TranslationGlossaryTerm {
    const term = Array.from(this.dynamicTerms.values()).find((t) => t.id === id || t.termKey === id);
    if (!term) {
      throw new Error(`Terme de glossaire "${id}" introuvable.`);
    }
    term.status = 'VALIDATED';
    term.validatedBy = validatorEmail;
    term.validatedAt = new Date().toISOString();
    this.dynamicTerms.set(term.termKey, term);
    return term;
  }

  /**
   * Mise à jour administrative d'un terme
   */
  public static updateTerm(id: string, updates: Partial<TranslationGlossaryTerm>): TranslationGlossaryTerm {
    const term = Array.from(this.dynamicTerms.values()).find((t) => t.id === id || t.termKey === id);
    if (!term) {
      throw new Error(`Terme de glossaire "${id}" introuvable.`);
    }
    const updated: TranslationGlossaryTerm = {
      ...term,
      ...updates,
      sourceTextFr: updates.sourceTextFr !== undefined ? updates.sourceTextFr.trim() : term.sourceTextFr,
      targetTextEn: updates.targetTextEn !== undefined ? updates.targetTextEn.trim() : term.targetTextEn,
      targetTextAr: updates.targetTextAr !== undefined ? updates.targetTextAr.trim() : term.targetTextAr,
    };
    this.dynamicTerms.set(term.termKey, updated);
    return updated;
  }

  /**
   * Suppression d'un terme du glossaire
   */
  public static deleteTerm(id: string): boolean {
    const term = Array.from(this.dynamicTerms.values()).find((t) => t.id === id || t.termKey === id);
    if (!term) return false;
    return this.dynamicTerms.delete(term.termKey);
  }

  public static addDynamicTerm(params: {
    category: TranslationGlossaryTerm['category'];
    termFr: string;
    termEn: string;
    termAr: string;
    context?: string;
    status?: 'VALIDATED' | 'PENDING_REVIEW' | 'DRAFT';
  }): TranslationGlossaryTerm {
    const key = `DYN_${Date.now()}_${params.termFr.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const term: TranslationGlossaryTerm = {
      id: `glo-dyn-${Date.now()}`,
      termKey: key,
      category: params.category,
      sourceTextFr: params.termFr.trim(),
      targetTextEn: params.termEn.trim(),
      targetTextAr: params.termAr.trim(),
      isStrict: true,
      contextNotes: params.context || 'Terme dynamique TradeLink B2B',
      status: params.status || 'PENDING_REVIEW',
    };
    this.upsertTerm(term);
    return term;
  }

  /**
   * Application stricte du glossaire sur un texte traduit
   * Remplace intelligemment les termes inexacts par la traduction officielle agréée.
   */
  public static applyGlossaryToText(
    text: string,
    sourceLang: SupportedLocale | 'es',
    targetLang: SupportedLocale | 'es'
  ): { transformedText: string; termsAppliedCount: number } {
    if (sourceLang === targetLang) {
      return { transformedText: text, termsAppliedCount: 0 };
    }

    let result = text;
    let count = 0;

    // Trie par longueur décroissante pour traiter les expressions composées avant les mots isolés
    const candidates = Array.from(this.dynamicTerms.values())
      .filter((t) => t.isStrict)
      .map((term) => {
        let sourcePhrase = '';
        let targetPhrase = '';

        if (sourceLang === 'fr') {
          sourcePhrase = term.sourceTextFr;
        } else if (sourceLang === 'en') {
          sourcePhrase = term.targetTextEn;
        } else if (sourceLang === 'ar') {
          sourcePhrase = term.targetTextAr;
        }

        if (targetLang === 'fr') {
          targetPhrase = term.sourceTextFr;
        } else if (targetLang === 'en') {
          targetPhrase = term.targetTextEn;
        } else if (targetLang === 'ar') {
          targetPhrase = term.targetTextAr;
        }

        return { term, sourcePhrase, targetPhrase };
      })
      .filter((x) => x.sourcePhrase && x.targetPhrase && x.sourcePhrase !== x.targetPhrase)
      .sort((a, b) => b.sourcePhrase.length - a.sourcePhrase.length);

    for (const { sourcePhrase, targetPhrase } of candidates) {
      // Recherche insensible à la casse pour les langues latines
      if (sourceLang !== 'ar') {
        const startBoundary = /^\w/.test(sourcePhrase) ? '\\b' : '';
        const endBoundary = /\w$/.test(sourcePhrase) ? '\\b' : '';
        const regex = new RegExp(`${startBoundary}${escapeRegExp(sourcePhrase)}${endBoundary}`, 'gi');
        if (regex.test(result)) {
          result = result.replace(regex, targetPhrase);
          count++;
        }
      } else {
        // En arabe, remplacement contextuel
        if (result.includes(sourcePhrase)) {
          result = result.split(sourcePhrase).join(targetPhrase);
          count++;
        }
      }
    }

    return { transformedText: result, termsAppliedCount: count };
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const TranslationGlossary = TradeGlossaryManager;
