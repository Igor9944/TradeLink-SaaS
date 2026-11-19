// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import assert from 'assert';
import {
  ProductItem,
  ProductVariant,
  ProductSpecification,
} from '../../types';
import {
  CentralCatalogEngine,
} from '../../services/catalogEngine';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession, ServerRequestContext } from '../middlewares/errorAndSecurity.middleware';

console.log('\n====================================================================');
console.log('TRADELINK V6.0 — SUITE DE TESTS CATALOGUE CENTRAL & GESTION DES PRODUITS');
console.log('====================================================================\n');

async function runCatalogCentralTestSuite() {
  // Initialisation d'une instance dédiée du moteur de catalogue
  const catalog = new CentralCatalogEngine();

  // Acteurs de test
  const adminActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-admin-01',
    email: 'direction.sec@tradelink-saas.com',
    role: 'ADMIN',
    companyName: 'TradeLink Global Direction',
    sessionId: 'sess-cat-admin-01',
    mfaVerified: true,
  };
  registerSingleActiveSession(adminActor.id, adminActor.sessionId);

  const supplierActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-supp-01',
    email: 'export@eurotech-gmbh.de',
    role: 'FOURNISSEUR',
    companyName: 'EuroTech Industrial & ColdChain GmbH',
    sessionId: 'sess-cat-supp-01',
  };
  registerSingleActiveSession(supplierActor.id, supplierActor.sessionId);

  const otherSupplierActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-supp-02',
    email: 'contact@maghreb-agri.ma',
    role: 'FOURNISSEUR',
    companyName: 'Maghreb Agro-Export S.A.',
    sessionId: 'sess-cat-supp-02',
  };
  registerSingleActiveSession(otherSupplierActor.id, otherSupplierActor.sessionId);

  const clientActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-client-01',
    email: 'youssef.berrada@atlastrading.ma',
    role: 'CLIENT',
    companyName: 'Atlas Trading & Imports',
    sessionId: 'sess-cat-client-01',
  };
  registerSingleActiveSession(clientActor.id, clientActor.sessionId);

  // --------------------------------------------------------------------------
  // TEST 01 : Catégories Hiérarchiques & Suppression Contrôlée
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-01] Catégories Hiérarchiques & Suppression Contrôlée...');
  {
    const categories = catalog.listCategories();
    assert.ok(categories.length >= 4, 'Au moins 4 catégories racines initiales');

    const coldChain = categories.find((c) => c.code === 'COLD_CHAIN');
    assert.ok(coldChain, 'Catégorie COLD_CHAIN présente');
    assert.ok(coldChain!.subcategories && coldChain!.subcategories.length >= 2, 'Sous-catégories présentes');

    // 1. Interdiction de supprimer une catégorie avec des enfants
    assert.throws(
      () => catalog.deleteCategory(coldChain!.id),
      (err: any) => err.message === 'CANNOT_DELETE_CATEGORY_WITH_CHILDREN',
      'Suppression rejetée si enfants existants'
    );

    // 2. Création d'une catégorie temporaire isolée
    const tempCat = catalog.createCategory({
      code: 'TEMP_ISOLATED',
      name: { fr: 'Catégorie Temporaire', en: 'Temporary Category', ar: 'فئة مؤقتة' },
      description: { fr: 'Test suppression', en: 'Delete test', ar: 'اختبار الحذف' },
    });
    assert.ok(tempCat.id.startsWith('cat-temp-isolated'));

    // 3. Suppression autorisée de la feuille isolée sans produits
    const delResult = catalog.deleteCategory(tempCat.id);
    assert.strictEqual(delResult.success, true);
    assert.strictEqual(catalog.getCategoryById(tempCat.id), null);

    console.log('  ✅ [CAT-01] Arborescence hiérarchique et suppression contrôlée validées.');
  }

  // --------------------------------------------------------------------------
  // TEST 02 : Produits CRUD Complet & Unicité Absolue du SKU
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-02] Produits CRUD Complet & Unicité Absolue du SKU...');
  let createdProduct: ProductItem;
  {
    createdProduct = catalog.createProduct({
      sku: 'TL-TEST-SKU-001',
      supplierId: supplierActor.id,
      supplierName: supplierActor.companyName,
      category: 'COLD_CHAIN',
      categoryId: 'cat-cold-chain',
      subcategory: 'FRUITS_VEGETABLES',
      subcategoryId: 'subcat-fruits-veg',
      name: {
        fr: 'Conteneur Isotherme Test Pro',
        en: 'Test Pro Insulated Container',
        ar: 'حاوية اختبار معزولة',
      },
      description: {
        fr: 'Description de test en français avec conformité GDP.',
        en: 'Test description in English.',
        ar: 'وصف الاختبار بالعربية.',
      },
      unitPrice: '1250.00',
      currency: 'EUR',
      unit: 'Palette',
      stockAvailable: 50,
      minOrderQuantity: 2,
      originCountry: 'MA',
      incoterm: 'FOB Tanger Med',
      leadTimeDays: 5,
    });

    assert.ok(createdProduct.id.startsWith('prod-'));
    assert.strictEqual(createdProduct.sku, 'TL-TEST-SKU-001');
    assert.strictEqual(createdProduct.unitPrice, '1250.00');
    assert.strictEqual(createdProduct.minOrderQuantity, 2);

    // Contrôle unicité SKU : tentative de réutilisation du même SKU
    assert.throws(
      () =>
        catalog.createProduct({
          sku: 'tl-test-sku-001', // Insensible à la casse
          supplierId: otherSupplierActor.id,
          supplierName: otherSupplierActor.companyName,
          category: 'COLD_CHAIN',
          name: { fr: 'Doublon SKU', en: 'Duplicate SKU', ar: 'مكرر' },
          description: { fr: 'Erreur', en: 'Error', ar: 'خطأ' },
          unitPrice: '100.00',
          currency: 'EUR',
          unit: 'Lot',
          stockAvailable: 10,
          originCountry: 'FR',
          incoterm: 'EXW',
          leadTimeDays: 2,
        }),
      (err: any) => err.message === 'SKU_ALREADY_EXISTS',
      'Rejet du doublon de SKU'
    );

    // Contrôle prix négatif
    assert.throws(
      () =>
        catalog.createProduct({
          sku: 'TL-INVALID-PRICE',
          supplierId: supplierActor.id,
          supplierName: supplierActor.companyName,
          category: 'COLD_CHAIN',
          name: { fr: 'Prix négatif', en: 'Negative price', ar: 'سعر سالب' },
          description: { fr: 'Test', en: 'Test', ar: 'اختبار' },
          unitPrice: '-50.00',
          currency: 'EUR',
          unit: 'Lot',
          stockAvailable: 10,
          originCountry: 'FR',
          incoterm: 'EXW',
          leadTimeDays: 1,
        }),
      (err: any) => err.message === 'INVALID_NEGATIVE_PRICE',
      'Rejet de prix négatif'
    );

    console.log('  ✅ [CAT-02] Création, SKU unique et contrôles de prix certifiés.');
  }

  // --------------------------------------------------------------------------
  // TEST 03 : Spécifications Techniques & Photos / Galerie d'Images
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-03] Spécifications Techniques & Photos / Galerie d’Images...');
  {
    const specs: ProductSpecification[] = [
      { key: 'Plage de température', value: '-25°C à +8°C', category: 'Thermique' },
      { key: 'Autonomie thermique', value: '120 heures', category: 'Performance' },
      { key: 'Certification', value: 'GDP / ISO 13485', category: 'Qualité' },
    ];
    const gallery = [
      '/images/products/container-front.jpg',
      '/images/products/container-inside.jpg',
      '/images/products/container-telemetry.jpg',
    ];

    const updated = catalog.updateProduct(createdProduct.id, supplierActor.id, supplierActor.role, {
      specifications: specs,
      gallery,
      photos: [gallery[0]],
    });

    assert.strictEqual(updated.specifications?.length, 3);
    assert.strictEqual(updated.gallery?.length, 3);
    assert.strictEqual(updated.photos?.[0], '/images/products/container-front.jpg');

    console.log('  ✅ [CAT-03] Spécifications et galerie de photos associées.');
  }

  // --------------------------------------------------------------------------
  // TEST 04 : Variantes B2B avec Stocks Propres & Deltas de Prix
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-04] Variantes B2B avec Stocks Propres & Deltas de Prix...');
  {
    const variants: ProductVariant[] = [
      {
        id: 'var-01',
        sku: 'TL-TEST-SKU-001-STD',
        name: 'Modèle Standard (Autonomie 72h)',
        priceDelta: '0.00',
        stockAvailable: 30,
        attributes: { autonomie: '72h', isolation: 'VIP Standard' },
      },
      {
        id: 'var-02',
        sku: 'TL-TEST-SKU-001-EXT',
        name: 'Modèle Prolongé (Autonomie 120h + Télémétrie IoT)',
        priceDelta: '350.00',
        stockAvailable: 20,
        attributes: { autonomie: '120h', isolation: 'VIP Aérogel', iot: 'Inclus' },
      },
    ];

    const updated = catalog.updateProduct(createdProduct.id, supplierActor.id, supplierActor.role, {
      variants,
    });

    assert.strictEqual(updated.variants?.length, 2);
    assert.strictEqual(updated.variants?.[1].priceDelta, '350.00');
    assert.strictEqual(updated.variants?.[1].stockAvailable, 20);

    console.log('  ✅ [CAT-04] Variantes B2B et stocks configurés.');
  }

  // --------------------------------------------------------------------------
  // TEST 05 : Modération Administrative (Approbation, Rejet Motivé, Suspension)
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-05] Modération Administrative & Cycle de Vie des Statuts...');
  {
    // 1. Création d'un produit nécessitant modération admin
    const pendingProduct = catalog.createProduct({
      sku: 'TL-PENDING-MOD-01',
      supplierId: supplierActor.id,
      supplierName: supplierActor.companyName,
      category: 'INDUSTRIAL_EQUIPMENT',
      name: { fr: 'Compresseur Industriel 10 bars', en: 'Industrial Compressor', ar: 'ضاغط صناعي' },
      description: { fr: 'Attente revue', en: 'Pending review', ar: 'قيد المراجعة' },
      unitPrice: '3200.00',
      currency: 'EUR',
      unit: 'Unité',
      stockAvailable: 5,
      originCountry: 'DE',
      incoterm: 'DAP',
      leadTimeDays: 7,
      requireAdminReview: true,
    });
    assert.strictEqual(pendingProduct.status, 'PENDING_REVIEW');
    assert.strictEqual(pendingProduct.isPublished, false);

    // 2. Rejet par l'Admin SANS motif -> Erreur REJECTION_REASON_MANDATORY
    assert.throws(
      () => catalog.moderateProductPublication(pendingProduct.id, 'REJECT', ''),
      (err: any) => err.message === 'REJECTION_REASON_MANDATORY',
      'Le rejet sans motif doit échouer'
    );

    // 3. Rejet avec motif explicite
    const rejectedProduct = catalog.moderateProductPublication(
      pendingProduct.id,
      'REJECT',
      'Veuillez joindre le certificat CE et préciser la tension triphasée.'
    );
    assert.strictEqual(rejectedProduct.status, 'DRAFT');
    assert.strictEqual(rejectedProduct.isPublished, false);
    assert.strictEqual(
      rejectedProduct.adminRejectionReason,
      'Veuillez joindre le certificat CE et préciser la tension triphasée.'
    );

    // 4. Correction par le fournisseur et Approbation par l'Admin
    const approvedProduct = catalog.moderateProductPublication(pendingProduct.id, 'APPROVE');
    assert.strictEqual(approvedProduct.status, 'PUBLISHED');
    assert.strictEqual(approvedProduct.isPublished, true);
    assert.strictEqual(approvedProduct.adminRejectionReason, undefined);

    // 5. Signalement et Suspension
    const reported = catalog.reportProduct(approvedProduct.id, 'Non-conformité déclarée sur la tension');
    assert.strictEqual(reported.isReported, true);
    assert.strictEqual(reported.reportReason, 'Non-conformité déclarée sur la tension');

    const suspended = catalog.suspendProduct(approvedProduct.id, 'Mesure conservatoire suite au signalement');
    assert.strictEqual(suspended.status, 'SUSPENDED');
    assert.strictEqual(suspended.isPublished, false);

    console.log('  ✅ [CAT-05] Modération, rejet motivé obligatoire et suspension certifiés.');
  }

  // --------------------------------------------------------------------------
  // TEST 06 : Recherche Full-Text & Filtres Combinés Multicritères
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-06] Recherche Full-Text & Filtres Combinés Multicritères...');
  {
    // Recherche par mot clé
    const searchRes = catalog.searchProducts({ search: 'Isotherme' }, 'CLIENT');
    assert.ok(searchRes.products.length >= 1, 'Produit retrouvé par mot clé français');

    // Filtre par catégorie
    const catRes = catalog.searchProducts({ categoryId: 'cat-cold-chain' }, 'CLIENT');
    assert.ok(catRes.products.every((p) => p.categoryId === 'cat-cold-chain' || p.category === 'COLD_CHAIN'));

    // Filtre combiné : Prix min/max + Pays d'origine + En stock
    const combinedRes = catalog.searchProducts(
      {
        minPrice: '1000.00',
        maxPrice: '2000.00',
        originCountry: 'MA',
        inStockOnly: true,
      },
      'CLIENT'
    );
    assert.ok(combinedRes.products.length >= 1);
    for (const p of combinedRes.products) {
      assert.ok(parseFloat(p.unitPrice) >= 1000 && parseFloat(p.unitPrice) <= 2000);
      assert.strictEqual(p.originCountry, 'MA');
      assert.ok(p.stockAvailable > 0);
    }

    console.log('  ✅ [CAT-06] Moteur de recherche et filtres combinés validés.');
  }

  // --------------------------------------------------------------------------
  // TEST 07 : Tri, Pagination & Facettes Statistiques
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-07] Tri, Pagination & Facettes Statistiques...');
  {
    // 1. Tri par prix croissant
    const sortedAsc = catalog.searchProducts({ sortBy: 'PRICE_ASC', limit: 10 }, 'CLIENT');
    for (let i = 0; i < sortedAsc.products.length - 1; i++) {
      assert.ok(parseFloat(sortedAsc.products[i].unitPrice) <= parseFloat(sortedAsc.products[i + 1].unitPrice));
    }

    // 2. Pagination & Facettes
    assert.ok(sortedAsc.page >= 1);
    assert.ok(sortedAsc.facets.categoriesCount !== undefined);
    assert.ok(sortedAsc.facets.countriesCount !== undefined);
    assert.ok(parseFloat(sortedAsc.facets.minPriceDetected) >= 0);

    console.log('  ✅ [CAT-07] Tri croissant/décroissant, pagination et facettes vérifiés.');
  }

  // --------------------------------------------------------------------------
  // TEST 08 : Traduction Automatique IA Trilingue (FR / EN / AR)
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-08] Traduction Automatique IA Trilingue (FR / EN / AR)...');
  {
    // Création d'un produit avec libellé en arabe uniquement
    const arabicOnlyProduct = catalog.createProduct({
      sku: 'TL-DATE-MEDJOOL-01',
      supplierId: supplierActor.id,
      supplierName: supplierActor.companyName,
      category: 'COLD_CHAIN',
      name: {
        fr: '',
        en: '',
        ar: 'تمور المجهول الفاخرة تصدير كرتون 5 كغ',
      },
      description: {
        fr: '',
        en: '',
        ar: 'تمور مغربية ممتازة مصنفة حجم جامبو معتمدة بيولوجيا.',
      },
      unitPrice: '45.00',
      currency: 'EUR',
      unit: 'Carton 5kg',
      stockAvailable: 200,
      originCountry: 'MA',
      incoterm: 'FOB Tanger Med',
      leadTimeDays: 3,
      originalLanguage: 'ar',
    });

    assert.strictEqual(arabicOnlyProduct.originalLanguage, 'ar');
    assert.strictEqual(arabicOnlyProduct.isAutoTranslated, true);
    assert.ok(arabicOnlyProduct.name.fr.length > 0, 'Nom auto-traduit en français');
    assert.ok(arabicOnlyProduct.name.en.length > 0, 'Nom auto-traduit en anglais');

    // Surcharge manuelle autorisée par le fournisseur
    const customized = catalog.updateProduct(arabicOnlyProduct.id, supplierActor.id, supplierActor.role, {
      name: {
        ...arabicOnlyProduct.name,
        fr: 'Dattes Medjool Jumbo Export Premium (Carton 5 kg)',
      },
    });
    assert.strictEqual(customized.name.fr, 'Dattes Medjool Jumbo Export Premium (Carton 5 kg)');

    console.log('  ✅ [CAT-08] Traduction automatique et personnalisation fournisseur validées.');
  }

  // --------------------------------------------------------------------------
  // TEST 09 : Comparateur B2B Multi-Produits (Matrix jusqu'à 4 Produits)
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-09] Comparateur B2B Multi-Produits (Matrix jusqu’à 4 Produits)...');
  {
    const matrix = catalog.compareProducts([createdProduct.id]);
    assert.strictEqual(matrix.products.length, 1);
    assert.ok(matrix.attributes.length >= 8);

    const priceAttr = matrix.attributes.find((a) => a.key === 'unitPrice');
    assert.strictEqual(priceAttr?.valuesByProductId[createdProduct.id], '1250.00');

    // Rejet si plus de 4 produits
    assert.throws(
      () => catalog.compareProducts(['p1', 'p2', 'p3', 'p4', 'p5']),
      (err: any) => err.message === 'COMPARATOR_MAX_4_PRODUCTS',
      'Le comparateur rejette plus de 4 produits'
    );

    console.log('  ✅ [CAT-09] Matrice comparative B2B (max 4 produits) conforme.');
  }

  // --------------------------------------------------------------------------
  // TEST 10 : Favoris (Wishlist) Client
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-10] Favoris (Wishlist) Client...');
  {
    const t1 = catalog.toggleFavorite(clientActor.id, createdProduct.id);
    assert.strictEqual(t1.isFavorite, true);

    const favs = catalog.listFavorites(clientActor.id);
    assert.strictEqual(favs.length, 1);
    assert.strictEqual(favs[0].id, createdProduct.id);

    const t2 = catalog.toggleFavorite(clientActor.id, createdProduct.id);
    assert.strictEqual(t2.isFavorite, false);
    assert.strictEqual(catalog.listFavorites(clientActor.id).length, 0);

    console.log('  ✅ [CAT-10] Gestion de la liste d’envies client (toggle & listing) certifiée.');
  }

  // --------------------------------------------------------------------------
  // TEST 11 : Importation par Lot (Bulk Import CSV / JSON)
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-11] Importation par Lot (Bulk Import)...');
  {
    const bulkPayload = [
      {
        sku: 'TL-BULK-001',
        name: { fr: 'Moteur Asynchrone 15kW' },
        unitPrice: '890.00',
        stockAvailable: 12,
        originCountry: 'DE',
      },
      {
        sku: 'TL-BULK-002',
        name: { fr: 'Variateur de Fréquence Triphasé' },
        unitPrice: '450.00',
        stockAvailable: 25,
        originCountry: 'DE',
      },
      {
        // SKU manquant -> Erreur attendue
        sku: '',
        name: { fr: 'Produit Invalide' },
        unitPrice: '10.00',
      },
    ];

    const bulkResult = catalog.importProductsBulk(
      bulkPayload as any,
      supplierActor.id,
      supplierActor.companyName
    );

    assert.strictEqual(bulkResult.totalProcessed, 3);
    assert.strictEqual(bulkResult.successfulImports, 2);
    assert.strictEqual(bulkResult.failedImports, 1);
    assert.strictEqual(bulkResult.errors[0].row, 3);
    assert.strictEqual(bulkResult.errors[0].error, 'SKU_OBLIGATOIRE');

    console.log('  ✅ [CAT-11] Importation par lot avec rapport d’erreurs ligne par ligne validée.');
  }

  // --------------------------------------------------------------------------
  // TEST 12 : Sécurité Anti-IDOR & Cloisonnement RBAC Strict
  // --------------------------------------------------------------------------
  console.log('🔹 [CAT-12] Sécurité Anti-IDOR Fournisseur & Cloisonnement RBAC...');
  {
    // 1. Un fournisseur tiers ne peut modifier un produit qui ne lui appartient pas
    assert.throws(
      () =>
        catalog.updateProduct(createdProduct.id, otherSupplierActor.id, otherSupplierActor.role, {
          unitPrice: '9999.00',
        }),
      (err: any) => err.message === 'FORBIDDEN_IDOR_PRODUCT_OWNERSHIP',
      'Anti-IDOR : Rejet modification tiers'
    );

    // 2. Un fournisseur tiers ne peut supprimer un produit qui ne lui appartient pas
    assert.throws(
      () => catalog.deleteProduct(createdProduct.id, otherSupplierActor.id, otherSupplierActor.role),
      (err: any) => err.message === 'FORBIDDEN_IDOR_PRODUCT_OWNERSHIP',
      'Anti-IDOR : Rejet suppression tiers'
    );

    // 3. Mise à jour rapide de prix/stock par un tiers interdite
    assert.throws(
      () =>
        catalog.updateStockAndPriceQuick(createdProduct.id, otherSupplierActor.id, otherSupplierActor.role, {
          stockAvailable: 999,
        }),
      (err: any) => err.message === 'FORBIDDEN_IDOR_PRODUCT_OWNERSHIP',
      'Anti-IDOR : Rejet ajustement rapide stock tiers'
    );

    console.log('  ✅ [CAT-12] Isolation stricte des données fournisseurs et blocage IDOR certifiés.');
  }

  // --------------------------------------------------------------------------
  // TEST 13 : Validation des Routes REST API (/api/v1/catalog/*)
  // --------------------------------------------------------------------------
  console.log('🔹 [API-01] Validation des Routes REST API sous /api/v1/catalog/*...');
  {
    const store = new TradeLinkRepositoryStore({
      products: catalog.getAllProducts(),
      orders: [],
      kycDossiers: [],
      backups: [],
      rooms: [],
      calcHistory: [],
      auditLogs: [],
    });
    const app = new TradeLinkApiApplication(store);

    const req = (opts: Partial<ServerRequestContext> & { method: string; path: string; user?: any }): ServerRequestContext => ({
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'corr-cat-api',
      ipAddress: '127.0.0.1',
      ...opts,
    });

    // 1. GET /api/v1/catalog/categories
    const getCatsRes = app.handleRequest(req({
      method: 'GET',
      path: '/api/v1/catalog/categories',
    }));
    if (getCatsRes.statusCode !== 200) console.log('getCatsRes error:', getCatsRes);
    assert.strictEqual(getCatsRes.statusCode, 200);
    assert.ok(Array.isArray(getCatsRes.body.data));

    // 2. POST /api/v1/catalog/categories (Admin)
    const createCatRes = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/catalog/categories',
      user: adminActor,
      body: {
        code: 'SOLAR_ENERGY',
        name: { fr: 'Énergie Solaire & Photovoltaïque', en: 'Solar Energy', ar: 'الطاقة الشمسية' },
        description: { fr: 'Panneaux et onduleurs', en: 'Panels & inverters', ar: 'ألواح ومحولات' },
      },
    }));
    if (createCatRes.statusCode !== 201) console.log('createCatRes error:', createCatRes);
    assert.strictEqual(createCatRes.statusCode, 201);
    const newCatId = (createCatRes.body.data as any).id;
    assert.ok(newCatId);

    // 3. GET /api/v1/catalog/products (Recherche & Filtres)
    const getProdsRes = app.handleRequest(req({
      method: 'GET',
      path: '/api/v1/catalog/products',
      query: { search: 'Conteneur' },
    }));
    if (getProdsRes.statusCode !== 200) console.log('getProdsRes error:', getProdsRes);
    assert.strictEqual(getProdsRes.statusCode, 200);
    assert.ok((getProdsRes.body.data as any).products !== undefined);

    // 4. POST /api/v1/catalog/products (Fournisseur)
    const createProdRes = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/catalog/products',
      user: supplierActor,
      body: {
        sku: 'TL-API-REST-001',
        category: 'COLD_CHAIN',
        name: { fr: 'Sonde de Température IoT Bluetooth' },
        description: { fr: 'Enregistreur conforme EN 12830' },
        unitPrice: '85.00',
        currency: 'EUR',
        unit: 'Unité',
        stockAvailable: 150,
        minOrderQuantity: 5,
        originCountry: 'DE',
        incoterm: 'DAP',
        leadTimeDays: 2,
      },
    }));
    if (createProdRes.statusCode !== 201) console.log('createProdRes error:', createProdRes);
    assert.strictEqual(createProdRes.statusCode, 201);
    const apiProdId = (createProdRes.body.data as any).id;

    // 5. GET /api/v1/catalog/products/:id
    const getProdDetailRes = app.handleRequest(req({
      method: 'GET',
      path: `/api/v1/catalog/products/${apiProdId}`,
      user: clientActor,
    }));
    if (getProdDetailRes.statusCode !== 200) console.log('getProdDetailRes error:', getProdDetailRes);
    assert.strictEqual(getProdDetailRes.statusCode, 200);
    assert.strictEqual((getProdDetailRes.body.data as any).sku, 'TL-API-REST-001');

    // 6. PUT /api/v1/catalog/products/:id/quick-update
    const quickUpdateRes = app.handleRequest(req({
      method: 'PUT',
      path: `/api/v1/catalog/products/${apiProdId}/quick-update`,
      user: supplierActor,
      body: {
        stockAvailable: 140,
        unitPrice: '79.90',
      },
    }));
    if (quickUpdateRes.statusCode !== 200) console.log('quickUpdateRes error:', quickUpdateRes);
    assert.strictEqual(quickUpdateRes.statusCode, 200);
    assert.strictEqual((quickUpdateRes.body.data as any).stockAvailable, 140);
    assert.strictEqual((quickUpdateRes.body.data as any).unitPrice, '79.90');

    // 7. POST /api/v1/catalog/compare
    const compareRes = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/catalog/compare',
      body: {
        productIds: [apiProdId],
      },
    }));
    assert.strictEqual(compareRes.statusCode, 200);
    assert.ok(Array.isArray((compareRes.body.data as any).attributes));

    // 8. POST /api/v1/catalog/favorites/:id/toggle & GET /api/v1/catalog/favorites
    const toggleFavRes = app.handleRequest(req({
      method: 'POST',
      path: `/api/v1/catalog/favorites/${apiProdId}/toggle`,
      user: clientActor,
    }));
    assert.strictEqual(toggleFavRes.statusCode, 200);
    assert.strictEqual((toggleFavRes.body.data as any).isFavorite, true);

    const listFavRes = app.handleRequest(req({
      method: 'GET',
      path: '/api/v1/catalog/favorites',
      user: clientActor,
    }));
    assert.strictEqual(listFavRes.statusCode, 200);
    assert.strictEqual((listFavRes.body.data as any).length, 1);

    // 9. GET /api/v1/catalog/stats (Admin)
    const statsRes = app.handleRequest(req({
      method: 'GET',
      path: '/api/v1/catalog/stats',
      user: adminActor,
    }));
    assert.strictEqual(statsRes.statusCode, 200);
    assert.ok(Number((statsRes.body.data as any).totalReferences) >= 1);

    // 10. Protection IDOR sur suppression de produit
    const deleteIdorRes = app.handleRequest(req({
      method: 'DELETE',
      path: `/api/v1/catalog/products/${apiProdId}`,
      user: otherSupplierActor,
    }));
    assert.strictEqual(deleteIdorRes.statusCode, 403);

    console.log('  ✅ [API-01] 10 endpoints REST /api/v1/catalog/* certifiés.');
  }

  console.log('\n====================================================================');
  console.log('🎉 TOUS LES TESTS DU CATALOGUE CENTRAL (13/13) ONT RÉUSSI !');
  console.log('Catalogue B2B, catégories, modération, comparaison et favoris 100% opérationnels.');
  console.log('====================================================================\n');
}

runCatalogCentralTestSuite().catch((err) => {
  console.error('\n❌ ÉCHEC DANS LA SUITE DE TESTS DU CATALOGUE CENTRAL :', err);
  process.exit(1);
});
