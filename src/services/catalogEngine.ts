// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import Decimal from 'decimal.js';
import type {
  ProductItem,
  ProductCategoryRecord,
  ProductVariant,
  ProductSpecification,
  ProductStatus,
  Locale,
  Icon3DName,
} from '../types';
import { CentralTranslationService } from './translationEngine';

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// RÉFÉRENTIEL INITIAL DES CATÉGORIES HIÉRARCHIQUES (Trilingue FR/EN/AR)
// ============================================================================

export const INITIAL_CATALOG_CATEGORIES: ProductCategoryRecord[] = [
  {
    id: 'cat-cold-chain',
    code: 'COLD_CHAIN',
    icon3d: 'cold-chain',
    imageUrl: '/images/categories/cold-chain.jpg',
    displayOrder: 1,
    isActive: true,
    name: {
      fr: 'Chaîne du Froid & Agroalimentaire',
      en: 'Cold Chain & Agro-industry',
      ar: 'سلسلة التبريد والصناعات الغذائية',
    },
    description: {
      fr: 'Produits thermosensibles, denrées périssables et équipements frigorifiques certifiés ATP',
      en: 'Temperature-controlled products, perishables and ATP-certified cooling equipment',
      ar: 'المنتجات الحساسة للحرارة والسلع القابلة للتلف ومعدات التبريد المعتمدة',
    },
    subcategories: [
      {
        id: 'subcat-fruits-veg',
        code: 'FRUITS_VEGETABLES',
        parentCategoryId: 'cat-cold-chain',
        icon3d: 'pallet-load',
        displayOrder: 1,
        isActive: true,
        name: {
          fr: 'Fruits & Légumes Frais Export',
          en: 'Fresh Export Fruits & Vegetables',
          ar: 'فواكه وخضروات طازجة للتصدير',
        },
        description: {
          fr: 'Agrumes, primeurs, tomates cerises et dattes Medjool calibrées',
          en: 'Citrus, early produce, cherry tomatoes and graded Medjool dates',
          ar: 'حمضيات وخضروات موسمية وطماطم كرزية وتمور المجهول المصنفة',
        },
      },
      {
        id: 'subcat-seafood-frozen',
        code: 'SEAFOOD_FROZEN',
        parentCategoryId: 'cat-cold-chain',
        icon3d: 'sea-freight',
        displayOrder: 2,
        isActive: true,
        name: {
          fr: 'Produits de la Mer & Surgelés',
          en: 'Seafood & Frozen Fish',
          ar: 'المنتجات البحرية والأسماك المجمدة',
        },
        description: {
          fr: 'Poulpe, calamar, filets surgelés IQF sous -18°C',
          en: 'Octopus, squid, IQF frozen fillets at -18°C',
          ar: 'أخطبوط وحبار وشرائح أسماك مجمدة بتقنية IQF عند -18 درجة مئوية',
        },
      },
    ],
  },
  {
    id: 'cat-industrial',
    code: 'INDUSTRIAL_EQUIPMENT',
    icon3d: 'warehouse-robot',
    imageUrl: '/images/categories/machinery.jpg',
    displayOrder: 2,
    isActive: true,
    name: {
      fr: 'Équipements Industriels & Machines',
      en: 'Industrial Equipment & Machinery',
      ar: 'المعدات الصناعية والآلات',
    },
    description: {
      fr: 'Machines-outils, automates programmables et composants électromécaniques lourds',
      en: 'Machine tools, programmable automations and heavy electromechanical parts',
      ar: 'الآلات والأجهزة القابلة للبرمجة والمكونات الكهروميكانيكية الثقيلة',
    },
    subcategories: [
      {
        id: 'subcat-pumps-motors',
        code: 'PUMPS_MOTORS',
        parentCategoryId: 'cat-industrial',
        icon3d: 'forklift',
        displayOrder: 1,
        isActive: true,
        name: {
          fr: 'Pompes & Moteurs Triphasés',
          en: 'Pumps & Three-phase Motors',
          ar: 'المضخات والمحركات ثلاثية الطور',
        },
        description: {
          fr: 'Groupes motopompes, variateurs de vitesse et générateurs de secours',
          en: 'Motor pump units, speed variators and backup generators',
          ar: 'مجموعات المضخات ومحولات السرعة ومولدات الطوارئ',
        },
      },
    ],
  },
  {
    id: 'cat-pharma',
    code: 'PHARMA_HEALTH',
    icon3d: 'insured',
    imageUrl: '/images/categories/pharma.jpg',
    displayOrder: 3,
    isActive: true,
    name: {
      fr: 'Pharmaceutique & Dispositifs Médicaux',
      en: 'Pharmaceuticals & Medical Devices',
      ar: 'المستحضرات الصيدلانية والأجهزة الطبية',
    },
    description: {
      fr: 'Produits de santé sous traçabilité thermique stricte certifiés ISO 13485 / GDP',
      en: 'Healthcare products under strict temperature logging ISO 13485 / GDP certified',
      ar: 'منتجات الرعاية الصحية الخاضعة للتتبع الحراري الصارم والمعتمدة',
    },
    subcategories: [
      {
        id: 'subcat-medical-consumables',
        code: 'MED_CONSUMABLES',
        parentCategoryId: 'cat-pharma',
        icon3d: 'checklist',
        displayOrder: 1,
        isActive: true,
        name: {
          fr: 'Consommables Médicaux Stériles',
          en: 'Sterile Medical Consumables',
          ar: 'مستلزمات طبية معقمة',
        },
        description: {
          fr: 'Gants nitrile, seringues, kits de perfusion et pansements chirurgicaux',
          en: 'Nitrile gloves, syringes, infusion kits and surgical dressings',
          ar: 'قفازات نيتريل ومحاقن ومجموعات حقن وضمادات جراحية',
        },
      },
    ],
  },
  {
    id: 'cat-textile',
    code: 'TEXTILE_RAW',
    icon3d: 'pallet-load',
    imageUrl: '/images/categories/textile.jpg',
    displayOrder: 4,
    isActive: true,
    name: {
      fr: 'Textile, Cuir & Matières Premières',
      en: 'Textiles, Leather & Raw Materials',
      ar: 'المنسوجات والجلود والمواد الخام',
    },
    description: {
      fr: 'Fils de coton peigné, rouleaux denim, cuir tanné végétal et fibres synthétiques',
      en: 'Combed cotton yarn, denim rolls, vegetable tanned leather and synthetic fibers',
      ar: 'خيوط قطنية ممشطة ولفائف الدنيم والجلود المدبوغة والألياف الاصطناعية',
    },
  },
];

