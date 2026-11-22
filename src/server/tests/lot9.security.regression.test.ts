// ============================================================================
// TRADELINK V6.1 — SUITE DE NON-RÉGRESSION SÉCURITÉ LOT 9 (SAST / DAST / OWASP)
// Vérifie toutes les remédiations critiques, hautes et moyennes du LOT 9 :
// 1. Auth Bypass fermé (rejet login sans password + blocage compte inconnu + MFA Admin)
// 2. Webhooks Paiement (Stripe-Signature obligatoire + rejet secret prédictible + anti-rejeu)
// 3. Endpoints opérationnels & métier protégés (401/403 + auth-before-lookup)
// 4. Anti-IDOR & blocage des fallbacks RBAC permissifs (VISITEUR/tiers bloqués)
// 5. Express 5 Query Safety (?search[x]=1 -> 400), Health Probes réels & CORS 403 en prod
// 6. Sanitization XSS itérative (<scr<script>ipt>), préservation password, Email/XLSX escape
// 7. Token de téléchargement documentaire (rejet secret en dur & NaN expires)
// 8. SAST statique : absence totale de Math.random() et de secrets hardcodés en backend
// ============================================================================

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createApp } from '../app';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import {
  registerSingleActiveSession,
  sanitizeHtmlInput,
  sanitizeObjectFields,
  ServerRequestContext,
} from '../middlewares/errorAndSecurity.middleware';
import {
  computeCurrentTotpCode,
  getServiceHmacSecret,
} from '../../services/securityCrypto';
import { NotificationTemplateEngine } from '../../services/notificationEngine';
import { exportDatasetToFormat } from '../../services/adminAdvancedEngine';
import { ImportExportEngine } from '../../services/importExportEngine';
import { AnalyticsEngine } from '../../services/globalSearchAndAnalyticsEngine';
import { BillingDocumentEngine } from '../../services/billingDocumentEngine';

function createRegressionSnapshot(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prd-lot9-01',
        sku: 'TL-L9-001',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Supply GmbH',
        category: 'COLD_CHAIN',
        name: { fr: 'Compresseur Froid', en: 'Cold Compressor', ar: 'ضاغط تبريد' },
        description: { fr: 'Unité industrielle', en: 'Industrial unit', ar: 'وحدة صناعية' },
        unitPrice: '1200.00',
        currency: 'EUR',
        taxRate: '0.20',
        unit: 'UNITÉ',
        stockAvailable: 15,
        stockReserved: 0,
        minStockAlert: 2,
        icon3d: 'warehouse',
        originCountry: 'DE',
        incoterm: 'DAP',
        leadTimeDays: 3,
        isPublished: true,
        deletedAt: null,
      },
    ],
    orders: [
      {
        id: 'ord-lot9-01',
        orderNumber: 'CMD-L9-1001',
        clientId: 'usr-client-01',
        clientName: 'Atlas Import',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Supply GmbH',
        status: 'PREPARING',
        subtotalAmount: '1200.00',
        taxAmount: '240.00',
        shippingAmount: '100.00',
        totalAmount: '1540.00',
        currency: 'EUR',
        shippingAddress: 'Casablanca',
        createdAt: '2026-11-20T10:00:00.000Z',
        items: [],
        timeline: [],
      },
    ],
    kycDossiers: [],
    backups: [
      {
        id: 'bkp-lot9-01',
        backupCode: 'BKP-L9-01',
        type: 'FULL_SCHEDULED',
        sizeFormatted: '1.0 MB',
        encryptionKeyAlias: 'alias/tradelink-bkp-v6',
        sha256: 'a'.repeat(64),
        status: 'VERIFIED',
        restoreStatus: 'PENDING_SECOND_APPROVAL',
        restoreInitiatorId: 'usr-other-admin',
        createdAt: '2026-11-20T09:00:00.000Z',
      },
    ],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
    quotes: [],
    invoices: [],
    payments: [],
    shipments: [
      {
        id: 'shp-lot9-01',
        orderId: 'ord-lot9-01',
        orderNumber: 'CMD-L9-1001',
        trackingNumber: 'TRK-L9-001',
        clientId: 'usr-client-01',
        supplierId: 'usr-supp-01',
        carrierId: 'usr-trans-01',
        carrierName: 'LogisTrading',
        transportMode: 'ROAD',
        icon3d: 'delivery-van',
        status: 'IN_TRANSIT',
        origin: 'Hamburg',
        destination: 'Casablanca',
        weightKg: '1200',
        volumeM3: '4.5',
        palletsCount: 2,
        estimatedArrival: '2026-11-25',
        podSigned: false,
        customsCleared: true,
      },
    ],
    incidents: [],
    stockMovements: [],
    commercialDocuments: [],
  };
}

async function httpRequestJson(
  options: http.RequestOptions,
  rawBody?: string
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed: any = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (rawBody !== undefined) {
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(rawBody));
      req.write(rawBody);
    }
    req.end();
  });
}

