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
];