// ============================================================================
// MOTEUR CENTRAL DU CATALOGUE B2B (CentralCatalogEngine)
// ============================================================================

export interface CatalogFilterCriteria {
  search?: string;
  categoryId?: string;
  subcategoryId?: string;
  originCountry?: string;
  minPrice?: string;
  maxPrice?: string;
  currency?: string;
  inStockOnly?: boolean;
  maxMoq?: number;
  incoterm?: string;
  supplierId?: string;
  status?: ProductStatus;
  sortBy?: 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST' | 'NAME_ASC' | 'AVAILABILITY_DESC';
  page?: number;
  limit?: number;
}

export interface CatalogSearchResult {
  products: ProductItem[];
  total: number;
  page: number;
  totalPages: number;
  facets: {
    categoriesCount: Record<string, number>;
    countriesCount: Record<string, number>;
    minPriceDetected: string;
    maxPriceDetected: string;
  };
}

export interface ProductComparisonMatrix {
  products: ProductItem[];
  attributes: {
    key: string;
    label: string;
    valuesByProductId: Record<string, string>;
  }[];
}

export interface BulkImportResult {
  totalProcessed: number;
  successfulImports: number;
  failedImports: number;
  importedProducts: ProductItem[];
  errors: { row: number; sku?: string; error: string }[];
}

export class CentralCatalogEngine {
  private categories: Map<string, ProductCategoryRecord> = new Map();
  private products: Map<string, ProductItem> = new Map();
  private clientFavorites: Map<string, Set<string>> = new Map(); // userId -> Set<productId>

