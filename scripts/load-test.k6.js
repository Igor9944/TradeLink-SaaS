// ============================================================================
// TRADELINK V6.0 — SCRIPT DE TESTS DE CHARGE ET STRESS K6
// Objectifs :
// - Vérifier la latence p(95) < 200 ms sous charge nominale et pic
// - Disponibilité cible >= 99.9% (taux d'erreur http_req_failed < 0.1%)
// - Scénarios : 50 VUs nominal -> 200 VUs pic -> 500 VUs stress test
// ============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Montée en charge progressive (50 utilisateurs simultanés)
    { duration: '1m',  target: 100 },  // Palier nominal (100 utilisateurs)
    { duration: '30s', target: 200 },  // Pic d'activité B2B (200 utilisateurs)
    { duration: '15s', target: 500 },  // Stress test maximal (500 utilisateurs)
    { duration: '30s', target: 0 },    // Descente et retour au calme
  ],
  thresholds: {
    // 95% des requêtes doivent répondre en moins de 200 ms (Objectif Prompt 12 & Mission Vitesse)
    http_req_duration: ['p(95)<200', 'p(99)<350'],
    // Taux d'erreur inférieur à 0.1% pour garantir 99.9% de disponibilité
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5173';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-Correlation-Id': `k6-run-${__VU}-${__ITER}-${Date.now()}`,
    'Accept-Encoding': 'gzip, deflate, br',
  };

  group('1. Health Check & Diagnostic Système', () => {
    const res = http.get(`${BASE_URL}/api/v1/health`, { headers });
    check(res, {
      'Health status 200': (r) => r.status === 200,
      'Health latency < 50ms': (r) => r.timings.duration < 50,
    });
  });

  group('2. Consultation Catalogue Produits (Pagination & Cache)', () => {
    const res = http.get(`${BASE_URL}/api/v1/products?limit=25&page=1`, { headers });
    check(res, {
      'Catalog status 200': (r) => r.status === 200,
      'Catalog latency < 150ms': (r) => r.timings.duration < 150,
      'Cache-Control présent': (r) => r.headers['Cache-Control'] !== undefined,
    });
  });

  group('3. Recherche Full-Text Produits (Index & Débounce)', () => {
    const res = http.get(`${BASE_URL}/api/v1/products?search=Performance&limit=10`, { headers });
    check(res, {
      'Search status 200': (r) => r.status === 200,
      'Search latency < 100ms': (r) => r.timings.duration < 100,
    });
  });

  group('4. Documentation OpenAPI 3.1.0', () => {
    const res = http.get(`${BASE_URL}/api/v1/docs/openapi.json`, { headers });
    check(res, {
      'OpenAPI spec 200': (r) => r.status === 200,
      'OpenAPI latency < 100ms': (r) => r.timings.duration < 100,
    });
  });

  sleep(0.5); // Rythme naturel de navigation utilisateur
}
