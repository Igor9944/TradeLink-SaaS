// ============================================================================
// TRADELINK V6.1 — VALIDATEURS STRICTS CÔTÉ SERVEUR (CHAPITRE 9.20 & PROMPT 4)
// ============================================================================

import Decimal from 'decimal.js';
import { z } from 'zod';
import { AppError } from '../middlewares/errorAndSecurity.middleware';
import { DayCountBasis } from '../../types';

/**
 * Exécute un schéma Zod v4 via .safeParse() et lève une AppError 400 structurée.
 */
export function parseWithZod<T>(
  schema: z.ZodType<T>,
  data: unknown,
  errorCode = 'VALIDATION_ERROR'
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'payload'}: ${i.message}`)
      .join('; ');
    throw new AppError(400, errorCode, issueMsg || 'Données de requête invalides.', {
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

/**
 * Protège Express 5 contre les paramètres de requête non scalaires (?search[x]=1, ?page[]=1)
 * susceptibles de provoquer des TypeError (HTTP 500) lors des appels .trim()/.split().
 */
export function assertFlatStringQuery(query: unknown): Record<string, string | undefined> {
  if (query === undefined || query === null) {
    return {};
  }
  if (typeof query !== 'object' || Array.isArray(query)) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_QUERY_PARAM',
      'Paramètres de requête invalides : un objet plat clé/chaîne est attendu.'
    );
  }
  const sanitized: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(query as Record<string, unknown>)) {
    if (val === undefined) continue;
    if (typeof val !== 'string') {
      throw new AppError(
        400,
        'VALIDATION_INVALID_QUERY_PARAM',
        `Le paramètre de requête "${key}" doit être une chaîne scalaire (objets et tableaux imbriqués interdits).`
      );
    }
    sanitized[key] = val;
  }
  return sanitized;
}

// Schémas Zod de validation stricte côté serveur
export const OrderLineZodSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
}).passthrough();

export const OrderCreateZodSchema = z.object({
  shippingAddress: z.string().trim().min(5),
  lines: z.array(OrderLineZodSchema).min(1),
  idempotencyKey: z.string().trim().optional(),
}).passthrough();

export const OrderStatusUpdateZodSchema = z.object({
  status: z.string().trim().min(1),
  reason: z.string().trim().optional(),
}).passthrough();

export const OrderDisputeCreateZodSchema = z.object({
  reason: z.string().trim().min(1),
  description: z.string().trim().min(1),
}).passthrough();

export const KycDecisionZodSchema = z.object({
  decision: z.enum(['VALIDATED', 'REJECTED', 'COMPLEMENT_REQUESTED', 'REACTIVATE']),
  reason: z.string().trim().optional(),
  adminNotes: z.string().trim().optional(),
}).passthrough();

export const DayCountBasisZodSchema = z.enum(['ACT/365', 'ACT/360', 'ACT/ACT']);

export const PaginationQueryZodSchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).passthrough();

// Auth & Identity Zod Schemas
export const AuthRegisterZodSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  companyName: z.string().trim().min(1),
  fullName: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  country: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  businessAddress: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  requestedRole: z.string().trim().optional(),
  termsAccepted: z.boolean().optional(),
  privacyAccepted: z.boolean().optional(),
}).passthrough();

export const AuthLoginZodSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  mfaCode: z.string().trim().optional(),
  deviceName: z.string().trim().optional(),
  userAgent: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
}).passthrough();

export const AuthVerifyOtpZodSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(1),
  approveClientOnboarding: z.boolean().optional(),
}).passthrough();

export const AuthVerifyPhoneZodSchema = z.object({
  phone: z.string().trim().min(1),
  code: z.string().trim().min(1),
}).passthrough();

export const AuthMfaVerifyZodSchema = z.object({
  code: z.string().trim().min(1),
}).passthrough();

export const AuthRefreshZodSchema = z.object({
  refreshToken: z.string().trim().min(1),
}).passthrough();

export const AuthForgotPasswordZodSchema = z.object({
  email: z.string().trim().email(),
}).passthrough();

export const AuthResetPasswordZodSchema = z.object({
  token: z.string().trim().min(1),
  newPassword: z.string().min(1),
}).passthrough();

export const AdminSuspendUserZodSchema = z.object({
  reason: z.string().trim().optional(),
}).passthrough();

// Cart, Quotes, Invoices, Payments & Webhooks Zod Schemas
export const CartValidateZodSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().trim().min(1),
      quantity: z.number().int().positive(),
    }).passthrough()
  ),
  currency: z.string().trim().optional(),
  vatRatePct: z.union([z.string(), z.number()]).optional(),
  shippingFlatRate: z.union([z.string(), z.number()]).optional(),
  persist: z.boolean().optional(),
}).passthrough();

export const QuoteCreateZodSchema = z.object({
  supplierId: z.string().trim().min(1),
  supplierName: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  clientName: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  validityDays: z.number().int().positive().optional(),
  incoterm: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  specialInstructions: z.string().optional(),
  lines: z.array(
    z.object({
      productId: z.string().optional(),
      description: z.string().trim().min(1),
      quantity: z.number().int().positive(),
      targetPrice: z.union([z.string(), z.number()]).optional(),
    }).passthrough()
  ).min(1),
}).passthrough();

export const InvoiceGenerateZodSchema = z.object({
  orderId: z.string().trim().min(1),
  dueInDays: z.number().int().positive().optional(),
  jurisdiction: z.string().trim().optional(),
}).passthrough();

export const StripeCheckoutSessionZodSchema = z.object({
  orderId: z.string().trim().min(1),
  invoiceId: z.string().trim().min(1),
}).passthrough();

export const StripeWebhookZodSchema = z.object({
  id: z.string().trim().min(1),
  type: z.string().trim().min(1),
  created: z.number().optional(),
  data: z.object({
    object: z.record(z.string(), z.unknown()),
  }),
}).passthrough();

export const PaymentInitiateZodSchema = z.object({
  orderId: z.string().trim().min(1),
  invoiceId: z.string().trim().optional(),
  provider: z.enum(['STRIPE', 'KONNECT', 'FLOUCI', 'CMI', 'WIRE_TRANSFER', 'LETTER_OF_CREDIT']),
  customerEmail: z.string().trim().email().optional(),
  currency: z.string().trim().optional(),
}).passthrough();

// KYC Upload & Profile
export const KycUploadDocumentZodSchema = z.object({
  docType: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileSizeBytes: z.number().nonnegative().optional(),
  mimeType: z.string().trim().optional(),
}).passthrough();

// Logistics Zod Schemas
export const ShipmentGpsZodSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  speedKmh: z.number().nonnegative().optional(),
  temperatureC: z.number().optional(),
}).passthrough();

export const LogisticsIncidentCreateZodSchema = z.object({
  shipmentId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  severity: z.string().trim().min(1),
}).passthrough();

// Stocks Zod Schemas
export const StockMovementLegacyZodSchema = z.object({
  productId: z.string().trim().min(1),
  movementType: z.enum([
    'IN_PURCHASE',
    'OUT_SALE',
    'RESERVATION',
    'RELEASE_RESERVATION',
    'INVENTORY_ADJUSTMENT',
    'INBOUND_RECEIPT',
    'OUTBOUND_SHIPMENT',
    'ORDER_RESERVATION',
    'RESERVATION_RELEASE',
    'SCRAP_OR_LOSS',
    'CUSTOMER_RETURN',
  ]),
  quantity: z.number().positive(),
  reason: z.string().trim().min(1),
  referenceDocument: z.string().optional(),
}).passthrough();

// Translation, Support, Accounting, AI Zod Schemas
export const TranslationDetectZodSchema = z.object({
  text: z.string(),
}).passthrough();

export const TranslationTextZodSchema = z.object({
  text: z.string().min(1),
  sourceLang: z.enum(['fr', 'en', 'ar', 'es']).optional(),
  targetLang: z.enum(['fr', 'en', 'ar', 'es']),
  domain: z.string().optional(),
  preserveTerms: z.array(z.string()).optional(),
  bypassCache: z.boolean().optional(),
}).passthrough();

export const SupportTicketCreateZodSchema = z.object({
  subject: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().optional(),
  priority: z.string().trim().optional(),
}).passthrough();

export const CopilotChatZodSchema = z.object({
  message: z.string().trim().min(1),
  locale: z.string().trim().optional(),
}).passthrough();

export interface PaginationAndFilterParams {
  page: number;
  limit: number;
  search: string;
  status?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function validatePaginationAndFilters(
  rawQuery: Record<string, unknown>
): PaginationAndFilterParams {
  const query = assertFlatStringQuery(rawQuery);
  const rawPage = parseInt(query.page ?? '1', 10);
  const rawLimit = parseInt(query.limit ?? '20', 10);

  if (Number.isNaN(rawPage) || rawPage < 1) {
    throw new AppError(400, 'VALIDATION_INVALID_PAGE', 'Le numéro de page doit être >= 1.');
  }
  if (Number.isNaN(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_LIMIT',
      'La limite de pagination doit être comprise entre 1 et 100.'
    );
  }

  const parsedQuery = PaginationQueryZodSchema.safeParse({
    ...query,
    sortOrder: query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : undefined,
  });
  if (!parsedQuery.success) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_QUERY_PARAM',
      parsedQuery.error.issues.map((i) => i.message).join('; ')
    );
  }

  return {
    page: rawPage,
    limit: rawLimit,
    search: (query.search ?? '').trim(),
    status: query.status?.trim(),
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

export function validatePositiveDecimal(value: unknown, fieldName: string): Decimal {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AppError(
      400,
      'VALIDATION_DECIMAL_REQUIRED',
      `Le champ financier "${fieldName}" doit être un montant valide.`
    );
  }
  try {
    const dec = new Decimal(String(value));
    if (dec.isNaN() || !dec.isFinite() || dec.isNegative()) {
      throw new Error('Negative or NaN');
    }
    return dec;
  } catch {
    throw new AppError(
      400,
      'VALIDATION_INVALID_DECIMAL',
      `Le champ "${fieldName}" doit être un nombre décimal positif ou nul.`
    );
  }
}

export function validateOrderCreatePayload(body: Record<string, any>): {
  shippingAddress: string;
  lines: { productId: string; quantity: number }[];
} {
  const shippingAddress = String(body?.shippingAddress ?? '').trim();
  if (shippingAddress.length < 5) {
    throw new AppError(
      400,
      'VALIDATION_SHIPPING_ADDRESS',
      'L’adresse de livraison est obligatoire (minimum 5 caractères).'
    );
  }
  if (!Array.isArray(body?.lines) || body.lines.length === 0) {
    throw new AppError(
      400,
      'VALIDATION_ORDER_LINES_EMPTY',
      'Une commande doit comporter au moins une ligne de produit.'
    );
  }
  const parsed = OrderCreateZodSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path?.[0] === 'lines') {
      const idx = typeof firstIssue.path[1] === 'number' ? firstIssue.path[1] : 0;
      throw new AppError(
        400,
        'VALIDATION_INVALID_ORDER_LINE',
        `Ligne de commande #${idx + 1} invalide : productId et quantité entière > 0 requis.`
      );
    }
    throw new AppError(
      400,
      'VALIDATION_ORDER_PAYLOAD',
      parsed.error.issues.map((i) => i.message).join('; ')
    );
  }

  return {
    shippingAddress: parsed.data.shippingAddress,
    lines: parsed.data.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    })),
  };
}