  constructor(
    initialCategories: ProductCategoryRecord[] = INITIAL_CATALOG_CATEGORIES,
    initialProducts: ProductItem[] = []
  ) {
    for (const cat of initialCategories) {
      this.categories.set(cat.id, structuredClone(cat));
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          this.categories.set(sub.id, structuredClone(sub));
        }
      }
    }
    for (const prod of initialProducts) {
      this.products.set(prod.id, structuredClone(prod));
    }
  }

  public resetEngine(
    initialCategories: ProductCategoryRecord[] = INITIAL_CATALOG_CATEGORIES,
    initialProducts: ProductItem[] = []
  ): void {
    this.categories.clear();
    this.products.clear();
    this.clientFavorites.clear();
    for (const cat of initialCategories) {
      this.categories.set(cat.id, structuredClone(cat));
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          this.categories.set(sub.id, structuredClone(sub));
        }
      }
    }
    for (const prod of initialProducts) {
      this.products.set(prod.id, structuredClone(prod));
    }
  }

  public syncProducts(products: ProductItem[]): void {
    for (const p of products) {
      if (!this.products.has(p.id)) {
        this.products.set(p.id, structuredClone(p));
      }
    }
  }

  public getProductById(id: string): ProductItem | null {
    const prod = this.products.get(id);
    return prod ? structuredClone(prod) : null;
  }

  public getAllProducts(): ProductItem[] {
    return Array.from(this.products.values()).map((p) => structuredClone(p));
  }

  // ==========================================================================
  // 1. GESTION DES CATÉGORIES
  // ==========================================================================

  public listCategories(includeInactive = false): ProductCategoryRecord[] {
    const rootCategories: ProductCategoryRecord[] = [];
    for (const cat of this.categories.values()) {
      if (!cat.parentCategoryId) {
        if (!cat.isActive && !includeInactive) continue;
        const copy = structuredClone(cat);
        // Attacher les sous-catégories
        copy.subcategories = Array.from(this.categories.values())
          .filter((sub) => sub.parentCategoryId === cat.id)
          .filter((sub) => (includeInactive ? true : sub.isActive))
          .sort((a, b) => a.displayOrder - b.displayOrder);
        rootCategories.push(copy);
      }
    }
    return rootCategories.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public getCategoryById(id: string): ProductCategoryRecord | null {
    const cat = this.categories.get(id);
    return cat ? structuredClone(cat) : null;
  }

  public createCategory(params: {
    code: string;
    name: Record<Locale, string>;
    description: Record<Locale, string>;
    parentCategoryId?: string;
    icon3d?: Icon3DName;
    imageUrl?: string;
    displayOrder?: number;
  }): ProductCategoryRecord {
    if (params.parentCategoryId && !this.categories.has(params.parentCategoryId)) {
      const err = new Error('PARENT_CATEGORY_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    const id = `cat-${params.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const record: ProductCategoryRecord = {
      id,
      code: params.code.toUpperCase(),
      name: params.name,
      description: params.description,
      parentCategoryId: params.parentCategoryId,
      icon3d: params.icon3d || 'pallet-load',
      imageUrl: params.imageUrl,
      displayOrder: params.displayOrder || this.categories.size + 1,
      isActive: true,
    };

    this.categories.set(id, record);
    return structuredClone(record);
  }

  public updateCategory(
    id: string,
    updates: Partial<ProductCategoryRecord>
  ): ProductCategoryRecord {
    const existing = this.categories.get(id);
    if (!existing) {
      const err = new Error('CATEGORY_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    const updated: ProductCategoryRecord = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    this.categories.set(id, updated);
    return structuredClone(updated);
  }

  public deleteCategory(id: string): { success: boolean; message: string } {
    const existing = this.categories.get(id);
    if (!existing) {
      const err = new Error('CATEGORY_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    // 1. Contrôle : Interdire la suppression si des sous-catégories y sont rattachées
    const hasSubcategories = Array.from(this.categories.values()).some(
      (c) => c.parentCategoryId === id
    );
    if (hasSubcategories) {
      const err = new Error('CANNOT_DELETE_CATEGORY_WITH_CHILDREN');
      (err as any).statusCode = 400;
      throw err;
    }

    // 2. Contrôle : Interdire la suppression si des produits y sont rattachés
    const hasLinkedProducts = Array.from(this.products.values()).some(
      (p) => p.categoryId === id || p.subcategoryId === id || p.category === existing.code
    );
    if (hasLinkedProducts) {
      const err = new Error('CANNOT_DELETE_CATEGORY_WITH_LINKED_PRODUCTS');
      (err as any).statusCode = 400;
      throw err;
    }

    this.categories.delete(id);
    return { success: true, message: `Catégorie ${id} supprimée avec succès.` };
  }

  // ==========================================================================
  // 2. GESTION DES PRODUITS (CRUD, MODÉRATION, SÉCURITÉ)
  // ==========================================================================

  public createProduct(params: {
    sku: string;
    supplierId: string;
    supplierName: string;
    supplierCountry?: string;
    category: string;
    categoryId?: string;
    subcategory?: string;
    subcategoryId?: string;
    name: Record<Locale, string>;
    description: Record<Locale, string>;
    unitPrice: string;
    currency: string;
    taxRate?: string;
    unit: string;
    stockAvailable: number;
    minOrderQuantity?: number;
    minStockAlert?: number;
    icon3d?: Icon3DName;
    photos?: string[];
    gallery?: string[];
    specifications?: ProductSpecification[];
    variants?: ProductVariant[];
    originCountry: string;
    incoterm: string;
    leadTimeDays: number;
    requireAdminReview?: boolean;
    originalLanguage?: Locale;
  }): ProductItem {
    // 1. Unicité du SKU
    const existingSku = Array.from(this.products.values()).find(
      (p) => p.sku.toUpperCase() === params.sku.toUpperCase()
    );
    if (existingSku) {
      const err = new Error('SKU_ALREADY_EXISTS');
      (err as any).statusCode = 400;
      throw err;
    }

    // 2. Validation prix et stock
    if (new Decimal(params.unitPrice).isNegative()) {
      const err = new Error('INVALID_NEGATIVE_PRICE');
      (err as any).statusCode = 400;
      throw err;
    }
    if (params.stockAvailable < 0) {
      const err = new Error('INVALID_NEGATIVE_STOCK');
      (err as any).statusCode = 400;
      throw err;
    }

    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    // 3. Traduction automatique si nécessaire (nom et description)
    const originalLang = params.originalLanguage || 'fr';
    const translatedName = { ...params.name };
    const translatedDesc = { ...params.description };

    const targetLangs: Locale[] = (['fr', 'en', 'ar'] as Locale[]).filter((l) => l !== originalLang);
    for (const tgt of targetLangs) {
      if (!translatedName[tgt] && translatedName[originalLang]) {
        const trans = CentralTranslationService.translateTextSync({
          text: translatedName[originalLang],
          sourceLang: originalLang,
          targetLang: tgt,
          domain: 'COMMERCIAL',
        });
        translatedName[tgt] = trans.translatedText;
      }
      if (!translatedDesc[tgt] && translatedDesc[originalLang]) {
        const trans = CentralTranslationService.translateTextSync({
          text: translatedDesc[originalLang],
          sourceLang: originalLang,
          targetLang: tgt,
          domain: 'COMMERCIAL',
        });
        translatedDesc[tgt] = trans.translatedText;
      }
    }

    const status: ProductStatus = params.requireAdminReview ? 'PENDING_REVIEW' : 'PUBLISHED';

    const productRecord: ProductItem = {
      id,
      sku: params.sku.toUpperCase(),
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      supplierCountry: params.supplierCountry || params.originCountry,
      category: params.category,
      categoryId: params.categoryId,
      subcategory: params.subcategory,
      subcategoryId: params.subcategoryId,
      name: translatedName,
      description: translatedDesc,
      unitPrice: new Decimal(params.unitPrice).toFixed(2),
      currency: params.currency || 'EUR',
      taxRate: params.taxRate || '0.20',
      unit: params.unit || 'Palette',
      stockAvailable: params.stockAvailable,
      stockReserved: 0,
      minStockAlert: params.minStockAlert || 10,
      minOrderQuantity: params.minOrderQuantity || 1,
      icon3d: params.icon3d || 'pallet-load',
      photos: params.photos || (params.gallery && params.gallery.length > 0 ? [params.gallery[0]] : []),
      gallery: params.gallery || params.photos || [],
      specifications: params.specifications || [],
      variants: params.variants || [],
      originCountry: params.originCountry,
      incoterm: params.incoterm || 'FOB',
      leadTimeDays: params.leadTimeDays || 3,
      isPublished: status === 'PUBLISHED',
      status,
      originalLanguage: originalLang,
      isAutoTranslated: true,
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(id, productRecord);
    return structuredClone(productRecord);
  }

  public updateProduct(
    id: string,
    actorId: string,
    actorRole: string,
    updates: Partial<ProductItem>
  ): ProductItem {
    const existing = this.products.get(id);
    if (!existing) {
      const err = new Error('PRODUCT_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    // Sécurité Anti-IDOR : seul le fournisseur propriétaire ou l'Admin peut modifier
    if (actorRole !== 'ADMIN' && existing.supplierId !== actorId) {
      const err = new Error('FORBIDDEN_IDOR_PRODUCT_OWNERSHIP');
      (err as any).statusCode = 403;
      throw err;
    }

    // Si le SKU est mis à jour, vérifier l'unicité
    if (updates.sku && updates.sku.toUpperCase() !== existing.sku) {
      const dup = Array.from(this.products.values()).find(
        (p) => p.sku.toUpperCase() === updates.sku!.toUpperCase() && p.id !== id
      );
      if (dup) {
        const err = new Error('SKU_ALREADY_EXISTS');
        (err as any).statusCode = 400;
        throw err;
      }
    }

    const updated: ProductItem = {
      ...existing,
      ...updates,
      id: existing.id,
      supplierId: existing.supplierId, // Immuable
      updatedAt: new Date().toISOString(),
    };

    if (updates.status) {
      updated.isPublished = updates.status === 'PUBLISHED';
    }

    this.products.set(id, updated);
    return structuredClone(updated);
  }

  public updateStockAndPriceQuick(
    id: string,
    actorId: string,
    actorRole: string,
    params: { stockAvailable?: number; unitPrice?: string }
  ): ProductItem {
    const existing = this.products.get(id);
    if (!existing) {
      const err = new Error('PRODUCT_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    if (actorRole !== 'ADMIN' && existing.supplierId !== actorId) {
      const err = new Error('FORBIDDEN_IDOR_PRODUCT_OWNERSHIP');
      (err as any).statusCode = 403;
      throw err;
    }

    if (params.stockAvailable !== undefined) {
      if (params.stockAvailable < 0) {
        const err = new Error('INVALID_NEGATIVE_STOCK');
        (err as any).statusCode = 400;
        throw err;
      }
      existing.stockAvailable = params.stockAvailable;
    }

    if (params.unitPrice !== undefined) {
      if (new Decimal(params.unitPrice).isNegative()) {
        const err = new Error('INVALID_NEGATIVE_PRICE');
        (err as any).statusCode = 400;
        throw err;
      }
      existing.unitPrice = new Decimal(params.unitPrice).toFixed(2);
    }

    existing.updatedAt = new Date().toISOString();
    this.products.set(id, existing);
    return structuredClone(existing);
  }

  public archiveProduct(id: string, actorId: string, actorRole: string): ProductItem {
    return this.updateProduct(id, actorId, actorRole, {
      status: 'ARCHIVED',
      isPublished: false,
    });
  }

  public deleteProduct(id: string, actorId: string, actorRole: string): { success: boolean; message: string } {
    const existing = this.products.get(id);
    if (!existing) {
      const err = new Error('PRODUCT_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    if (actorRole !== 'ADMIN' && existing.supplierId !== actorId) {
      const err = new Error('FORBIDDEN_IDOR_PRODUCT_OWNERSHIP');
      (err as any).statusCode = 403;
      throw err;
    }

    this.products.delete(id);
    return { success: true, message: `Produit ${id} supprimé avec succès.` };
  }

  // ==========================================================================
  // 3. WORKFLOW DE MODÉRATION & SIGNALEMENT (ADMIN)
  // ==========================================================================

  public moderateProductPublication(
    id: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string
  ): ProductItem {
    const existing = this.products.get(id);
    if (!existing) {
      const err = new Error('PRODUCT_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    if (action === 'APPROVE') {
      existing.status = 'PUBLISHED';
      existing.isPublished = true;
      existing.adminRejectionReason = undefined;
    } else {
      if (!reason?.trim()) {
        const err = new Error('REJECTION_REASON_MANDATORY');
        (err as any).statusCode = 400;
        throw err;
      }
      existing.status = 'DRAFT';
      existing.isPublished = false;
      existing.adminRejectionReason = reason;
    }

    existing.updatedAt = new Date().toISOString();
    this.products.set(id, existing);
    return structuredClone(existing);
  }

  public reportProduct(id: string, reason: string): ProductItem {
    const existing = this.products.get(id);
    if (!existing) {
      const err = new Error('PRODUCT_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    existing.isReported = true;
    existing.reportReason = reason;
    existing.updatedAt = new Date().toISOString();
    this.products.set(id, existing);
    return structuredClone(existing);
  }

  public suspendProduct(id: string, reason: string): ProductItem {
    const existing = this.products.get(id);
    if (!existing) {
      const err = new Error('PRODUCT_NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    existing.status = 'SUSPENDED';
    existing.isPublished = false;
    existing.adminRejectionReason = reason;
    existing.updatedAt = new Date().toISOString();
    this.products.set(id, existing);
    return structuredClone(existing);
  }

  // ==========================================================================
  // 4. MOTEUR DE RECHERCHE & FILTRES CLIENT / B2B
  // ==========================================================================

  public searchProducts(
    criteria: CatalogFilterCriteria,
    userRole = 'CLIENT',
    userId?: string
  ): CatalogSearchResult {
    let list = Array.from(this.products.values());

    // 1. Cloisonnement par rôle :
    // - Client public ne voit QUE les produits PUBLISHED
    // - Fournisseur voit ses propres produits (tous statuts) + les produits PUBLISHED des autres
    // - Admin voit tout
    if (userRole === 'CLIENT' || userRole === 'VISITEUR') {
      list = list.filter((p) => p.status === 'PUBLISHED' || p.isPublished);
    } else if (userRole === 'FOURNISSEUR' && userId) {
      list = list.filter((p) => p.supplierId === userId || p.status === 'PUBLISHED');
    }

    // 2. Recherche Textuelle
    if (criteria.search?.trim()) {
      const q = criteria.search.toLowerCase().trim();
      list = list.filter((p) => {
        const skuMatch = p.sku.toLowerCase().includes(q);
        const nameFr = p.name.fr?.toLowerCase().includes(q) ?? false;
        const nameEn = p.name.en?.toLowerCase().includes(q) ?? false;
        const nameAr = p.name.ar?.toLowerCase().includes(q) ?? false;
        const descFr = p.description.fr?.toLowerCase().includes(q) ?? false;
        const descEn = p.description.en?.toLowerCase().includes(q) ?? false;
        const descAr = p.description.ar?.toLowerCase().includes(q) ?? false;
        const suppMatch = p.supplierName.toLowerCase().includes(q);
        const specMatch = p.specifications?.some((s) => s.value.toLowerCase().includes(q)) ?? false;
        return skuMatch || nameFr || nameEn || nameAr || descFr || descEn || descAr || suppMatch || specMatch;
      });
    }

    // 3. Filtre Catégorie & Sous-Catégorie
    if (criteria.categoryId) {
      list = list.filter((p) => p.categoryId === criteria.categoryId || p.category === criteria.categoryId);
    }
    if (criteria.subcategoryId) {
      list = list.filter((p) => p.subcategoryId === criteria.subcategoryId || p.subcategory === criteria.subcategoryId);
    }

    // 4. Filtre Origine
    if (criteria.originCountry) {
      list = list.filter((p) => p.originCountry.toUpperCase() === criteria.originCountry!.toUpperCase());
    }

    // 5. Filtre Prix Min & Max
    if (criteria.minPrice) {
      const minD = new Decimal(criteria.minPrice);
      list = list.filter((p) => new Decimal(p.unitPrice).gte(minD));
    }
    if (criteria.maxPrice) {
      const maxD = new Decimal(criteria.maxPrice);
      list = list.filter((p) => new Decimal(p.unitPrice).lte(maxD));
    }

    // 6. Filtre Disponibilité en Stock
    if (criteria.inStockOnly) {
      list = list.filter((p) => p.stockAvailable > 0);
    }

    // 7. Filtre MOQ Max
    if (criteria.maxMoq !== undefined) {
      list = list.filter((p) => (p.minOrderQuantity || 1) <= criteria.maxMoq!);
    }

    // 8. Filtre Incoterm
    if (criteria.incoterm) {
      list = list.filter((p) => p.incoterm.toUpperCase() === criteria.incoterm!.toUpperCase());
    }

    // 9. Filtre Fournisseur spécifique
    if (criteria.supplierId) {
      list = list.filter((p) => p.supplierId === criteria.supplierId);
    }

    // 10. Filtre Statut spécifique
    if (criteria.status) {
      list = list.filter((p) => p.status === criteria.status);
    }

    // Calcul des Facettes sur les résultats filtrés
    const categoriesCount: Record<string, number> = {};
    const countriesCount: Record<string, number> = {};
    let minPriceVal = list.length > 0 ? list[0].unitPrice : '0.00';
    let maxPriceVal = list.length > 0 ? list[0].unitPrice : '0.00';

    for (const p of list) {
      categoriesCount[p.category] = (categoriesCount[p.category] || 0) + 1;
      countriesCount[p.originCountry] = (countriesCount[p.originCountry] || 0) + 1;
      if (new Decimal(p.unitPrice).lt(minPriceVal)) minPriceVal = p.unitPrice;
      if (new Decimal(p.unitPrice).gt(maxPriceVal)) maxPriceVal = p.unitPrice;
    }

    // 11. Tri
    switch (criteria.sortBy) {
      case 'PRICE_ASC':
        list.sort((a, b) => new Decimal(a.unitPrice).minus(b.unitPrice).toNumber());
        break;
      case 'PRICE_DESC':
        list.sort((a, b) => new Decimal(b.unitPrice).minus(a.unitPrice).toNumber());
        break;
      case 'AVAILABILITY_DESC':
        list.sort((a, b) => b.stockAvailable - a.stockAvailable);
        break;
      case 'NAME_ASC':
        list.sort((a, b) => (a.name.fr || '').localeCompare(b.name.fr || ''));
        break;
      case 'NEWEST':
      default:
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
    }

    // 12. Pagination
    const total = list.length;
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, criteria.limit || 20);
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      products: paginated.map((p) => structuredClone(p)),
      total,
      page,
      totalPages,
      facets: {
        categoriesCount,
        countriesCount,
        minPriceDetected: minPriceVal,
        maxPriceDetected: maxPriceVal,
      },
    };
  }

  // ==========================================================================
  // 5. COMPARATEUR B2B & FAVORIS (WISHLIST)
  // ==========================================================================

  public compareProducts(productIds: string[]): ProductComparisonMatrix {
    if (productIds.length > 4) {
      const err = new Error('COMPARATOR_MAX_4_PRODUCTS');
      (err as any).statusCode = 400;
      throw err;
    }

    const matchedProducts: ProductItem[] = [];
    for (const pid of productIds) {
      const p = this.products.get(pid);
      if (p) matchedProducts.push(structuredClone(p));
    }

    // Collecter les clés d'attributs communs et spécifiques
    const standardAttributes = [
      { key: 'unitPrice', label: 'Prix Unitaire' },
      { key: 'currency', label: 'Devise' },
      { key: 'minOrderQuantity', label: 'Quantité Minimale (MOQ)' },
      { key: 'unit', label: 'Unité de Vente' },
      { key: 'stockAvailable', label: 'Stock Disponible' },
      { key: 'incoterm', label: 'Incoterm' },
      { key: 'originCountry', label: 'Pays d’Origine' },
      { key: 'leadTimeDays', label: 'Délai d’Expédition (Jours)' },
      { key: 'supplierName', label: 'Fournisseur' },
    ];

    const attributes = standardAttributes.map((attr) => {
      const valuesByProductId: Record<string, string> = {};
      for (const p of matchedProducts) {
        valuesByProductId[p.id] = String((p as any)[attr.key] ?? '—');
      }
      return {
        key: attr.key,
        label: attr.label,
        valuesByProductId,
      };
    });

    return {
      products: matchedProducts,
      attributes,
    };
  }

  public toggleFavorite(userId: string, productId: string): { isFavorite: boolean; totalFavorites: number } {
    let favs = this.clientFavorites.get(userId);
    if (!favs) {
      favs = new Set();
      this.clientFavorites.set(userId, favs);
    }

    let isFav = false;
    if (favs.has(productId)) {
      favs.delete(productId);
      isFav = false;
    } else {
      favs.add(productId);
      isFav = true;
    }

    return { isFavorite: isFav, totalFavorites: favs.size };
  }

  public listFavorites(userId: string): ProductItem[] {
    const favs = this.clientFavorites.get(userId);
    if (!favs) return [];
    const list: ProductItem[] = [];
    for (const pid of favs) {
      const p = this.products.get(pid);
      if (p && p.isPublished) list.push(structuredClone(p));
    }
    return list;
  }

  // ==========================================================================
  // 6. IMPORTATION PAR LOT (BULK IMPORT CSV / JSON)
  // ==========================================================================

  public importProductsBulk(
    items: Partial<ProductItem>[],
    supplierId: string,
    supplierName: string
  ): BulkImportResult {
    const importedProducts: ProductItem[] = [];
    const errors: { row: number; sku?: string; error: string }[] = [];

    let rowIdx = 0;
    for (const item of items) {
      rowIdx++;
      try {
        if (!item.sku?.trim()) {
          errors.push({ row: rowIdx, error: 'SKU_OBLIGATOIRE' });
          continue;
        }

        const nameFr = typeof item.name === 'string' ? item.name : item.name?.fr || item.sku;
        const descFr = typeof item.description === 'string' ? item.description : item.description?.fr || '';

        const created = this.createProduct({
          sku: item.sku,
          supplierId,
          supplierName,
          category: item.category || 'COLD_CHAIN',
          name: { fr: nameFr, en: item.name?.en || '', ar: item.name?.ar || '' },
          description: { fr: descFr, en: item.description?.en || '', ar: item.description?.ar || '' },
          unitPrice: String(item.unitPrice || '10.00'),
          currency: item.currency || 'EUR',
          unit: item.unit || 'Palette',
          stockAvailable: Number(item.stockAvailable || 0),
          minOrderQuantity: Number(item.minOrderQuantity || 1),
          originCountry: item.originCountry || 'MA',
          incoterm: item.incoterm || 'FOB',
          leadTimeDays: Number(item.leadTimeDays || 3),
        });

        importedProducts.push(created);
      } catch (err: any) {
        errors.push({ row: rowIdx, sku: item.sku, error: err?.message || 'ERREUR_LIGNE_INVALIDE' });
      }
    }

    return {
      totalProcessed: items.length,
      successfulImports: importedProducts.length,
      failedImports: errors.length,
      importedProducts,
      errors,
    };
  }

  // ==========================================================================
  // 7. STATISTIQUES GLOBALES DU CATALOGUE (ADMIN)
  // ==========================================================================

  public getCatalogStatistics() {
    const all = Array.from(this.products.values());
    const totalReferences = all.length;
    const publishedCount = all.filter((p) => p.status === 'PUBLISHED').length;
    const pendingReviewCount = all.filter((p) => p.status === 'PENDING_REVIEW').length;
    const outOfStockCount = all.filter((p) => p.stockAvailable === 0).length;
    const reportedCount = all.filter((p) => p.isReported).length;

    let totalStockValueEur = new Decimal(0);
    const supplierRefCounts: Record<string, { name: string; count: number; stockValue: Decimal }> = {};

    for (const p of all) {
      const lineVal = new Decimal(p.unitPrice).times(p.stockAvailable);
      totalStockValueEur = totalStockValueEur.plus(lineVal);

      if (!supplierRefCounts[p.supplierId]) {
        supplierRefCounts[p.supplierId] = {
          name: p.supplierName,
          count: 0,
          stockValue: new Decimal(0),
        };
      }
      supplierRefCounts[p.supplierId].count++;
      supplierRefCounts[p.supplierId].stockValue = supplierRefCounts[p.supplierId].stockValue.plus(lineVal);
    }

    return {
      totalReferences,
      publishedCount,
      pendingReviewCount,
      outOfStockCount,
      reportedCount,
      totalStockValueEur: totalStockValueEur.toFixed(2),
      supplierStats: Object.entries(supplierRefCounts).map(([supId, data]) => ({
        supplierId: supId,
        supplierName: data.name,
        referencesCount: data.count,
        stockValueEur: data.stockValue.toFixed(2),
      })),
    };
  }
}

// Instance globale par défaut
export const defaultCatalogEngine = new CentralCatalogEngine();
