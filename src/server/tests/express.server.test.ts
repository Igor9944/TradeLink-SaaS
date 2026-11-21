// ============================================================================
// TRADELINK V6.0 — TEST D'INTÉGRATION DU SERVEUR HTTP RÉEL EXPRESS
// Vérifie que le serveur écoute réellement sur un port réseau, répond aux
// requêtes HTTP, applique les middlewares de sécurité et gère les erreurs
// ============================================================================

import http from 'http';
import { createApp } from '../app';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';

async function requestHttp(options: http.RequestOptions, body?: any): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }

    req.end();
  });
}

async function runExpressIntegrationTests() {
  console.log('=== DÉMARRAGE DES TESTS D’INTÉGRATION DU SERVEUR HTTP EXPRESS TRADELINK V6.0 ===');

  const repo = new TradeLinkRepositoryStore({
    products: [
      {
        id: 'prd-exp-01',
        sku: 'TL-SRV-TEST',
        supplierId: 'usr-supp-01',
        supplierName: 'Test Supplier',
        category: 'Test',
        name: { fr: 'Produit Test Express', en: 'Test Product', ar: 'منتج تجريبي' },
        description: { fr: 'Desc', en: 'Desc', ar: 'وصف' },
        unitPrice: '100.00',
        currency: 'EUR',
        taxRate: '20.00',
        unit: 'UNITÉ',
        stockAvailable: 10,
        stockReserved: 0,
        minStockAlert: 2,
        icon3d: 'warehouse',
        originCountry: 'FR',
        incoterm: 'DAP',
        leadTimeDays: 2,
        isPublished: true,
        deletedAt: null,
      },
    ],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  }, true);

  const app = createApp({ repositoryStore: repo });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as { port: number; address: string };
  const port = address.port;
  console.log(`✓ Serveur Express démarré sur http://127.0.0.1:${port}`);

  try {
    // 1. Test /health
    const health = await requestHttp({
      hostname: '127.0.0.1',
      port,
      path: '/health',
      method: 'GET',
    });
    console.log(`✓ TEST 1 /health : status=${health.statusCode}, statusText=${health.body.status}`);
    if (health.statusCode !== 200 || health.body.status !== 'UP') {
      throw new Error('Échec test /health');
    }

    // 2. Test /api/v1/health
    const apiHealth = await requestHttp({
      hostname: '127.0.0.1',
      port,
      path: '/api/v1/health',
      method: 'GET',
    });
    console.log(`✓ TEST 2 /api/v1/health : status=${apiHealth.statusCode}, checks=${JSON.stringify(apiHealth.body.checks)}`);
    if (apiHealth.statusCode !== 200 || apiHealth.body.checks.database !== 'UP (PostgreSQL Prisma)') {
      throw new Error('Échec test /api/v1/health');
    }

    // 3. Test /metrics (Prometheus)
    const metrics = await requestHttp({
      hostname: '127.0.0.1',
      port,
      path: '/metrics',
      method: 'GET',
    });
    console.log(`✓ TEST 3 /metrics : status=${metrics.statusCode}, content-type=${metrics.headers['content-type']}`);
    if (metrics.statusCode !== 200 || !metrics.body.includes('tradelink_uptime_seconds')) {
      throw new Error('Échec test /metrics');
    }

    // 4. Test /api/v1/products (GET avec données)
    const products = await requestHttp({
      hostname: '127.0.0.1',
      port,
      path: '/api/v1/products',
      method: 'GET',
    });
    console.log(`✓ TEST 4 /api/v1/products : status=${products.statusCode}, success=${products.body.success}, items=${products.body.data?.length}`);
    if (products.statusCode !== 200 || !products.body.success || products.body.data?.length !== 1) {
      throw new Error('Échec test /api/v1/products');
    }

    // 5. Test de sécurité : tentative inscription Admin refusée (403)
    const adminReg = await requestHttp(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/v1/auth/register',
        method: 'POST',
      },
      {
        email: 'hacker@malicious.org',
        password: 'Password123!',
        companyName: 'Evil Org',
        requestedRole: 'ADMIN',
      }
    );
    console.log(`✓ TEST 5 Sécurité Inscription Admin bloquée : status=${adminReg.statusCode}, code=${adminReg.body.error?.code}`);
    if (adminReg.statusCode !== 403 || adminReg.body.error?.code !== 'ADMIN_PROVISIONED_MANUALLY_ONLY') {
      throw new Error('Échec test sécurité inscription');
    }

    console.log('\n=== TOUS LES TESTS D’INTÉGRATION DU SERVEUR EXPRESS ONT RÉUSSI AVEC SUCCÈS (5/5) ===');
  } finally {
    server.close();
  }
}

runExpressIntegrationTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
