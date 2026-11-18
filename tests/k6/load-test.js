// ============================================================================
// TRADELINK V6.0 — SCRIPT DE TEST DE CHARGE K6 (PROMPT 12)
// Profil de charge simulant 50 à 200 utilisateurs virtuels simultanés (VUs)
// Objectifs mesurables de production :
// - Latence p(95) < 200 ms, p(99) < 400 ms
// - Taux d'erreur < 0.1% (Disponibilité cible 99.9%)
// ============================================================================

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métriques personnalisées
const failureRate = new Rate('failed_requests');
const apiDuration = new Trend('api_latency_ms');

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Montée en charge progressive : 0 -> 50 VUs
    { duration: '1m', target: 100 },  // Charge nominale soutenue : 100 VUs
    { duration: '30s', target: 200 }, // Pic de charge haute intensité : 200 VUs
    { duration: '15s', target: 0 },   // Décélération : retour au calme
  ],
  thresholds: {
    // 95% des requêtes doivent répondre en moins de 200 ms (Objectif Prompt 12)
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    // Moins de 0.1% d'erreurs (Disponibilité 99.9%)
    http_req_failed: ['rate<0.001'],
    failed_requests: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5173';

export default function () {
  const commonHeaders = {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'k6-load-runner-v6',
    'X-Correlation-Id': `k6-${__VU}-${__ITER}-${Date.now()}`,
  };

  group('1. Health Check & Diagnostic Système', () => {
    const res = http.get(`${BASE_URL}/api/v1/health`, { headers: commonHeaders });
    const success = check(res, {
      'Health check status 200': (r) => r.status === 200,
      'Health check temps < 150 ms': (r) => r.timings.duration < 150,
    });
    failureRate.add(!success);
    apiDuration.add(res.timings.duration);
  });

  sleep(0.5);

  group('2. Consultation Catalogue & Recherche Full-Text', () => {
    // Requête Catalogue paginé
    const catRes = http.get(`${BASE_URL}/api/v1/products?limit=25`, { headers: commonHeaders });
    const catSuccess = check(catRes, {
      'Catalogue status 200': (r) => r.status === 200,
      'Catalogue temps < 200 ms': (r) => r.timings.duration < 200,
    });
    failureRate.add(!catSuccess);
    apiDuration.add(catRes.timings.duration);

    // Requête Recherche avec filtre
    const searchRes = http.get(`${BASE_URL}/api/v1/products?search=Solaire`, { headers: commonHeaders });
    const searchSuccess = check(searchRes, {
      'Recherche status 200': (r) => r.status === 200,
      'Recherche temps < 200 ms': (r) => r.timings.duration < 200,
    });
    failureRate.add(!searchSuccess);
    apiDuration.add(searchRes.timings.duration);
  });

  sleep(1);

  group('3. Documentation OpenAPI 3.1.0', () => {
    const specRes = http.get(`${BASE_URL}/api/v1/docs/openapi.json`, { headers: commonHeaders });
    const specSuccess = check(specRes, {
      'OpenAPI status 200': (r) => r.status === 200,
      'OpenAPI specs < 200 ms': (r) => r.timings.duration < 200,
    });
    failureRate.add(!specSuccess);
    apiDuration.add(specRes.timings.duration);
  });

  sleep(0.5);
}
