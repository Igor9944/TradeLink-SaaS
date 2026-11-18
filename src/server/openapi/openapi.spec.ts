// ============================================================================
// TRADELINK V6.0 — SPÉCIFICATION OPENAPI 3.1.0 / SWAGGER COMPLÈTE
// Conforme au Chapitre 9.20 & PROMPT 4 (Mission 12)
// ============================================================================

import { TRADELINK_API_INVENTORY } from '../api.routes';

export function buildOpenApiSpecification() {
  const paths: Record<string, any> = {};

  for (const ep of TRADELINK_API_INVENTORY) {
    const openApiPath = ep.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
    if (!paths[openApiPath]) paths[openApiPath] = {};
    paths[openApiPath][ep.method.toLowerCase()] = {
      tags: [ep.group],
      summary: `${ep.method} ${ep.path} [Rôles: ${ep.rolesAllowed.join(', ')}]`,
      description: `Contrôle d'ownership: ${ep.ownershipCheck ? 'Oui' : 'Non'} • Idempotent: ${ep.idempotent ? 'Oui (Idempotency-Key)' : 'Non'} • Audité: ${ep.audited ? 'Oui' : 'Non'}`,
      security: ep.rolesAllowed.includes('PUBLIC') ? [] : [{ BearerAuth: [] }],
      responses: {
        '200': { description: 'Opération réussie' },
        '400': { description: 'Erreur de validation des paramètres (VALIDATION_ERROR)' },
        '401': { description: 'Non authentifié ou session révoquée par nouvelle connexion' },
        '403': { description: 'Accès interdit par RBAC, Ownership ou Double Validation Admin' },
        '409': { description: 'Conflit métier ou stock insuffisant (Rollback transactionnel)' },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'TRADELINK V6.0 — B2B SaaS REST API',
      version: '6.0.0',
      description:
        'API officielle TRADELINK V6.0 : Authentification Session Unique Redis, KYC J+7, Catalogue, Stocks, Commandes Transactionnelles, Moteur Financier Decimal.js (ACT/365, ACT/360, ACT/ACT), Room Live, OCR/IDP, Sandbox SQL/BAK/DBF, KMS & Double Validation Admin.',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Serveur API Local Développement / Test' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths,
  };
}
