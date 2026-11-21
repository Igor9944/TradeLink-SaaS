// ============================================================================
// TRADELINK V6.0 — VALIDATEURS STRICTS CÔTÉ SERVEUR (CHAPITRE 9.20 & PROMPT 4)
// ============================================================================

import Decimal from 'decimal.js';
import { z } from 'zod';
import { AppError } from '../middlewares/errorAndSecurity.middleware';
import { DayCountBasis } from '../../types';

// Schémas Zod de validation stricte côté serveur
export const OrderLineZodSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

export const OrderCreateZodSchema = z.object({
  shippingAddress: z.string().trim().min(5),
  lines: z.array(OrderLineZodSchema).min(1),
});

export const KycDecisionZodSchema = z.object({
  decision: z.enum(['VALIDATED', 'REJECTED', 'COMPLEMENT_REQUESTED', 'REACTIVATE']),
  reason: z.string().trim().optional(),
});

export const DayCountBasisZodSchema = z.enum(['ACT/365', 'ACT/360', 'ACT/ACT']);

export interface PaginationAndFilterParams {
  page: number;
  limit: number;
  search: string;
  status?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function validatePaginationAndFilters(
  query: Record<string, string | undefined>
): PaginationAndFilterParams {
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
  const shippingAddress = String(body.shippingAddress ?? '').trim();
  if (shippingAddress.length < 5) {
    throw new AppError(
      400,
      'VALIDATION_SHIPPING_ADDRESS',
      'L’adresse de livraison est obligatoire (minimum 5 caractères).'
    );
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw new AppError(
      400,
      'VALIDATION_ORDER_LINES_EMPTY',
      'Une commande doit comporter au moins une ligne de produit.'
    );
  }
  const lines = body.lines.map((l: any, idx: number) => {
    const productId = String(l?.productId ?? '').trim();
    const quantity = Number(l?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        400,
        'VALIDATION_INVALID_ORDER_LINE',
        `Ligne de commande #${idx + 1} invalide : productId et quantité entière > 0 requis.`
      );
    }
    return { productId, quantity };
  });

  return { shippingAddress, lines };
}

export function validateKycDecisionPayload(body: Record<string, any>): {
  decision: 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'REACTIVATE';
  reason?: string;
} {
  const decision = body.decision;
  if (
    decision !== 'VALIDATED' &&
    decision !== 'REJECTED' &&
    decision !== 'COMPLEMENT_REQUESTED' &&
    decision !== 'REACTIVATE'
  ) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_KYC_DECISION',
      'La décision KYC doit être VALIDATED, REJECTED, COMPLEMENT_REQUESTED ou REACTIVATE.'
    );
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
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

  const basis = (body.basis ?? 'ACT/365') as DayCountBasis;
  if (!['ACT/365', 'ACT/360', 'ACT/ACT'].includes(basis)) {
    throw new AppError(
      400,
      'VALIDATION_INVALID_DAY_COUNT_BASIS',
      'La convention de calcul doit être ACT/365, ACT/360 ou ACT/ACT.'
    );
  }

  return {
    principalStr: principal.toFixed(4),
    annualRatePctStr: rate.toFixed(4),
    startDateStr,
    endDateStr,
    basis,
  };
}
