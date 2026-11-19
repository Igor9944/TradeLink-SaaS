// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — CONTRATS API BACKEND EXPRESS / TYPESCRIPT (19 GROUPES D'API)
// Chapitre 9 du Cahier des Charges : RBAC, Ownership, Idempotency-Key, Audit
// ============================================================================

export interface ApiEndpointSpec {
  group: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  rolesAllowed: string[];
  ownershipCheck: boolean;
  idempotent?: boolean;
  audited: boolean;
}

export const TRADELINK_API_INVENTORY: ApiEndpointSpec[] = [
  // 9.1 Authentification
  { group: 'Auth', method: 'POST', path: '/api/v1/auth/register', rolesAllowed: ['PUBLIC'], ownershipCheck: false, audited: true },
  { group: 'Auth', method: 'POST', path: '/api/v1/auth/verify-otp', rolesAllowed: ['PUBLIC'], ownershipCheck: false, audited: true },
  { group: 'Auth', method: 'POST', path: '/api/v1/auth/login', rolesAllowed: ['PUBLIC'], ownershipCheck: false, audited: true },
  { group: 'Auth', method: 'POST', path: '/api/v1/auth/refresh', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Auth', method: 'POST', path: '/api/v1/auth/logout', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Auth', method: 'POST', path: '/api/v1/auth/mfa/setup', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Auth', method: 'POST', path: '/api/v1/auth/mfa/verify', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },

  // 9.2 KYC (Délai 7 jours J+1/J+3/J+5/J+6/J+7)
  { group: 'KYC', method: 'POST', path: '/api/v1/kyc/submit', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR'], ownershipCheck: true, audited: true },
  { group: 'KYC', method: 'GET', path: '/api/v1/kyc/status', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN'], ownershipCheck: true, audited: false },
  { group: 'KYC', method: 'GET', path: '/api/v1/kyc/documents', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN'], ownershipCheck: true, audited: true },
  { group: 'KYC', method: 'PUT', path: '/api/v1/kyc/:id/validate', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'KYC', method: 'PUT', path: '/api/v1/kyc/:id/refuse', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },

  // 9.3 Utilisateurs & Sessions Uniques
  { group: 'Users', method: 'GET', path: '/api/v1/users', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Users', method: 'GET', path: '/api/v1/users/:id', rolesAllowed: ['ADMIN', 'SELF'], ownershipCheck: true, audited: false },
  { group: 'Users', method: 'DELETE', path: '/api/v1/users/:id/sessions/:sessionId', rolesAllowed: ['ADMIN', 'SELF'], ownershipCheck: true, audited: true },

  // 9.4 & 9.5 Catalogue, Produits & Stocks (Lecture seule pour Comptable)
  { group: 'Catalog', method: 'GET', path: '/api/v1/products', rolesAllowed: ['ALL'], ownershipCheck: false, audited: false },
  { group: 'Catalog', method: 'POST', path: '/api/v1/products', rolesAllowed: ['FOURNISSEUR', 'ADMIN'], ownershipCheck: true, audited: true },
  { group: 'Stock', method: 'POST', path: '/api/v1/stocks/movement', rolesAllowed: ['FOURNISSEUR', 'ADMIN'], ownershipCheck: true, idempotent: true, audited: true },

  // 9.6, 9.7, 9.8 Commandes, Devis, Factures & Paiements
  { group: 'Orders', method: 'POST', path: '/api/v1/orders', rolesAllowed: ['CLIENT'], ownershipCheck: true, idempotent: true, audited: true },
  { group: 'Orders', method: 'PUT', path: '/api/v1/orders/:id/accept', rolesAllowed: ['FOURNISSEUR'], ownershipCheck: true, audited: true },
  { group: 'Quotes', method: 'POST', path: '/api/v1/quotes/:id/convert', rolesAllowed: ['CLIENT', 'FOURNISSEUR'], ownershipCheck: true, idempotent: true, audited: true },
  { group: 'Payments', method: 'POST', path: '/api/v1/payments/webhook', rolesAllowed: ['STRIPE_SIGNED'], ownershipCheck: false, idempotent: true, audited: true },

  // 9.9 Logistique
  { group: 'Logistics', method: 'PUT', path: '/api/v1/shipments/:id/status', rolesAllowed: ['TRANSPORTEUR'], ownershipCheck: true, audited: true },
  { group: 'Logistics', method: 'POST', path: '/api/v1/shipments/:id/incident', rolesAllowed: ['TRANSPORTEUR'], ownershipCheck: true, audited: true },

  // 9.10 & 9.11 IA, OCR/IDP & Room Live (Création générale interdite aux Clients)
  { group: 'AI', method: 'POST', path: '/api/v1/ai/chat', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'AI', method: 'POST', path: '/api/v1/ai/ocr/validate', rolesAllowed: ['ADMIN', 'COMPTABLE', 'CLIENT', 'FOURNISSEUR'], ownershipCheck: true, audited: true },
  { group: 'RoomLive', method: 'POST', path: '/api/v1/rooms', rolesAllowed: ['ADMIN', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT'], ownershipCheck: true, audited: true },
  { group: 'RoomLive', method: 'POST', path: '/api/v1/rooms/:id/join', rolesAllowed: ['AUTH_INVITED'], ownershipCheck: true, audited: true },

  // 9.12 & 9.17 Moteur de Calcul & Comptabilité
  { group: 'Calc', method: 'POST', path: '/api/v1/calc/simple', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Calc', method: 'POST', path: '/api/v1/accounting/calculate-interest', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Calc', method: 'GET', path: '/api/v1/accounting/calculation-history', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Calc', method: 'GET', path: '/api/v1/accounting/financial-config', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Calc', method: 'PUT', path: '/api/v1/accounting/financial-config', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Calc', method: 'GET', path: '/api/v1/accounting/benchmark-rates', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Calc', method: 'PUT', path: '/api/v1/accounting/benchmark-rates/:code', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Compta', method: 'GET', path: '/api/v1/compta/statements', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Compta', method: 'GET', path: '/api/v1/accounting/aging-balance', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Compta', method: 'GET', path: '/api/v1/accounting/export/fec', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Compta', method: 'GET', path: '/api/v1/accounting/fiscal-periods', rolesAllowed: ['COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Compta', method: 'PUT', path: '/api/v1/accounting/fiscal-periods/:code/lock', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },

  // 9.13, 9.14, 9.15 Administration Avancée, Sandbox, KMS & Double Validation
  { group: 'AdminImport', method: 'POST', path: '/api/v1/admin/import/upload', rolesAllowed: ['ADMIN'], ownershipCheck: false, idempotent: true, audited: true },
  { group: 'AdminSecurity', method: 'POST', path: '/api/v1/admin/security/keys/rotate', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminBackup', method: 'POST', path: '/api/v1/admin/backups/:id/restore', rolesAllowed: ['ADMIN_DUAL_APPROVAL'], ownershipCheck: false, idempotent: true, audited: true },

  // Prompt 15 : Importation en 12 étapes, Sandbox Bases & Exportations
  { group: 'Import', method: 'POST', path: '/api/v1/import/upload', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/identify', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/validate', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/analyze', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/map', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/duplicates', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/errors', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/simulate', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/confirm', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'Import', method: 'POST', path: '/api/v1/import/:jobId/execute', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },
  { group: 'ImportSandbox', method: 'POST', path: '/api/v1/import/sandbox/database', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'ImportSandbox', method: 'POST', path: '/api/v1/import/sandbox/database/:sessionId/approve', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'ImportSandbox', method: 'POST', path: '/api/v1/import/sandbox/database/:sessionId/execute', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Export', method: 'POST', path: '/api/v1/export', rolesAllowed: ['AUTH'], ownershipCheck: true, audited: true },

  // Prompt 16 : Administration Avancée, Sécurité, Sessions, Audit, KMS & APM
  { group: 'AdminSecurity', method: 'GET', path: '/api/v1/admin/security/alerts', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: false },
  { group: 'AdminSecurity', method: 'POST', path: '/api/v1/admin/security/alerts/:id/resolve', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminSecurity', method: 'GET', path: '/api/v1/admin/security/sessions', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: false },
  { group: 'AdminSecurity', method: 'POST', path: '/api/v1/admin/security/sessions/:id/revoke', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminSecurity', method: 'POST', path: '/api/v1/admin/security/users/:id/revoke-all-sessions', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminKms', method: 'GET', path: '/api/v1/admin/security/kms/key', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: false },
  { group: 'AdminKms', method: 'POST', path: '/api/v1/admin/security/kms/rotate', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminKms', method: 'POST', path: '/api/v1/admin/security/kms/test-envelope', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminBackup', method: 'POST', path: '/api/v1/admin/security/backups', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminBackup', method: 'POST', path: '/api/v1/admin/security/backups/:code/drill', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminBackup', method: 'POST', path: '/api/v1/admin/security/backups/:code/restore-prod', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'AdminSupervision', method: 'GET', path: '/api/v1/admin/security/supervision', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: false },
  { group: 'AdminAudit', method: 'GET', path: '/api/v1/admin/security/audit/verify-chain', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: false },

  // Prompt 17 : Centre d'Assistance & Gestion des Tickets (Helpdesk V6.0)
  { group: 'Support', method: 'GET', path: '/api/v1/support/tickets', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Support', method: 'GET', path: '/api/v1/support/tickets/:id', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: true, audited: false },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets/:id/messages', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: true, audited: true },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets/:id/assign', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets/:id/escalate', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets/:id/resolve', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: true },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets/:id/close', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: true, audited: true },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets/:id/reopen', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: true, audited: true },
  { group: 'Support', method: 'POST', path: '/api/v1/support/tickets/:id/room-live', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: true, audited: true },
  { group: 'SupportKB', method: 'GET', path: '/api/v1/support/kb/articles', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'SupportKB', method: 'GET', path: '/api/v1/support/kb/articles/:id', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'SupportKB', method: 'POST', path: '/api/v1/support/kb/articles/:id/vote', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: true },
  { group: 'SupportAI', method: 'POST', path: '/api/v1/support/ai/suggest', rolesAllowed: ['ADMIN'], ownershipCheck: false, audited: false },
  { group: 'SupportAI', method: 'POST', path: '/api/v1/support/ai/summarize', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },

  // Prompt 18 : Recherche Globale & Tableaux de Bord par Acteur (Analytics V6.0)
  { group: 'Search', method: 'GET', path: '/api/v1/search', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Search', method: 'GET', path: '/api/v1/search/autocomplete', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Analytics', method: 'GET', path: '/api/v1/analytics/dashboard', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: false },
  { group: 'Analytics', method: 'GET', path: '/api/v1/analytics/export', rolesAllowed: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN'], ownershipCheck: false, audited: true },
];