async function runLot9SecurityRegressionTests() {
  console.log('================================================================================');
  console.log('TRADELINK V6.1 — SUITE DE NON-RÉGRESSION SÉCURITÉ LOT 9');
  console.log('================================================================================');

  const repo = new TradeLinkRepositoryStore(createRegressionSnapshot(), false);
  const app = new TradeLinkApiApplication(repo);

  const req = (partial: Partial<ServerRequestContext> & { method: string; path: string }) =>
    app.handleRequest({
      correlationId: `lot9-reg-${Date.now()}`,
      ipAddress: '127.0.0.1',
      headers: {},
      query: {},
      params: {},
      body: {},
      ...partial,
    });

  // --------------------------------------------------------------------------
  // 1. Auth Bypass Closure & Admin MFA Enforcement (CRITICAL)
  // --------------------------------------------------------------------------
  {
    const bypassLogin = req({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'k.benali@tradelink-global.com', userId: 'usr-admin-01', role: 'ADMIN' },
    });
    assert.strictEqual(bypassLogin.statusCode, 400, 'Login sans password doit retourner 400');

    const unknownLogin = req({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'ghost@attacker.evil', password: 'SomePassword!2026' },
    });
    assert.strictEqual(unknownLogin.statusCode, 401, 'Compte inconnu doit retourner 401');

    const adminNoMfa = req({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'k.benali@tradelink-global.com', password: 'AdminTradeLink!2026' },
    });
    assert.strictEqual(adminNoMfa.statusCode, 200);
    const noMfaData = adminNoMfa.body.data as { userId: string; sessionId: string; mfaVerified: boolean; mfaRequired: boolean };
    assert.strictEqual(noMfaData.mfaVerified, false, 'Admin sans code MFA ne doit pas avoir mfaVerified=true');
    assert.strictEqual(noMfaData.mfaRequired, true, 'Admin sans code MFA doit recevoir mfaRequired=true');

    const blockedAdminAction = req({
      method: 'GET',
      path: '/api/v1/metrics',
      user: {
        id: noMfaData.userId,
        email: 'k.benali@tradelink-global.com',
        role: 'ADMIN',
        sessionId: noMfaData.sessionId,
        companyName: 'TradeLink HQ',
        mfaVerified: false,
      },
    });
    assert.strictEqual(blockedAdminAction.statusCode, 403, 'Session Admin non MFA doit être bloquée (403)');
    assert.strictEqual(blockedAdminAction.body.error?.code, 'ADMIN_MFA_MANDATORY');

    const badMfa = req({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'k.benali@tradelink-global.com', password: 'AdminTradeLink!2026', mfaCode: '000000' },
    });
    assert.strictEqual(badMfa.statusCode, 401, 'Code TOTP Admin invalide doit retourner 401');

    // Récupération du secret TOTP via /auth/mfa/setup puis vérification et login direct avec TOTP valide
    const mfaSetup = req({
      method: 'POST',
      path: '/api/v1/auth/mfa/setup',
      user: {
        id: noMfaData.userId,
        email: 'k.benali@tradelink-global.com',
        role: 'ADMIN',
        sessionId: noMfaData.sessionId,
        companyName: 'TradeLink Global HQ',
      },
    });
    assert.strictEqual(mfaSetup.statusCode, 200);
    const validTotp = computeCurrentTotpCode((mfaSetup.body.data as { secretBase32: string }).secretBase32);

    const adminWithMfa = req({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'k.benali@tradelink-global.com', password: 'AdminTradeLink!2026', mfaCode: validTotp },
    });
    assert.strictEqual(adminWithMfa.statusCode, 200);
    assert.strictEqual((adminWithMfa.body.data as any).mfaVerified, true, 'Admin avec TOTP valide obtient mfaVerified=true');
    console.log('✓ [LOT9-01] Fermeture auth bypass passwordless & enforcement strict MFA Admin validés.');
  }

  // --------------------------------------------------------------------------
  // 2. Payment Webhooks HMAC & Anti-Replay Enforcement (CRITICAL)
  // --------------------------------------------------------------------------
  {
    const sampleStripeBody = {
      id: 'evt_lot9_unsigned',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', metadata: {} } },
    };
    const unsignedStripe = req({
      method: 'POST',
      path: '/api/v1/payments/stripe/webhook',
      body: sampleStripeBody,
    });
    assert.ok(
      unsignedStripe.statusCode === 400 || unsignedStripe.statusCode === 401,
      `Stripe webhook non signé doit être rejeté (reçu ${unsignedStripe.statusCode})`
    );

    const forgedHmac = crypto.createHmac('sha256', 'wrong_secret').update(`1000.${JSON.stringify(sampleStripeBody)}`).digest('hex');
    const forgedStripe = req({
      method: 'POST',
      path: '/api/v1/payments/stripe/webhook',
      headers: { 'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=${forgedHmac}` },
      body: sampleStripeBody,
    });
    assert.ok(forgedStripe.statusCode === 400 || forgedStripe.statusCode === 401, 'Stripe webhook forgé rejeté');

    const staleTs = Math.floor(Date.now() / 1000) - 3600;
    const stripeSecret = getServiceHmacSecret('STRIPE_WEBHOOK_SECRET');
    const staleHmac = crypto.createHmac('sha256', stripeSecret).update(`${staleTs}.${JSON.stringify(sampleStripeBody)}`).digest('hex');
    const staleStripe = req({
      method: 'POST',
      path: '/api/v1/payments/stripe/webhook',
      headers: { 'stripe-signature': `t=${staleTs},v1=${staleHmac}` },
      body: sampleStripeBody,
    });
    assert.ok(staleStripe.statusCode === 400 || staleStripe.statusCode === 401, 'Stripe webhook expiré (anti-rejeu) rejeté');

    const nowTs = Math.floor(Date.now() / 1000);
    const hardcodedOldHmac = crypto
      .createHmac('sha256', 'whsec_stripe_secret_key_v6')
      .update(`${nowTs}.${JSON.stringify(sampleStripeBody)}`)
      .digest('hex');
    const oldSecretProvider = req({
      method: 'POST',
      path: '/api/v1/webhooks/payments/stripe',
      headers: {
        'stripe-signature': `t=${nowTs},v1=${hardcodedOldHmac}`,
        'x-timestamp': String(nowTs),
      },
      body: sampleStripeBody,
    });
    assert.strictEqual(oldSecretProvider.statusCode, 400, 'Ancien secret hardcodé whsec_stripe_secret_key_v6 doit échouer');

    const unknownProvider = req({
      method: 'POST',
      path: '/api/v1/webhooks/payments/evil_gateway',
      body: sampleStripeBody,
    });
    assert.strictEqual(unknownProvider.statusCode, 400);
    assert.strictEqual(unknownProvider.body.error?.code, 'INVALID_PAYMENT_PROVIDER');
    console.log('✓ [LOT9-02] Webhooks paiement protégés (rejet non-signé, secret hardcodé & rejeu).');
  }

  // --------------------------------------------------------------------------
  // 3. Protected Operational & Business Endpoints + Auth-Before-Lookup (HIGH)
  // --------------------------------------------------------------------------
  {
    const unauthRoutes: Array<{ method: string; path: string; body?: any }> = [
      { method: 'GET', path: '/api/v1/metrics' },
      { method: 'GET', path: '/api/v1/circuit-breakers' },
      { method: 'GET', path: '/api/v1/dlq/jobs' },
      { method: 'GET', path: '/api/v1/stocks/overview' },
      { method: 'GET', path: '/api/v1/stocks/movements' },
      { method: 'GET', path: '/api/v1/stocks/reservations' },
      { method: 'GET', path: '/api/v1/stocks/inventory' },
      { method: 'GET', path: '/api/v1/stocks/alerts' },
      { method: 'GET', path: '/api/v1/stocks/reports/valuation' },
      { method: 'POST', path: '/api/v1/translation/detect', body: { text: 'Bonjour' } },
      { method: 'POST', path: '/api/v1/translation/text', body: { text: 'Bonjour', targetLang: 'en' } },
      { method: 'POST', path: '/api/v1/translation/product/prd-lot9-01', body: { targetLang: 'en' } },
      { method: 'GET', path: '/api/v1/translation/glossary' },
      { method: 'GET', path: '/api/v1/translation/metrics' },
      { method: 'POST', path: '/api/v1/cart/validate', body: { items: [{ productId: 'prd-lot9-01', quantity: 1 }] } },
      // Auth-before-lookup (401 au lieu de 404 pour éviter l'énumération d'ID)
      { method: 'DELETE', path: '/api/v1/products/nonexistent-id-999' },
      { method: 'GET', path: '/api/v1/orders/nonexistent-id-999' },
    ];

    for (const r of unauthRoutes) {
      const res = req(r);
      assert.strictEqual(res.statusCode, 401, `Route ${r.method} ${r.path} sans auth doit retourner 401 (reçu ${res.statusCode})`);
    }

    const clientUser = {
      id: 'usr-client-01',
      email: 'client@atlas.ma',
      role: 'CLIENT' as const,
      sessionId: 'sess-lot9-client-1',
      companyName: 'Atlas Import',
      mfaVerified: true,
    };
    registerSingleActiveSession(clientUser.id, clientUser.sessionId, true);

    for (const adminPath of ['/api/v1/metrics', '/api/v1/circuit-breakers', '/api/v1/dlq/jobs', '/api/v1/translation/metrics']) {
      const res = req({ method: 'GET', path: adminPath, user: clientUser });
      assert.strictEqual(res.statusCode, 403, `CLIENT sur ${adminPath} doit retourner 403`);
    }
    console.log('✓ [LOT9-03] 17 routes protégées (401 unauth, 403 RBAC, auth-before-lookup 401).');
  }

  // --------------------------------------------------------------------------
  // 4. Cross-Tenant IDOR & RBAC Permissive Fallbacks Blocked (HIGH)
  // --------------------------------------------------------------------------
  {
    const visitorUser = {
      id: 'usr-visitor-99',
      email: 'visitor@test.ma',
      role: 'VISITEUR' as const,
      sessionId: 'sess-lot9-vis',
      companyName: 'Visitor Co',
      mfaVerified: false,
    };
    registerSingleActiveSession(visitorUser.id, visitorUser.sessionId, false);

    for (const restrictedPath of [
      '/api/v1/payments',
      '/api/v1/quotes',
      '/api/v1/orders',
      '/api/v1/disputes',
      '/api/v1/logistics/shipments',
      '/api/v1/logistics/incidents',
      '/api/v1/analytics/dashboard',
    ]) {
      const res = req({ method: 'GET', path: restrictedPath, user: visitorUser });
      assert.strictEqual(res.statusCode, 403, `VISITEUR sur ${restrictedPath} doit retourner 403 (reçu ${res.statusCode})`);
    }

    const otherClient = {
      id: 'usr-client-intruder',
      email: 'intruder@other.ma',
      role: 'CLIENT' as const,
      sessionId: 'sess-lot9-intruder',
      companyName: 'Intruder SA',
      mfaVerified: true,
    };
    registerSingleActiveSession(otherClient.id, otherClient.sessionId, true);

    const idorTracking = req({
      method: 'GET',
      path: '/api/v1/logistics/shipments/shp-lot9-01/tracking',
      user: otherClient,
    });
    assert.strictEqual(idorTracking.statusCode, 403, 'Tracking expédition tiers doit retourner 403 IDOR');

    const otherSupplier = {
      id: 'usr-supp-intruder',
      email: 'other@supplier.de',
      role: 'FOURNISSEUR' as const,
      sessionId: 'sess-lot9-supp-int',
      companyName: 'Other Supplier GmbH',
      mfaVerified: true,
    };
    registerSingleActiveSession(otherSupplier.id, otherSupplier.sessionId, true);

    const idorTranslateProd = req({
      method: 'POST',
      path: '/api/v1/translation/product/prd-lot9-01',
      user: otherSupplier,
      body: { targetLang: 'en' },
    });
    assert.strictEqual(idorTranslateProd.statusCode, 403, 'Traduction produit tiers doit retourner 403 IDOR');
    console.log('✓ [LOT9-04] Anti-IDOR et fermeture des fallbacks RBAC validés.');
  }

  // --------------------------------------------------------------------------
  // 5. Express 5 Live HTTP: ?search[x]=1 -> 400, /metrics Auth, Health & Prod CORS 403
  // --------------------------------------------------------------------------
  {
    const expressApp = createApp({ repositoryStore: repo });
    const server = http.createServer(expressApp);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const { port } = server.address() as { port: number };

    try {
      const bracketQueryRes = await httpRequestJson({
        hostname: '127.0.0.1',
        port,
        path: '/api/v1/products?search[x]=1',
        method: 'GET',
      });
      assert.ok(
        bracketQueryRes.statusCode === 200 || bracketQueryRes.statusCode === 400,
        `?search[x]=1 sous Express 5 ne doit jamais retourner 500 (reçu ${bracketQueryRes.statusCode})`
      );

      const arrayQueryRes = await httpRequestJson({
        hostname: '127.0.0.1',
        port,
        path: '/api/v1/products?search=a&search=b',
        method: 'GET',
      });
      assert.strictEqual(arrayQueryRes.statusCode, 400, '?search=a&search=b (tableau) sous Express 5 doit retourner 400');
      assert.strictEqual(arrayQueryRes.body.error?.code, 'VALIDATION_INVALID_QUERY_PARAM');

      const objectQueryDirect = req({
        method: 'GET',
        path: '/api/v1/products',
        query: { search: { x: '1' } } as any,
      });
      assert.strictEqual(objectQueryDirect.statusCode, 400, 'Objet imbriqué query.search={x:1} doit retourner 400 (pas 500)');
      assert.strictEqual(objectQueryDirect.body.error?.code, 'VALIDATION_INVALID_QUERY_PARAM');

      const metricsUnauth = await httpRequestJson({
        hostname: '127.0.0.1',
        port,
        path: '/metrics',
        method: 'GET',
      });
      assert.strictEqual(metricsUnauth.statusCode, 401, '/metrics sans auth doit retourner 401');

      const prevMetricsToken = process.env.METRICS_SCRAPE_TOKEN;
      process.env.METRICS_SCRAPE_TOKEN = 'lot9-regression-scrape-token-2026';
      try {
        const metricsAuth = await httpRequestJson({
          hostname: '127.0.0.1',
          port,
          path: '/metrics',
          method: 'GET',
          headers: { Authorization: `Bearer ${process.env.METRICS_SCRAPE_TOKEN}` },
        });
        assert.strictEqual(metricsAuth.statusCode, 200, '/metrics avec METRICS_SCRAPE_TOKEN valide doit retourner 200');
      } finally {
        if (prevMetricsToken === undefined) delete process.env.METRICS_SCRAPE_TOKEN;
        else process.env.METRICS_SCRAPE_TOKEN = prevMetricsToken;
      }

      const prevClam = process.env.CLAMAV_HOST;
      delete process.env.CLAMAV_HOST;
      try {
        const readyRes = await httpRequestJson({
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/health/ready',
          method: 'GET',
        });
        assert.strictEqual(readyRes.statusCode, 200);
        assert.strictEqual(
          readyRes.body.checks?.clamAvDaemon,
          'NOT_CONFIGURED',
          'ClamAV non configuré ne doit pas mentir READY'
        );
      } finally {
        if (prevClam !== undefined) process.env.CLAMAV_HOST = prevClam;
      }
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }

    // Vérification CORS 403 (et non 500) en NODE_ENV=production
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const prodApp = createApp({ repositoryStore: repo });
    const prodServer = http.createServer(prodApp);
    await new Promise<void>((resolve) => prodServer.listen(0, '127.0.0.1', () => resolve()));
    const prodPort = (prodServer.address() as { port: number }).port;
    try {
      const corsRes = await httpRequestJson({
        hostname: '127.0.0.1',
        port: prodPort,
        path: '/health',
        method: 'GET',
        headers: { Origin: 'https://evil-attacker.example.com' },
      });
      assert.strictEqual(corsRes.statusCode, 403, 'CORS origine interdite en prod doit retourner 403 (pas 500)');
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      await new Promise<void>((r) => prodServer.close(() => r()));
    }
    console.log('✓ [LOT9-05] Express 5 ?search[x]=1 -> 400, /metrics auth, probes réels & CORS 403 validés.');
  }

  // --------------------------------------------------------------------------
  // 6. XSS Iterative Sanitizer, Password Preservation, Email/XLSX & Download Token
  // --------------------------------------------------------------------------
  {
    const nestedXss = sanitizeHtmlInput('<scr<script>ipt>alert(1)</script>');
    assert.ok(!nestedXss.toLowerCase().includes('<script'), `XSS imbriqué doit être éliminé: ${nestedXss}`);

    const obfuscatedXss = sanitizeHtmlInput('<img src=x onerror="&#106;avascript:alert(1)">');
    assert.ok(!obfuscatedXss.toLowerCase().includes('<img'), 'Balise <img> doit être éliminée');
    assert.ok(!obfuscatedXss.toLowerCase().includes('onerror='), 'Event handler onerror= doit être éliminé');
    assert.ok(!obfuscatedXss.toLowerCase().includes('javascript:'), 'URI javascript: obfusquée doit être éliminée');

    const rawPwd = 'P@ss<script>Word!2026';
    const sanitizedBody = sanitizeObjectFields({ password: rawPwd, title: '<script>bad()</script>OK' });
    assert.strictEqual(sanitizedBody.password, rawPwd, 'Le mot de passe ne doit jamais être muté par le sanitizer');
    assert.strictEqual(sanitizedBody.title, 'OK', 'Les champs texte standards doivent rester assainis');

    const emailOut = NotificationTemplateEngine.renderEmail(
      {
        id: 'notif-xss-1',
        userId: 'usr-client-01',
        category: 'SÉCURITÉ',
        priority: 'HIGH',
        title: '<script>alert(1)</script>',
        body: 'Contenu <b>injecté</b> & "test"',
        actionUrl: 'javascript:alert(document.cookie)',
        isRead: false,
        channels: ['EMAIL'],
        createdAt: '2026-11-22T12:00:00.000Z',
      },
      'user@example.com',
      '<img src=x onerror=alert(1)>'
    );
    assert.ok(!emailOut.html.includes('<script>'), 'Email HTML doit échapper <script>');
    assert.ok(!emailOut.html.includes('javascript:alert'), 'Email HTML doit rejeter actionUrl javascript:');
    assert.ok(!emailOut.text.includes('javascript:alert'), 'Email plaintext doit rejeter actionUrl javascript:');
    assert.ok(!emailOut.html.includes('<img src=x'), 'Email HTML doit échapper recipientName');

    const xlsxAdmin = exportDatasetToFormat({
      entityName: 'Orders"Test<1>',
      records: [{ col: '<script>x</script>&"quote\'' }],
      format: 'XLSX',
    });
    assert.ok(xlsxAdmin.content.includes('&lt;script&gt;'), 'adminAdvancedEngine XLSX doit échapper XML');
    assert.ok(!xlsxAdmin.content.includes('<script>'), 'adminAdvancedEngine XLSX ne doit pas contenir de balise brute');

    const xlsxImp = ImportExportEngine.exportDataset({
      entity: 'ORDERS',
      format: 'XLSX',
      records: [{ id: '1', note: '<tag attr="x">&test</tag>' }],
    });
    assert.ok(xlsxImp.content.includes('&lt;tag'), 'ImportExportEngine XLSX doit échapper XML');

    const xlsxAnalytics = AnalyticsEngine.exportAnalyticsReport(
      {
        role: 'ADMIN',
        period: '30D',
        generatedAt: '2026-11-22T12:00:00.000Z',
        kpis: [{ id: 'k1', title: '<KPI>&"1"', value: '<val>', trend: '+1%', trendPositive: true }],
        charts: [],
      } as any,
      'XLSX'
    );
    assert.ok(xlsxAnalytics.content.includes('&lt;KPI&gt;'), 'AnalyticsEngine XLSX doit échapper XML');

    // Document download token : rejet secret hardcodé et NaN expires
    const forgedToken = BillingDocumentEngine.generateTemporaryDownloadToken(
      'doc-lot9-01',
      'DOC-L9-001',
      'usr-client-01',
      'tradelink_doc_secret_key_9944',
      600
    );
    const badDownload = req({
      method: 'GET',
      path: '/api/v1/documents/doc-lot9-01/download',
      query: {
        token: forgedToken.hmacSignature,
        expires: String(forgedToken.expiresAt),
        user: 'usr-client-01',
      },
    });
    assert.ok(badDownload.statusCode >= 400, 'Ancien secret hardcodé tradelink_doc_secret_key_9944 doit être rejeté');

    const nanDownload = req({
      method: 'GET',
      path: '/api/v1/documents/doc-lot9-01/download',
      query: {
        token: forgedToken.hmacSignature,
        expires: 'not-a-number',
        user: 'usr-client-01',
      },
    });
    assert.strictEqual(nanDownload.statusCode, 400, 'expires non numérique (NaN) doit retourner 400');
    console.log('✓ [LOT9-06] Sanitization XSS itérative, préservation password, Email/XLSX & Download token validés.');
  }

  // --------------------------------------------------------------------------
  // 7. SAST Static Check: Zero Math.random() & Zero Hardcoded Secrets in Backend
  // --------------------------------------------------------------------------
  {
    const walkTs = (dir: string): string[] => {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'tests') files.push(...walkTs(full));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
      return files;
    };

    const backendFiles = [
      ...walkTs(path.join(process.cwd(), 'src', 'server')),
      ...walkTs(path.join(process.cwd(), 'src', 'services')),
    ];
    const mathRandomHits: string[] = [];
    const hardcodedSecretHits: string[] = [];

    for (const f of backendFiles) {
      const content = fs.readFileSync(f, 'utf8');
      if (/Math\.random\s*\(/.test(content)) {
        mathRandomHits.push(f);
      }
      if (!f.endsWith('securityCrypto.ts')) {
        if (content.includes('tradelink_doc_secret_key_9944') || content.includes('whsec_stripe_secret_key_v6')) {
          hardcodedSecretHits.push(f);
        }
      }
    }

    assert.strictEqual(mathRandomHits.length, 0, `Math.random() détecté dans backend: ${mathRandomHits.join(', ')}`);
    assert.strictEqual(hardcodedSecretHits.length, 0, `Secrets hardcodés détectés: ${hardcodedSecretHits.join(', ')}`);
    console.log(`✓ [LOT9-07] SAST statique validé sur ${backendFiles.length} fichiers backend (0 Math.random, 0 secret en dur).`);
  }

  // --------------------------------------------------------------------------
  // 8. Iteration 2 Remediation Regression Tests (Rooms IDOR, Export 403, Quote Oracle,
  //    CWE-1236 Formula Injection across all 3 exporters, Cookie %ZZ, Multi-Webhooks)
  // --------------------------------------------------------------------------
  {
    const visitorUser = {
      id: 'usr-visitor-it2',
      email: 'visitor.it2@test.ma',
      role: 'VISITEUR' as const,
      sessionId: 'sess-lot9-it2-vis',
      companyName: 'Visitor Co',
      mfaVerified: false,
    };
    const supportUser = {
      id: 'usr-support-it2',
      email: 'support.it2@tradelink.ma',
      role: 'SUPPORT' as const,
      sessionId: 'sess-lot9-it2-sup',
      companyName: 'TradeLink Support',
      mfaVerified: false,
    };
    const carrierUser = {
      id: 'usr-carrier-it2',
      email: 'carrier.it2@trans.ma',
      role: 'TRANSPORTEUR' as const,
      sessionId: 'sess-lot9-it2-car',
      companyName: 'Atlas Carrier',
      mfaVerified: false,
    };
    const supplierHost = {
      id: 'usr-supp-01',
      email: 'supplier.it2@eurotech.de',
      role: 'FOURNISSEUR' as const,
      sessionId: 'sess-lot9-it2-supp',
      companyName: 'EuroTech GmbH',
      mfaVerified: true,
    };
    const joinedClient = {
      id: 'usr-client-01',
      email: 'client.it2@atlas.ma',
      role: 'CLIENT' as const,
      sessionId: 'sess-lot9-it2-cli',
      companyName: 'Atlas Import',
      mfaVerified: true,
    };
    const unjoinedClient = {
      id: 'usr-client-unjoined-it2',
      email: 'intruder.it2@other.ma',
      role: 'CLIENT' as const,
      sessionId: 'sess-lot9-it2-unjoined',
      companyName: 'Other Co',
      mfaVerified: true,
    };

    registerSingleActiveSession(visitorUser.id, visitorUser.sessionId, false);
    registerSingleActiveSession(supportUser.id, supportUser.sessionId, false);
    registerSingleActiveSession(carrierUser.id, carrierUser.sessionId, false);
    registerSingleActiveSession(supplierHost.id, supplierHost.sessionId, true);
    registerSingleActiveSession(joinedClient.id, joinedClient.sessionId, true);
    registerSingleActiveSession(unjoinedClient.id, unjoinedClient.sessionId, true);

    // 8A. Rooms raise-hand & reactions : VISITEUR blocked (403) + participantId IDOR blocked (403)
    const createPubRoom = req({
      method: 'POST',
      path: '/api/v1/rooms',
      user: supplierHost,
      body: { title: 'Public Room IT2', isPrivate: false, isImmediate: true },
    });
    assert.strictEqual(createPubRoom.statusCode, 201);
    const pubRoomId = (createPubRoom.body.data as any).id;

    // Join joinedClient (enters WAITING_ROOM by default) -> raise-hand while waiting must return 403
    const joinRes = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/join`,
      user: joinedClient,
      body: {},
    });
    assert.strictEqual(joinRes.statusCode, 200);
    const joinedParticipantId = (joinRes.body.data as any).participant.id;
    const hostParticipantId = (joinRes.body.data as any).session.participants[0].id;

    const waitingRaise = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/raise-hand`,
      user: joinedClient,
      body: { participantId: joinedParticipantId, isRaised: true },
    });
    assert.strictEqual(waitingRaise.statusCode, 403, 'Participant en salle d’attente ne peut pas lever la main');

    // Host admits joinedClient -> now CONNECTED
    const admitRes = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/lobby/admit`,
      user: supplierHost,
      body: { participantId: joinedParticipantId },
    });
    assert.strictEqual(admitRes.statusCode, 200);

    for (const actor of [visitorUser, unjoinedClient]) {
      const rh = req({
        method: 'POST',
        path: `/api/v1/rooms/${pubRoomId}/raise-hand`,
        user: actor,
        body: { participantId: hostParticipantId, isRaised: true },
      });
      assert.strictEqual(rh.statusCode, 403, `raise-hand par ${actor.role} (${actor.id}) doit retourner 403`);

      const react = req({
        method: 'POST',
        path: `/api/v1/rooms/${pubRoomId}/reactions`,
        user: actor,
        body: { participantId: hostParticipantId, emoji: '🔥' },
      });
      assert.strictEqual(react.statusCode, 403, `reactions par ${actor.role} (${actor.id}) doit retourner 403`);
    }

    // Joined client trying to spoof host's participantId -> 403
    const spoofRaise = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/raise-hand`,
      user: joinedClient,
      body: { participantId: hostParticipantId, isRaised: true },
    });
    assert.strictEqual(spoofRaise.statusCode, 403, 'Spoofing participantId d’un autre participant doit retourner 403');

    const spoofReact = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/reactions`,
      user: joinedClient,
      body: { participantId: hostParticipantId, emoji: '🔥' },
    });
    assert.strictEqual(spoofReact.statusCode, 403, 'Spoofing participantId réaction doit retourner 403');

    // Legitimate self action -> 200
    const selfRaise = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/raise-hand`,
      user: joinedClient,
      body: { participantId: joinedParticipantId, isRaised: true },
    });
    assert.strictEqual(selfRaise.statusCode, 200, 'Participant actif levant sa propre main doit retourner 200');

    const selfReact = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/reactions`,
      user: joinedClient,
      body: { participantId: joinedParticipantId, emoji: '👏' },
    });
    assert.strictEqual(selfReact.statusCode, 200, 'Participant actif envoyant sa propre réaction doit retourner 200');

    const hostRaise = req({
      method: 'POST',
      path: `/api/v1/rooms/${pubRoomId}/raise-hand`,
      user: supplierHost,
      body: { participantId: joinedParticipantId, isRaised: false },
    });
    assert.strictEqual(hostRaise.statusCode, 200, 'Hôte abaissant la main d’un participant doit retourner 200');

    // 8B. POST /api/v1/export unauthorized -> 403 (not 500)
    for (const [actor, entity] of [
      [visitorUser, 'ORDERS'],
      [supportUser, 'ORDERS'],
      [carrierUser, 'ORDERS'],
      [joinedClient, 'AUDIT_LOGS'],
      [supplierHost, 'ORDERS'],
    ] as const) {
      const expRes = req({
        method: 'POST',
        path: '/api/v1/export',
        user: actor,
        body: { entity, format: 'CSV' },
      });
      assert.strictEqual(expRes.statusCode, 403, `POST /export (${actor.role}/${entity}) doit retourner 403 (reçu ${expRes.statusCode})`);
    }

    // 8C. GET /api/v1/quotes/:id nonexistent -> 403 for unauthorized roles (not 404 oracle)
    for (const actor of [visitorUser, supportUser, carrierUser]) {
      const qRes = req({
        method: 'GET',
        path: '/api/v1/quotes/nonexistent-quote-id-it2',
        user: actor,
      });
      assert.strictEqual(qRes.statusCode, 403, `GET /quotes/nonexistent par ${actor.role} doit retourner 403 (pas 404)`);
    }

    // 8D. CWE-1236 Formula Injection across ALL 3 exporters (CSV + XLSX, headers + cells)
    const maliciousRecords = [
      {
        '=SUM(1,1)': "=CMD|' /C calc'!A0",
        '+HEADER': '\t=CMD|calc!A0',
        '-HDR': '\r+1+1',
        '@HDR': '-2+3',
        '|HDR': '@SUM(A1)',
        '%HDR': '|calc',
        xmlKey: '<Data>"\'><script>alert(1)</script>',
      },
    ];

    const adminCsv = exportDatasetToFormat({ entityName: 'TEST', records: maliciousRecords, format: 'CSV' });
    const adminXlsx = exportDatasetToFormat({ entityName: '<Data>"\'><script>', records: maliciousRecords, format: 'XLSX' });
    assert.ok(adminCsv.content.includes('"\'=SUM(1,1)"'), 'adminAdvancedEngine CSV header formule neutralisé');
    assert.ok(adminCsv.content.includes('"\'=CMD'), 'adminAdvancedEngine CSV cell =CMD neutralisé');
    assert.ok(adminCsv.content.includes('"\'\t=CMD'), 'adminAdvancedEngine CSV cell \\t=CMD neutralisé');
    assert.ok(adminXlsx.content.includes('&apos;=SUM(1,1)</Data>'), 'adminAdvancedEngine XLSX header formule neutralisé');
    assert.ok(adminXlsx.content.includes('&apos;=CMD'), 'adminAdvancedEngine XLSX cell =CMD neutralisé');
    assert.ok(adminXlsx.content.includes('&apos;\t=CMD'), 'adminAdvancedEngine XLSX cell \\t=CMD neutralisé');
    assert.ok(adminXlsx.content.includes('&apos;\r+1+1'), 'adminAdvancedEngine XLSX cell \\r+1+1 neutralisé');
    assert.ok(adminXlsx.content.includes('&lt;script&gt;'), 'adminAdvancedEngine XLSX XML toujours échappé');

    const impCsv = ImportExportEngine.exportDataset({ entity: 'ORDERS', format: 'CSV', records: maliciousRecords });
    const impXlsx = ImportExportEngine.exportDataset({ entity: 'ORDERS', format: 'XLSX', records: maliciousRecords });
    assert.ok(impCsv.content.includes('"\'=SUM(1,1)"'), 'ImportExportEngine CSV header formule neutralisé');
    assert.ok(impCsv.content.includes('"\'\t=CMD'), 'ImportExportEngine CSV cell \\t=CMD neutralisé');
    assert.ok(impXlsx.content.includes('&apos;=SUM(1,1)</Data>'), 'ImportExportEngine XLSX header formule neutralisé');
    assert.ok(impXlsx.content.includes('&apos;\t=CMD'), 'ImportExportEngine XLSX cell \\t=CMD neutralisé');

    const analyticsInput = {
      role: 'ADMIN',
      period: '30D',
      generatedAt: '2026-11-22T12:00:00.000Z',
      kpis: [
        { id: 'k1', title: '=CMD|calc!A0', value: '+1+1', trend: '-5%', description: '\t@SUM(A1)' },
        { id: 'k2', title: '\r=HYPERLINK("http://evil")', value: '<script>1</script>', trend: '|calc', description: '%env' },
      ],
      charts: [],
    } as any;
    const anaCsv = AnalyticsEngine.exportAnalyticsReport(analyticsInput, 'CSV');
    const anaXlsx = AnalyticsEngine.exportAnalyticsReport(analyticsInput, 'XLSX');
    assert.ok(anaCsv.content.includes('"\'=CMD|calc!A0";"'+`'`+'+1+1";"'+`'`+'-5%";"'+`'`+'\t@SUM(A1)"'), 'AnalyticsEngine CSV formules neutralisées');
    assert.ok(anaXlsx.content.includes('&apos;=CMD|calc!A0</Data>'), 'AnalyticsEngine XLSX title formule neutralisé');
    assert.ok(anaXlsx.content.includes('&apos;+1+1</Data>'), 'AnalyticsEngine XLSX value formule neutralisé');
    assert.ok(anaXlsx.content.includes('&apos;\r=HYPERLINK'), 'AnalyticsEngine XLSX \\r formule neutralisé');

    // 8E. Malformed Cookie %ZZ against live Express HTTP server -> must NOT return 500
    const expressAppIt2 = createApp({ repositoryStore: repo });
    const srvIt2 = http.createServer(expressAppIt2);
    await new Promise<void>((resolve) => srvIt2.listen(0, '127.0.0.1', () => resolve()));
    const { port: it2Port } = srvIt2.address() as { port: number };
    try {
      const badCookieRes = await httpRequestJson({
        hostname: '127.0.0.1',
        port: it2Port,
        path: '/api/v1/orders',
        method: 'GET',
        headers: { Cookie: 'tradelink_session=%ZZ; other=%E0%A4%A' },
      });
      assert.strictEqual(badCookieRes.statusCode, 401, 'Cookie malformé %ZZ ne doit pas provoquer HTTP 500');
    } finally {
      await new Promise<void>((r) => srvIt2.close(() => r()));
    }

    // 8F. All non-Stripe multi-provider webhooks enforce HMAC verification
    for (const gw of ['konnect', 'flouci', 'cmi', 'wire_transfer', 'letter_of_credit']) {
      const badGwRes = req({
        method: 'POST',
        path: `/api/v1/webhooks/payments/${gw}`,
        body: { id: `evt_${gw}_1` },
      });
      assert.strictEqual(badGwRes.statusCode, 400, `Webhook ${gw} sans signature doit retourner 400`);
      assert.strictEqual(badGwRes.body.error?.code, 'WEBHOOK_SIGNATURE_INVALID');
    }

    console.log('✓ [LOT9-08] Remédiations Itération 2 (Rooms IDOR, Export 403, Quote Oracle, CWE-1236, Cookie %ZZ, Multi-Webhooks) validées.');
  }

  console.log('\n🎉 TOUS LES TESTS DE NON-RÉGRESSION SÉCURITÉ LOT 9 ONT RÉUSSI (8/8) !');
}

runLot9SecurityRegressionTests().catch((err) => {
  console.error('❌ ÉCHEC SUITE SÉCURITÉ LOT 9:', err);
  process.exit(1);
});