export function validateKycDecisionPayload(body: Record<string, any>): {
  decision: 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'REACTIVATE';
  reason?: string;
} {
  const parsed = KycDecisionZodSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_KYC_DECISION',
      'La décision KYC doit être VALIDATED, REJECTED, COMPLEMENT_REQUESTED ou REACTIVATE.'
    );
  }
  const { decision } = parsed.data;
  const reason = typeof parsed.data.reason === 'string' ? parsed.data.reason.trim() : '';
  if ((decision === 'REJECTED' || decision === 'COMPLEMENT_REQUESTED') && reason.length < 5) {
    throw new AppError(
      400,
      'VALIDATION_KYC_REJECTION_REASON_REQUIRED',
      'Chapitre 6.3 : Tout rejet ou demande de complément KYC doit obligatoirement comporter un motif explicite (min. 5 caractères).'
    );
  }
  return { decision, reason: reason || undefined };
}

export function validateCalculationPayload(body: Record<string, any>): {
  principalStr: string;
  annualRatePctStr: string;
  startDateStr: string;
  endDateStr: string;
  basis: DayCountBasis;
} {
  const principal = validatePositiveDecimal(body.principal, 'principal');
  const rate = validatePositiveDecimal(body.annualRatePct, 'annualRatePct');
  const startDateStr = String(body.startDate ?? '').trim();
  const endDateStr = String(body.endDate ?? '').trim();
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_DATE_RANGE',
      'Les dates de début et de fin sont invalides ou la date de fin est antérieure à la date de début.'
    );
  }

  const basisParsed = DayCountBasisZodSchema.safeParse(body?.basis ?? 'ACT/365');
  if (!basisParsed.success) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_DAY_COUNT_BASIS',
      'La convention de calcul doit être ACT/365, ACT/360 ou ACT/ACT.'
    );
  }
  const basis = basisParsed.data as DayCountBasis;

  return {
    principalStr: principal.toFixed(4),
    annualRatePctStr: rate.toFixed(4),
    startDateStr,
    endDateStr,
    basis,
  };
}
