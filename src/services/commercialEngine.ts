// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MOTEUR COMMERCIAL CENTRALISÉ (PROMPTS 07 & 11)
// Panier serveur déterministe, Devis (RFQ) & Négociation, Cycle de Commande
// complet, Multi-paiements (Stripe, Konnect, Flouci, CMI, Virement B2B),
// Remboursements, Webhooks HMAC-SHA256, Idempotence & Sécurité Financière
// ============================================================================

import crypto from 'crypto';
import Decimal from 'decimal.js';
import { getSecureRandomAlphanumeric, getSecureRandomInt } from './securityCrypto';
import {
  CartValidationResult,
  CommercialDisputeRecord,
  DisputeReason,
  Icon3DName,
  InvoiceRecord,
  Locale,
  OrderRecord,
  OrderStatus,
  PaymentProvider,
  PaymentReceiptRecord,
  PaymentRecord,
  ProductItem,
  QuoteRecord,
  UserRoleCode,
  VerifiedCartItem,
} from '../types';

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export interface ProductCategory {
  id: string;
  code: string;
  icon3d: Icon3DName;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  parentCategoryId?: string;
  displayOrder: number;
}

export interface StockMovementRecord {
  id: string;
  movementNumber: string;
  productId: string;
  sku: string;
  movementType: 'IN_PURCHASE' | 'OUT_SALE' | 'RESERVATION' | 'RELEASE_RESERVATION' | 'INVENTORY_ADJUSTMENT';
  quantityChange: number;
  resultingAvailable: number;
  resultingReserved: number;
  reason: string;
  referenceDocument?: string; // Order ID, Invoice ID, Inventory Sheet ID
  performedByUserId: string;
  performedByUserName: string;
  timestamp: string;
  minStockAlertTriggered: boolean;
}

export interface CreateProductInput {
  sku: string;
  supplierId: string;
  supplierName: string;
  category: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  unitPrice: string;
  currency: string;
  taxRate: string;
  unit: string;
  initialStock: number;
  minStockAlert: number;
  icon3d: Icon3DName;
  originCountry: string;
  incoterm: string;
  leadTimeDays: number;
}

export interface QuoteCreateInput {
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  currency?: string;
  validityDays?: number;
  incoterm?: string;
  paymentTerms?: string;
  specialInstructions?: string;
  lines: {
    productId?: string;
    description: string;
    quantity: number;
    targetPrice?: string;
  }[];
}

export interface QuoteRespondInput {
  quoteId: string;
  supplierId: string;
  supplierNotes?: string;
  incoterm?: string;
  paymentTerms?: string;
  validUntilDate: string;
  lines: {
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: string;
    discountPct?: string;
  }[];
}

export interface StripeCheckoutSessionSimulated {
  sessionId: string;
  orderId: string;
  invoiceId: string;
  amountTotalCents: number;
  currency: string;
  customerEmail: string;
  paymentStatus: 'unpaid' | 'paid';
  checkoutUrl: string;
}

export interface GenericPaymentSession {
  sessionId: string;
  orderId: string;
  orderNumber?: string;
  invoiceId: string;
  invoiceNumber?: string;
  provider: PaymentProvider;
  amount: string;
  currency: string;
  customerEmail: string;
  checkoutUrl: string;
  virtualIban?: string;
  qrCodeData?: string;
  expiresAt: string;
}

export interface StripeWebhookPayloadSimulated {
  id: string; // evt_...
  type: 'checkout.session.completed' | 'payment_intent.succeeded' | 'charge.refunded';
  created: number;
  data: {
    object: {
      id: string; // cs_test_... or pi_...
      amount_total: number;
      currency: string;
      customer_email: string;
      metadata: {
        orderId: string;
        invoiceId: string;
        clientId: string;
        supplierId: string;
      };
      payment_status: string;
    };
  };
}

// ============================================================================
// 1. RÉFÉRENTIEL DES CATÉGORIES DE COMMERCE INTERNATIONAL (Trilingue FR/EN/AR)
// ============================================================================

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'cat-cold-chain',
    code: 'COLD_CHAIN',
    icon3d: 'cold-chain',
    displayOrder: 1,
    name: {
      fr: 'Chaîne du Froid & Agroalimentaire',
      en: 'Cold Chain & Agro-industry',
      ar: 'سلسلة التبريد والصناعات الغذائية',
    },
    description: {
      fr: 'Produits thermosensibles, denrées périssables et équipements frigorifiques certifiés ATP',
      en: 'Temperature-controlled products, perishables and ATP-certified cooling equipment',
      ar: 'المنتجات الحساسة للحرارة والسلع القابلة للتلف ومعدات التبريد المعتمدة',
    },
  },
  {
    id: 'cat-industrial',
    code: 'INDUSTRIAL_EQUIPMENT',
    icon3d: 'warehouse-robot',
    displayOrder: 2,
    name: {
      fr: 'Équipements Industriels & Machines',
      en: 'Industrial Equipment & Machinery',
      ar: 'المعدات الصناعية والآلات',
    },
    description: {
      fr: 'Machines-outils, automates programmables et composants électromécaniques lourds',
      en: 'Machine tools, programmable automations and heavy electromechanical parts',
      ar: 'الآلات والأجهزة القابلة للبرمجة والمكونات الكهروميكانيكية الثقيلة',
    },
  },
  {
    id: 'cat-raw-materials',
    code: 'RAW_MATERIALS',
    icon3d: 'pallet-load',
    displayOrder: 3,
    name: {
      fr: 'Matières Premières & Vrac',
      en: 'Raw Materials & Bulk',
      ar: 'المواد الأولية والسلع السائبة',
    },
    description: {
      fr: 'Minerais, métaux ferreux/non-ferreux, granulats plastiques et polymères certifiés',
      en: 'Minerals, ferrous/non-ferrous metals, plastic granules and certified polymers',
      ar: 'المعادن والمواد الحديدية والبوليمرات المعتمدة للتصنيع',
    },
  },
  {
    id: 'cat-maritime-containers',
    code: 'CONTAINERS_LOGISTICS',
    icon3d: 'container',
    displayOrder: 4,
    name: {
      fr: 'Conteneurs Maritimes & Manutention',
      en: 'Maritime Containers & Handling',
      ar: 'الحاويات البحرية ومعدات المناولة',
    },
    description: {
      fr: 'Conteneurs 20ft, 40ft, High Cube, palettes ISO et équipements de levage portuaires',
      en: '20ft, 40ft High Cube containers, ISO pallets and port lifting equipment',
      ar: 'حاويات شحن 20 و40 قدماً ومنصات شحن ومعدات رفع الموانئ',
    },
  },
  {
    id: 'cat-pharma-gdp',
    code: 'PHARMA_MEDICAL',
    icon3d: 'temperature',
    displayOrder: 5,
    name: {
      fr: 'Pharmaceutique & Dispositifs Médicaux (GDP)',
      en: 'Pharmaceuticals & Medical Devices (GDP)',
      ar: 'الأدوية والمستلزمات الطبية المعتمدة',
    },
    description: {
      fr: 'Produits de santé sous contrôle strict de température certifiés ISO 13485 / GDP',
      en: 'Healthcare products under strict temperature logging ISO 13485 / GDP certified',
      ar: 'المنتجات الطبية الخاضعة لمراقبة دقيقة لدرجات الحرارة',
    },
  },
];

// ============================================================================
// 2. ENGINES COMMERCIAUX : STOCKS, PRIX, DEVIS, COMMANDES & FACTURES
// ============================================================================

export class CommercialEngine {
  /**
   * Calcul déterministe d'un devis ou d'une commande via Decimal.js (TTC, HT, TVA)
   */
  public static calculateTotals(
    lines: { quantity: number; unitPrice: string; discountPct?: string }[],
    taxRatePctStr = '20.00',
    shippingCostStr = '0.00'
  ): {
    subtotalAmount: string;
    taxAmount: string;
    shippingAmount: string;
    totalAmount: string;
  } {
    let subtotalDec = new Decimal(0);
    const taxRateDec = new Decimal(taxRatePctStr).dividedBy(100);
    const shippingDec = new Decimal(shippingCostStr);

    for (const line of lines) {
      const qtyDec = new Decimal(line.quantity);
      const unitDec = new Decimal(line.unitPrice);
      let lineTotal = qtyDec.times(unitDec);

      if (line.discountPct) {
        const discountDec = new Decimal(line.discountPct).dividedBy(100);
        lineTotal = lineTotal.minus(lineTotal.times(discountDec));
      }

      subtotalDec = subtotalDec.plus(lineTotal);
    }

    const roundedSubtotal = subtotalDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const calculatedTax = roundedSubtotal.times(taxRateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const calculatedTotal = roundedSubtotal.plus(calculatedTax).plus(shippingDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    return {
      subtotalAmount: roundedSubtotal.toFixed(2),
      taxAmount: calculatedTax.toFixed(2),
      shippingAmount: shippingDec.toFixed(2),
      totalAmount: calculatedTotal.toFixed(2),
    };
  }

  /**
   * Enregistre un mouvement de stock déterministe et vérifie l'alerte de seuil minimum
   */
  public static applyStockMovement(
    product: ProductItem,
    type: StockMovementRecord['movementType'],
    quantity: number,
    reason: string,
    performedBy: { id: string; name: string },
    referenceDoc?: string
  ): {
    updatedProduct: ProductItem;
    movementRecord: StockMovementRecord;
    alertTriggered: boolean;
  } {
    if (quantity <= 0) {
      throw new Error('La quantité pour un mouvement de stock doit être strictement positive.');
    }

    const updated = { ...product };

    switch (type) {
      case 'IN_PURCHASE':
        updated.stockAvailable += quantity;
        break;
      case 'OUT_SALE':
        if (updated.stockAvailable < quantity) {
          throw new Error(`Stock insuffisant pour ${updated.sku} (disponible: ${updated.stockAvailable}, requis: ${quantity}).`);
        }
        updated.stockAvailable -= quantity;
        break;
      case 'RESERVATION':
        if (updated.stockAvailable < quantity) {
          throw new Error(`Stock insuffisant pour réserver ${quantity} unité(s) de ${updated.sku}.`);
        }
        updated.stockAvailable -= quantity;
        updated.stockReserved += quantity;
        break;
      case 'RELEASE_RESERVATION':
        if (updated.stockReserved < quantity) {
          throw new Error(`Impossible de libérer plus de stock réservé (${updated.stockReserved}) que disponible.`);
        }
        updated.stockReserved -= quantity;
        updated.stockAvailable += quantity;
        break;
      case 'INVENTORY_ADJUSTMENT':
        updated.stockAvailable = quantity; // Ajustement direct de l'inventaire
        break;
    }

    const alertTriggered = updated.stockAvailable <= updated.minStockAlert;

    const movementRecord: StockMovementRecord = {
      id: `mvt-${Date.now()}-${getSecureRandomInt(0, 1000)}`,
      movementNumber: `MVT-STK-${getSecureRandomInt(100000, 1000000)}`,
      productId: updated.id,
      sku: updated.sku,
      movementType: type,
      quantityChange: quantity,
      resultingAvailable: updated.stockAvailable,
      resultingReserved: updated.stockReserved,
      reason,
      referenceDocument: referenceDoc,
      performedByUserId: performedBy.id,
      performedByUserName: performedBy.name,
      timestamp: new Date().toISOString(),
      minStockAlertTriggered: alertTriggered,
    };

    return { updatedProduct: updated, movementRecord, alertTriggered };
  }

  // ============================================================================
  // 3. MATRICE DE TRANSITION D'ÉTAT DU CYCLE DE COMMANDE
  // ============================================================================
  public static readonly ORDER_TRANSITION_MATRIX: Record<OrderStatus, OrderStatus[]> = {
    DRAFT: ['PENDING', 'PENDING_VALIDATION', 'CANCELLED'],
    PENDING: ['PENDING_VALIDATION', 'CONFIRMED', 'ACCEPTED', 'REFUSED', 'CANCELLED'],
    PENDING_VALIDATION: ['CONFIRMED', 'ACCEPTED', 'REFUSED', 'CANCELLED'],
    ACCEPTED: ['CONFIRMED', 'PENDING_PAYMENT', 'PAID', 'PREPARING', 'IN_PREPARATION', 'CANCELLED'],
    CONFIRMED: ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'IN_PREPARATION', 'CANCELLED'],
    PENDING_PAYMENT: ['PAID', 'PREPARING', 'IN_PREPARATION', 'CANCELLED'],
    PAID: ['PREPARING', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'CANCELLED', 'DISPUTED'],
    PREPARING: ['IN_PREPARATION', 'READY_FOR_PICKUP', 'SHIPPED', 'CANCELLED'],
    IN_PREPARATION: ['READY_FOR_PICKUP', 'SHIPPED', 'CANCELLED'],
    READY_FOR_PICKUP: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['IN_TRANSIT', 'DELIVERED', 'DISPUTED'],
    IN_TRANSIT: ['DELIVERED', 'DISPUTED'],
    DELIVERED: ['COMPLETED', 'DISPUTED'],
    COMPLETED: ['DISPUTED'],
    REFUSED: [],
    CANCELLED: [],
    DISPUTED: ['COMPLETED', 'CANCELLED', 'IN_PREPARATION', 'SHIPPED', 'DELIVERED'],
  };

  public static isValidOrderTransition(current: OrderStatus, target: OrderStatus): boolean {
    if (current === target) return true;
    const allowed = this.ORDER_TRANSITION_MATRIX[current] || [];
    return allowed.includes(target);
  }

  public static assertOrderTransition(current: OrderStatus, target: OrderStatus): void {
    if (!this.isValidOrderTransition(current, target)) {
      throw new Error(
        `Transition de statut de commande non autorisée : tentative de passage de '${current}' à '${target}'.`
      );
    }
  }

  // ============================================================================
  // 4. RÉFÉRENTIEL MONÉTAIRE & TAUX DE CONVERSION B2B (EUR, USD, TND, MAD)
  // ============================================================================
  public static readonly CURRENCY_RATES_TO_EUR: Record<string, string> = {
    EUR: '1.0000',
    USD: '0.9250',
    TND: '0.2985',
    MAD: '0.0921',
  };

  public static convertCurrency(amountStr: string, fromCurrency = 'EUR', toCurrency = 'EUR'): string {
    if (fromCurrency === toCurrency) return amountStr;
    const fromRate = new Decimal(this.CURRENCY_RATES_TO_EUR[fromCurrency] || '1.0000');
    const toRate = new Decimal(this.CURRENCY_RATES_TO_EUR[toCurrency] || '1.0000');
    const amountDec = new Decimal(amountStr);
    const amountInEur = amountDec.times(fromRate);
    const converted = amountInEur.dividedBy(toRate);
    return converted.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  }

  // ============================================================================
  // 5. VALIDATION DU PANIER CÔTÉ SERVEUR (Zéro confiance dans le frontend)
  // ============================================================================
  public static validateCart(
    items: { productId: string; quantity: number }[],
    productsCatalog: ProductItem[],
    currency = 'EUR',
    vatRatePct = '20.00',
    shippingFlatRate = '650.00'
  ): CartValidationResult {
    let subtotalDec = new Decimal(0);
    const verifiedItems: VerifiedCartItem[] = [];
    const warnings: string[] = [];
    let unavailableCount = 0;

    for (const reqItem of items) {
      const prodId = reqItem.productId || (reqItem as any).product?.id;
      const prod = productsCatalog.find((p) => p.id === prodId);
      if (!prod) {
        unavailableCount++;
        warnings.push(`Le produit référence ID ${prodId || 'INCONNU'} n'existe plus au catalogue.`);
        verifiedItems.push({
          productId: prodId || 'UNKNOWN',
          sku: 'UNKNOWN',
          name: 'Produit Indisponible',
          requestedQuantity: reqItem.quantity,
          availableStock: 0,
          minOrderQuantity: 1,
          unitPrice: '0.00',
          lineTotal: '0.00',
          currency,
          isAvailable: false,
          status: 'OUT_OF_STOCK',
          warningMessage: 'Produit retiré du catalogue.',
        });
        continue;
      }

      const moq = prod.minOrderQuantity || 1;
      let itemStatus: VerifiedCartItem['status'] = 'IN_STOCK';
      let isAvailable = true;
      let warningMessage: string | undefined;

      if (prod.stockAvailable <= 0) {
        itemStatus = 'OUT_OF_STOCK';
        isAvailable = false;
        unavailableCount++;
        warningMessage = `Rupture totale : stock épuisé pour ${prod.name.fr}.`;
        warnings.push(warningMessage);
      } else if (prod.stockAvailable < reqItem.quantity) {
        itemStatus = 'PARTIAL_STOCK';
        warningMessage = `Stock limité pour ${prod.name.fr} : ${prod.stockAvailable} disponible(s) sur ${reqItem.quantity} demandé(s).`;
        warnings.push(warningMessage);
      } else if (reqItem.quantity < moq) {
        itemStatus = 'BELOW_MOQ';
        warningMessage = `Quantité minimale de commande (MOQ) non atteinte pour ${prod.name.fr} : minimum requis ${moq}.`;
        warnings.push(warningMessage);
      }

      // Calcul avec le prix catalogue officiel côté serveur (incluant paliers dégressifs B2B et variantes)
      let effectiveBasePrice = prod.unitPrice;
      if (Array.isArray(prod.priceTiers) && prod.priceTiers.length > 0) {
        const sortedTiers = [...prod.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
        for (const tier of sortedTiers) {
          const meetsMin = reqItem.quantity >= tier.minQuantity;
          const meetsMax = tier.maxQuantity === undefined || reqItem.quantity <= tier.maxQuantity;
          if (meetsMin && meetsMax) {
            if (tier.unitPrice) {
              effectiveBasePrice = tier.unitPrice;
            } else if (tier.discountPct) {
              const disc = new Decimal(tier.discountPct).dividedBy(100);
              const baseD = new Decimal(prod.unitPrice);
              effectiveBasePrice = baseD.minus(baseD.times(disc)).toFixed(2);
            }
            break;
          }
        }
      }
      const unitPriceConverted = this.convertCurrency(effectiveBasePrice, prod.currency || 'EUR', currency);
      const unitDec = new Decimal(unitPriceConverted);
      const lineTotalDec = unitDec.times(reqItem.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      if (isAvailable) {
        subtotalDec = subtotalDec.plus(lineTotalDec);
      }

      verifiedItems.push({
        productId: prod.id,
        sku: prod.sku,
        name: prod.name.fr,
        requestedQuantity: reqItem.quantity,
        availableStock: prod.stockAvailable,
        minOrderQuantity: moq,
        unitPrice: unitDec.toFixed(2),
        lineTotal: lineTotalDec.toFixed(2),
        currency,
        isAvailable,
        status: itemStatus,
        warningMessage,
      });
    }

    const roundedSubtotal = subtotalDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const taxRateDec = new Decimal(vatRatePct).dividedBy(100);
    const taxDec = roundedSubtotal.times(taxRateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const shippingDec = verifiedItems.length > 0 && verifiedItems.some((i) => i.isAvailable)
      ? new Decimal(shippingFlatRate)
      : new Decimal('0.00');
    const totalDec = roundedSubtotal.plus(taxDec).plus(shippingDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const hasBlockingIssues =
      unavailableCount > 0 ||
      verifiedItems.some((it) => !it.isAvailable || it.status === 'BELOW_MOQ' || it.status === 'PARTIAL_STOCK');

    return {
      valid: !hasBlockingIssues && verifiedItems.length > 0,
      hasUnavailableItems: unavailableCount > 0 || hasBlockingIssues,
      unavailableCount,
      items: verifiedItems,
      subtotalAmount: roundedSubtotal.toFixed(2),
      taxRatePct: vatRatePct,
      taxAmount: taxDec.toFixed(2),
      shippingAmount: shippingDec.toFixed(2),
      totalAmount: totalDec.toFixed(2),
      currency,
      warnings,
    };
  }

  /**
   * Création d'une demande de devis (RFQ) par un client
   */
  public static createQuote(input: QuoteCreateInput): QuoteRecord {
    const validityDays = input.validityDays ?? 30;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + validityDays);

    const quoteNumber = `DEV-2026-${getSecureRandomInt(10000, 100000)}`;

    const initialLines = input.lines.map((l) => {
      const unit = l.targetPrice ? new Decimal(l.targetPrice) : new Decimal('0.00');
      const totalLine = unit.times(l.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      return {
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        targetPrice: l.targetPrice,
        unitPrice: unit.toFixed(2),
        discountPct: '0.00',
        totalLine: totalLine.toFixed(2),
      };
    });

    const totals = this.calculateTotals(initialLines);

    return {
      id: `quo-${Date.now()}`,
      quoteNumber,
      clientId: input.clientId,
      clientName: input.clientName,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      status: 'SENT',
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      currency: input.currency || 'EUR',
      amountInWords: `${totals.totalAmount} ${input.currency || 'EUR'} TTC`,
      validUntil: expiry.toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      incoterm: input.incoterm || 'FOB',
      paymentTerms: input.paymentTerms || 'Acompte 30% à la commande, solde avant expédition',
      specialInstructions: input.specialInstructions,
      lines: initialLines,
    };
  }

  /**
   * Réponse et chiffrage du devis par le Fournisseur (Contre-proposition)
   */
  public static respondToQuote(quote: QuoteRecord, input: QuoteRespondInput): QuoteRecord {
    const todayStr = new Date().toISOString().split('T')[0];
    if (quote.status === 'EXPIRED' || (quote.validUntil && quote.validUntil < todayStr)) {
      throw new Error(`QUOTE_EXPIRED : Le devis ${quote.quoteNumber} a expiré le ${quote.validUntil}.`);
    }
    if (quote.status === 'CONVERTED' || quote.status === 'REFUSED' || quote.status === 'REJECTED') {
      throw new Error(`Le devis ${quote.quoteNumber} ne peut plus être modifié (statut actuel: ${quote.status}).`);
    }

    const calculatedLines = input.lines.map((l) => {
      const unit = new Decimal(l.unitPrice);
      const discount = l.discountPct ? new Decimal(l.discountPct).dividedBy(100) : new Decimal(0);
      const discountedUnit = unit.minus(unit.times(discount));
      const lineTotal = discountedUnit.times(l.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      return {
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: unit.toFixed(2),
        discountPct: l.discountPct ?? '0.00',
        totalLine: lineTotal.toFixed(2),
      };
    });

    const totals = this.calculateTotals(calculatedLines);
    const history = [...(quote.negotiationHistory || [])];
    history.push({
      round: history.length + 1,
      actorId: input.supplierId,
      actorRole: 'FOURNISSEUR',
      actorName: quote.supplierName,
      proposedSubtotal: totals.subtotalAmount,
      proposedTotal: totals.totalAmount,
      notes: input.supplierNotes,
      timestamp: new Date().toISOString(),
    });

    return {
      ...quote,
      status: 'RESPONDED',
      validUntil: input.validUntilDate || quote.validUntil,
      supplierNotes: input.supplierNotes,
      incoterm: input.incoterm || quote.incoterm,
      paymentTerms: input.paymentTerms || quote.paymentTerms,
      lines: calculatedLines,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountInWords: `${totals.totalAmount} ${quote.currency} TTC`,
      negotiationHistory: history,
    };
  }

  /**
   * Contre-proposition de négociation sur un devis B2B (Client ou Fournisseur)
   */
  public static negotiateQuote(
    quote: QuoteRecord,
    input: {
      actorId: string;
      actorRole: UserRoleCode;
      actorName: string;
      notes?: string;
      incoterm?: string;
      paymentTerms?: string;
      validUntilDate?: string;
      lines: {
        productId?: string;
        description: string;
        quantity: number;
        unitPrice: string;
        discountPct?: string;
      }[];
    }
  ): QuoteRecord {
    const todayStr = new Date().toISOString().split('T')[0];
    if (quote.status === 'EXPIRED' || (quote.validUntil && quote.validUntil < todayStr)) {
      throw new Error(`QUOTE_EXPIRED : Le devis ${quote.quoteNumber} a expiré le ${quote.validUntil}.`);
    }
    if (quote.status === 'CONVERTED' || quote.status === 'REFUSED' || quote.status === 'REJECTED') {
      throw new Error(`Le devis ${quote.quoteNumber} ne peut plus être négocié (statut actuel: ${quote.status}).`);
    }

    const calculatedLines = input.lines.map((l) => {
      const unit = new Decimal(l.unitPrice);
      const discount = l.discountPct ? new Decimal(l.discountPct).dividedBy(100) : new Decimal(0);
      const discountedUnit = unit.minus(unit.times(discount));
      const lineTotal = discountedUnit.times(l.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      return {
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: unit.toFixed(2),
        discountPct: l.discountPct ?? '0.00',
        totalLine: lineTotal.toFixed(2),
      };
    });

    const totals = this.calculateTotals(calculatedLines);
    const history = [...(quote.negotiationHistory || [])];
    history.push({
      round: history.length + 1,
      actorId: input.actorId,
      actorRole: input.actorRole,
      actorName: input.actorName,
      proposedSubtotal: totals.subtotalAmount,
      proposedTotal: totals.totalAmount,
      notes: input.notes,
      timestamp: new Date().toISOString(),
    });

    return {
      ...quote,
      status: 'NEGOTIATING',
      validUntil: input.validUntilDate || quote.validUntil,
      incoterm: input.incoterm || quote.incoterm,
      paymentTerms: input.paymentTerms || quote.paymentTerms,
      supplierNotes: input.actorRole === 'FOURNISSEUR' ? (input.notes || quote.supplierNotes) : quote.supplierNotes,
      specialInstructions: input.actorRole === 'CLIENT' ? (input.notes || quote.specialInstructions) : quote.specialInstructions,
      lines: calculatedLines,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountInWords: `${totals.totalAmount} ${quote.currency} TTC`,
      negotiationHistory: history,
    };
  }

  /**
   * Acceptation formelle d'un devis par le Client
   */
  public static acceptQuote(quote: QuoteRecord, actorId: string): QuoteRecord {
    if (quote.clientId !== actorId) {
      throw new Error('Seul le client émetteur de la demande est habilité à accepter ce devis.');
    }
    if (quote.status === 'CONVERTED' || quote.status === 'REFUSED' || quote.status === 'REJECTED') {
      throw new Error(`Le devis ${quote.quoteNumber} a déjà été finalisé (statut actuel: ${quote.status}).`);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (quote.validUntil && quote.validUntil < todayStr) {
      throw new Error(`Le devis ${quote.quoteNumber} a expiré le ${quote.validUntil}.`);
    }

    return {
      ...quote,
      status: 'ACCEPTED',
    };
  }

  /**
   * Refus d'un devis par le Client avec motif obligatoire
   */
  public static rejectQuote(quote: QuoteRecord, actorId: string, reason: string): QuoteRecord {
    if (quote.clientId !== actorId) {
      throw new Error('Seul le client émetteur de la demande est habilité à refuser ce devis.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('Un motif explicite d’au moins 5 caractères est obligatoire pour refuser un devis.');
    }

    return {
      ...quote,
      status: 'REFUSED',
      rejectionReason: reason.trim(),
    };
  }

  /**
   * Conversion atomique d'un devis accepté en Commande ferme
   * Vérifie le stock pour chaque produit référencé et réserve le stock
   */
  public static convertQuoteToOrder(
    quote: QuoteRecord,
    shippingAddress: string,
    productsCatalog: ProductItem[]
  ): {
    updatedQuote: QuoteRecord;
    createdOrder: OrderRecord;
    updatedProducts: ProductItem[];
  } {
    if (
      quote.status !== 'RESPONDED' &&
      quote.status !== 'ACCEPTED' &&
      quote.status !== 'QUOTATION_ISSUED' &&
      quote.status !== 'NEGOTIATING'
    ) {
      throw new Error(
        `Impossible de convertir le devis ${quote.quoteNumber} en commande : il doit être au statut RESPONDED, NEGOTIATING ou ACCEPTED (statut actuel: ${quote.status}).`
      );
    }

    // Vérification de la date de validité
    const nowStr = new Date().toISOString().split('T')[0];
    if (quote.validUntil && quote.validUntil < nowStr) {
      throw new Error(`QUOTE_EXPIRED : Le devis ${quote.quoteNumber} a expiré le ${quote.validUntil}.`);
    }

    const updatedProducts: ProductItem[] = [];
    const orderItems: OrderRecord['items'] = [];

    for (const line of quote.lines) {
      // Trouver le produit correspondant par ID, description ou SKU
      const matched = productsCatalog.find(
        (p) =>
          (line.productId && p.id === line.productId) ||
          p.sku.toLowerCase() === line.description.toLowerCase() ||
          p.name.fr.toLowerCase().includes(line.description.toLowerCase()) ||
          line.description.toLowerCase().includes(p.name.fr.toLowerCase())
      ) ?? productsCatalog[0];

      if (matched.stockAvailable < line.quantity) {
        throw new Error(
          `Stock insuffisant lors de la conversion du devis pour ${matched.name.fr} (${matched.sku}) : disponible ${matched.stockAvailable}, requis ${line.quantity}.`
        );
      }

      // Réservation atomique du stock
      const prodCopy = { ...matched };
      prodCopy.stockAvailable -= line.quantity;
      prodCopy.stockReserved += line.quantity;
      prodCopy.stockOrdered = (prodCopy.stockOrdered || 0) + line.quantity;
      updatedProducts.push(prodCopy);

      orderItems.push({
        productId: matched.id,
        sku: matched.sku,
        name: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalLine: line.totalLine,
        icon3d: matched.icon3d,
      });
    }

    const orderNumber = `CMD-2026-${getSecureRandomInt(10000, 100000)}`;

    const createdOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber,
      clientId: quote.clientId,
      clientName: quote.clientName,
      supplierId: quote.supplierId,
      supplierName: quote.supplierName,
      status: 'CONFIRMED',
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      paymentStatus: 'UNPAID',
      subtotalAmount: quote.subtotalAmount,
      taxAmount: quote.taxAmount,
      shippingAmount: '0.00',
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      shippingAddress,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      items: orderItems,
      timeline: [
        {
          step: `Devis ${quote.quoteNumber} converti en commande ferme`,
          timestamp: new Date().toISOString(),
          actor: quote.clientName,
          completed: true,
        },
        {
          step: 'Stock réservé atomiquement et commande confirmée',
          timestamp: new Date().toISOString(),
          actor: quote.supplierName,
          completed: true,
        },
      ],
    };

    const updatedQuote: QuoteRecord = {
      ...quote,
      status: 'CONVERTED',
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    };

    return { updatedQuote, createdOrder, updatedProducts };
  }

  private static readonly invoiceSequenceByYear = new Map<number, number>();

  /**
   * Génération d'une facture légale normalisée à partir d'une commande
   * Numérotation séquentielle unique et stricte par exercice fiscal (ex: FAC-2026-00001)
   */
  public static generateInvoiceFromOrder(
    order: OrderRecord,
    dueInDays = 30,
    jurisdiction = 'France / UE (TVA 20%)',
    existingInvoices: InvoiceRecord[] = []
  ): InvoiceRecord {
    const now = new Date();
    const fiscalYear = now.getFullYear();
    const prefix = `FAC-${fiscalYear}-`;

    let maxExistingSeq = this.invoiceSequenceByYear.get(fiscalYear) || 0;
    for (const inv of existingInvoices) {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
        const suffix = inv.invoiceNumber.slice(prefix.length);
        const parsed = parseInt(suffix, 10);
        if (!Number.isNaN(parsed) && parsed < 10000 && parsed > maxExistingSeq) {
          maxExistingSeq = parsed;
        }
      }
    }

    const nextSeq = maxExistingSeq + 1;
    this.invoiceSequenceByYear.set(fiscalYear, nextSeq);
    const invoiceNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    return {
      id: `inv-${Date.now()}-${nextSeq}`,
      invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientId: order.clientId,
      clientName: order.clientName,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      status: 'ISSUED',
      subtotal: order.subtotalAmount,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      currency: order.currency,
      jurisdiction,
      issuedAt: now.toISOString().replace('T', ' ').slice(0, 10),
      dueAt: dueDate.toISOString().replace('T', ' ').slice(0, 10),
    };
  }

  /**
   * Création d'une session de paiement Stripe (mode test B2B)
   */
  public static createStripeCheckoutSession(
    order: OrderRecord,
    invoice: InvoiceRecord,
    customerEmail: string
  ): StripeCheckoutSessionSimulated {
    const totalDecimal = new Decimal(invoice.totalAmount);
    const amountTotalCents = totalDecimal.times(100).toNumber();
    const sessionId = `cs_test_${Date.now()}_${getSecureRandomAlphanumeric(8)}`;

    return {
      sessionId,
      orderId: order.id,
      invoiceId: invoice.id,
      amountTotalCents,
      currency: invoice.currency.toLowerCase(),
      customerEmail,
      paymentStatus: 'unpaid',
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
    };
  }

  /**
   * Initialisation d'une session de paiement multi-prestataires (Stripe, Konnect, Flouci, CMI, Virement)
   */
  public static initiatePaymentSession(
    order: OrderRecord,
    invoice: InvoiceRecord,
    provider: PaymentProvider,
    customerEmail: string,
    currency?: string
  ): GenericPaymentSession {
    if (invoice.status === 'PAID') {
      throw new Error(`PAYMENT_ALREADY_SETTLED : La facture ${invoice.invoiceNumber} est déjà réglée en totalité.`);
    }

    const payCurrency = (currency || invoice.currency || 'EUR').toUpperCase();
    const targetAmount = this.convertCurrency(invoice.totalAmount, invoice.currency || 'EUR', payCurrency);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    const sessionId = `sess_${provider.toLowerCase()}_${Date.now()}_${getSecureRandomAlphanumeric(8)}`;
    let checkoutUrl = '';
    let virtualIban: string | undefined;
    let qrCodeData: string | undefined;

    switch (provider) {
      case 'STRIPE':
        checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`;
        break;
      case 'KONNECT':
        checkoutUrl = `https://api.konnect.network/gateway/pay/${sessionId}`;
        break;
      case 'FLOUCI':
        checkoutUrl = `https://app.flouci.com/pay/${sessionId}`;
        qrCodeData = `flouci://pay?ref=${sessionId}&amount=${targetAmount}&cur=${payCurrency}`;
        break;
      case 'CMI':
        checkoutUrl = `https://payment.cmi.co.ma/gateway/${sessionId}`;
        break;
      case 'WIRE_TRANSFER':
        virtualIban = 'FR76 3000 4000 0100 2026 8841 X99';
        checkoutUrl = `/client/paiements/virement?ref=${order.orderNumber}&iban=${virtualIban}`;
        break;
      default:
        checkoutUrl = `https://checkout.tradelink.com/pay/${sessionId}`;
    }

    return {
      sessionId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      provider,
      amount: targetAmount,
      currency: payCurrency,
      customerEmail,
      checkoutUrl,
      virtualIban,
      qrCodeData,
      expiresAt: expiryDate.toISOString(),
    };
  }

  /**
   * Confirmation définitive d'un paiement (Bloque les doubles paiements)
   */
  public static confirmPayment(
    payment: PaymentRecord,
    order: OrderRecord,
    invoice: InvoiceRecord,
    providerTxId?: string
  ): {
    updatedPayment: PaymentRecord;
    updatedInvoice: InvoiceRecord;
    updatedOrder: OrderRecord;
    receipt: PaymentReceiptRecord;
  } {
    if (payment.status === 'SUCCEEDED') {
      throw new Error(`Le paiement ${payment.paymentReference} a déjà été confirmé.`);
    }

    const updatedPayment: PaymentRecord = {
      ...payment,
      status: 'SUCCEEDED',
      rawProviderReference: providerTxId || payment.rawProviderReference,
      updatedAt: new Date().toISOString(),
    };

    const updatedInvoice: InvoiceRecord = {
      ...invoice,
      status: 'PAID',
      paidAt: new Date().toISOString().split('T')[0],
    };

    const nextOrderStatus: OrderStatus = order.status === 'CONFIRMED' || order.status === 'PENDING_PAYMENT'
      ? 'IN_PREPARATION'
      : order.status;

    const updatedOrder: OrderRecord = {
      ...order,
      status: nextOrderStatus,
      paymentStatus: 'PAID',
      paidAmount: payment.amount,
      paymentMethod: payment.provider,
      timeline: [
        ...order.timeline,
        {
          step: `Paiement ${payment.provider} confirmé (${payment.amount} ${payment.currency})`,
          timestamp: new Date().toISOString(),
          actor: `${payment.provider} Payment Gateway`,
          completed: true,
        },
      ],
    };

    const receipt = this.generatePaymentReceipt(updatedPayment, updatedOrder, updatedInvoice);
    updatedPayment.receiptNumber = receipt.receiptNumber;

    return { updatedPayment, updatedInvoice, updatedOrder, receipt };
  }

  /**
   * Échec d'un paiement
   */
  public static failPayment(payment: PaymentRecord, reason: string): PaymentRecord {
    return {
      ...payment,
      status: 'FAILED',
      failureReason: reason,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Annulation d'un paiement
   */
  public static cancelPayment(payment: PaymentRecord, reason: string): PaymentRecord {
    return {
      ...payment,
      status: 'CANCELLED',
      failureReason: reason,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Remboursement partiel ou total avec contrôle arithmétique strict (Decimal.js)
   */
  public static refundPayment(
    payment: PaymentRecord,
    invoice: InvoiceRecord,
    order: OrderRecord,
    refundAmountStr?: string,
    reason = 'Remboursement commercial accordé'
  ): {
    updatedPayment: PaymentRecord;
    updatedInvoice: InvoiceRecord;
    updatedOrder: OrderRecord;
    refundedAmount: string;
    isFullRefund: boolean;
  } {
    if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new Error(`Seul un paiement au statut SUCCEEDED ou PARTIALLY_REFUNDED peut être remboursé (statut actuel: ${payment.status}).`);
    }

    const originalDec = new Decimal(payment.amount);
    const alreadyRefundedDec = new Decimal(payment.refundedAmount || '0.00');
    const remainingRefundableDec = originalDec.minus(alreadyRefundedDec);

    const requestedRefundDec = refundAmountStr ? new Decimal(refundAmountStr) : remainingRefundableDec;

    if (requestedRefundDec.lte(0)) {
      throw new Error('Le montant à rembourser doit être strictement supérieur à zéro.');
    }
    if (requestedRefundDec.gt(remainingRefundableDec)) {
      throw new Error(
        `Montant de remboursement (${requestedRefundDec.toFixed(2)}) supérieur au solde résiduel disponible (${remainingRefundableDec.toFixed(2)}).`
      );
    }

    const newTotalRefundedDec = alreadyRefundedDec.plus(requestedRefundDec);
    const isFullRefund = newTotalRefundedDec.gte(originalDec);

    const updatedPayment: PaymentRecord = {
      ...payment,
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAmount: newTotalRefundedDec.toFixed(2),
      refundReason: reason,
      updatedAt: new Date().toISOString(),
    };

    const updatedInvoice: InvoiceRecord = {
      ...invoice,
      status: isFullRefund ? 'CANCELLED' : invoice.status,
    };

    const updatedOrder: OrderRecord = {
      ...order,
      paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_PAID',
      timeline: [
        ...order.timeline,
        {
          step: `Remboursement émis : ${requestedRefundDec.toFixed(2)} ${payment.currency} (${reason})`,
          timestamp: new Date().toISOString(),
          actor: 'Service Trésorerie TRADELINK',
          completed: true,
        },
      ],
    };

    return {
      updatedPayment,
      updatedInvoice,
      updatedOrder,
      refundedAmount: requestedRefundDec.toFixed(2),
      isFullRefund,
    };
  }

  /**
   * Génération d'une quittance / reçu de paiement certifié avec signature numérique SHA-256
   */
  public static generatePaymentReceipt(
    payment: PaymentRecord,
    order: OrderRecord,
    invoice: InvoiceRecord
  ): PaymentReceiptRecord {
    const receiptNumber = `REC-2026-${getSecureRandomInt(100000, 1000000)}`;
    const issuedAt = new Date().toISOString();

    const rawPayload = `${receiptNumber}|${payment.id}|${payment.paymentReference}|${order.orderNumber}|${invoice.invoiceNumber}|${payment.amount}|${payment.currency}|${issuedAt}`;
    const digitalSignatureSha256 = crypto.createHash('sha256').update(rawPayload).digest('hex');

    return {
      receiptNumber,
      paymentId: payment.id,
      paymentReference: payment.paymentReference,
      orderId: order.id,
      orderNumber: order.orderNumber,
      invoiceNumber: invoice.invoiceNumber,
      clientId: order.clientId,
      clientName: order.clientName,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      amountPaid: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      taxRate: (invoice.jurisdiction && invoice.jurisdiction.includes('20')) ? '20.00' : '20.00',
      taxAmount: invoice.taxAmount,
      issuedAt,
      digitalSignatureSha256,
    };
  }

  /**
   * Vérification cryptographique des signatures de Webhooks (HMAC-SHA256 & Anti-Rejeu)
   */
  public static verifyWebhookSignature(
    payload: string | object,
    signatureHeader: string,
    secretKey: string,
    maxAgeSecondsOrTimestamp?: number | string,
    optionalMaxAge = 300
  ): { valid: boolean; error?: string; reason?: string } {
    if (!signatureHeader || !secretKey) {
      return { valid: false, error: 'MISSING_CREDENTIALS', reason: 'En-tête de signature ou secret de webhook manquant.' };
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // Extraction du timestamp depuis l'en-tête (ex: t=1700000000,v1=...)
    let timestampStr: string | undefined;
    const tMatch = signatureHeader.match(/t=([0-9]+)/);
    if (tMatch) {
      timestampStr = tMatch[1];
    } else if (typeof maxAgeSecondsOrTimestamp === 'string' || (typeof maxAgeSecondsOrTimestamp === 'number' && maxAgeSecondsOrTimestamp > 1000000)) {
      timestampStr = String(maxAgeSecondsOrTimestamp);
    }

    const maxAgeSeconds = typeof maxAgeSecondsOrTimestamp === 'number' && maxAgeSecondsOrTimestamp < 1000000
      ? maxAgeSecondsOrTimestamp
      : optionalMaxAge;

    // Protection anti-rejeu par horodatage obligatoire (tolérance maxAgeSeconds, défaut 300s)
    if (!timestampStr) {
      return {
        valid: false,
        error: 'MISSING_TIMESTAMP',
        reason: 'Horodatage anti-rejeu (t= ou X-Timestamp) manquant dans la signature du webhook.',
      };
    }

    const tsNum = parseInt(timestampStr, 10);
    if (!Number.isFinite(tsNum) || Number.isNaN(tsNum) || tsNum <= 0) {
      return {
        valid: false,
        error: 'INVALID_TIMESTAMP',
        reason: 'Horodatage anti-rejeu invalide dans la signature du webhook.',
      };
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const tsInSec = tsNum > 1e11 ? Math.floor(tsNum / 1000) : tsNum;
    if (Math.abs(nowSec - tsInSec) > maxAgeSeconds) {
      return {
        valid: false,
        error: 'TIMESTAMP_OUT_OF_TOLERANCE',
        reason: `Échec anti-rejeu : horodatage expiré (${Math.abs(nowSec - tsInSec)}s > ${maxAgeSeconds}s).`,
      };
    }

    // Calcul du HMAC-SHA256 (format Stripe : `${timestamp}.${payload}`)
    const payloadToSign = `${timestampStr}.${payloadString}`;
    const expectedHmac = crypto.createHmac('sha256', secretKey).update(payloadToSign).digest('hex');

    // Extraction des signatures candidates (supporte la rotation multi-v1 Stripe: t=...,v1=...,v1=...)
    const candidateSigs: string[] = [];
    if (signatureHeader.includes('v1=')) {
      const v1Matches = Array.from(signatureHeader.matchAll(/(?:^|[,\s])v1=([^\s,]+)/gi));
      for (const m of v1Matches) {
        if (m[1]) candidateSigs.push(m[1].trim());
      }
      if (candidateSigs.length === 0) {
        return { valid: false, error: 'SIGNATURE_MISMATCH', reason: 'Signature v1= manquante ou malformée.' };
      }
    } else {
      candidateSigs.push(signatureHeader.trim());
    }

    try {
      const bufB = Buffer.from(expectedHmac, 'hex');
      for (const sig of candidateSigs) {
        if (!/^[a-f0-9]{64}$/i.test(sig)) {
          continue;
        }
        const bufA = Buffer.from(sig, 'hex');
        if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
          return { valid: true };
        }
      }
      const hasValidHexFormat = candidateSigs.some((sig) => /^[a-f0-9]{64}$/i.test(sig));
      return {
        valid: false,
        error: 'SIGNATURE_MISMATCH',
        reason: hasValidHexFormat
          ? 'Signature HMAC-SHA256 non concordante.'
          : 'Longueur ou format de signature hexadécimal invalide.',
      };
    } catch {
      return { valid: false, error: 'SIGNATURE_MISMATCH', reason: 'Format de hachage hexadécimal invalide.' };
    }
  }

  /**
   * Traitement idempotent d'un webhook Stripe
   * Garantit l'absence de double comptabilisation ou double paiement
   */
  public static processStripeWebhookIdempotent(
    webhookPayload: StripeWebhookPayloadSimulated,
    processedEventIds: Set<string>,
    existingPayments: PaymentRecord[],
    invoices: InvoiceRecord[],
    orders: OrderRecord[]
  ): {
    isIdempotentReplay: boolean;
    paymentRecord?: PaymentRecord;
    updatedInvoice?: InvoiceRecord;
    updatedOrder?: OrderRecord;
  } {
    const eventId = webhookPayload.id;

    // Détection d'idempotence stricte
    if (processedEventIds.has(eventId)) {
      const existing = existingPayments.find((p) => p.webhookEventId === eventId);
      return {
        isIdempotentReplay: true,
        paymentRecord: existing,
      };
    }

    if (webhookPayload.type !== 'checkout.session.completed' && webhookPayload.type !== 'payment_intent.succeeded') {
      return { isIdempotentReplay: false };
    }

    const { object } = webhookPayload.data;
    const { invoiceId, orderId, clientId, supplierId } = object.metadata;

    const invoice = invoices.find((inv) => inv.id === invoiceId);
    const order = orders.find((ord) => ord.id === orderId);

    if (!invoice) {
      throw new Error(`Facture ${invoiceId} introuvable pour le webhook Stripe.`);
    }

    const paidAmountDecimal = new Decimal(object.amount_total).dividedBy(100).toFixed(2);

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentReference: `PAY-STRIPE-${object.id.slice(-8).toUpperCase()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: order?.id,
      orderNumber: order?.orderNumber,
      clientId: clientId || invoice.clientId,
      supplierId: supplierId || invoice.supplierId,
      provider: 'STRIPE',
      amount: paidAmountDecimal,
      currency: object.currency.toUpperCase(),
      status: 'SUCCEEDED',
      webhookEventId: eventId,
      idempotencyVerified: true,
      reconciled: false,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    // Marquer l'événement comme traité
    processedEventIds.add(eventId);

    const updatedInvoice: InvoiceRecord = {
      ...invoice,
      status: 'PAID',
      paidAt: new Date().toISOString().replace('T', ' ').slice(0, 10),
    };

    let updatedOrder: OrderRecord | undefined;
    if (order) {
      updatedOrder = {
        ...order,
        status: 'PREPARING',
        paymentStatus: 'PAID',
        paidAmount: paidAmountDecimal,
        timeline: [
          ...order.timeline,
          {
            step: `Paiement Stripe confirmé (${paidAmountDecimal} ${invoice.currency}) — Commande en préparation`,
            timestamp: new Date().toISOString(),
            actor: 'Stripe Payment Gateway',
            completed: true,
          },
        ],
      };
    }

    return {
      isIdempotentReplay: false,
      paymentRecord,
      updatedInvoice,
      updatedOrder,
    };
  }

  // ============================================================================
  // 6. GESTION DES LITIGES COMMERCIAUX (DISPUTES) & ANOMALIES
  // ============================================================================
  public static openOrderDispute(
    order: OrderRecord,
    initiator: { id: string; name: string; role: UserRoleCode },
    reason: DisputeReason,
    description: string
  ): { updatedOrder: OrderRecord; dispute: CommercialDisputeRecord } {
    if (order.status === 'CANCELLED') {
      throw new Error('Impossible d’ouvrir un litige sur une commande déjà annulée.');
    }
    if (!description || description.trim().length < 10) {
      throw new Error('Une description détaillée d’au moins 10 caractères est requise pour ouvrir un litige.');
    }

    const disputeNumber = `LIT-2026-${getSecureRandomInt(1000, 10000)}`;
    const disputeId = `disp-${Date.now()}`;

    const dispute: CommercialDisputeRecord = {
      id: disputeId,
      disputeNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      initiatorId: initiator.id,
      initiatorName: initiator.name,
      initiatorRole: initiator.role,
      reason,
      description: description.trim(),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    const updatedOrder: OrderRecord = {
      ...order,
      status: 'DISPUTED',
      disputeId,
      timeline: [
        ...order.timeline,
        {
          step: `Litige commercial ouvert : ${disputeNumber} (${reason})`,
          timestamp: new Date().toISOString(),
          actor: initiator.name,
          completed: true,
          note: description.trim(),
        },
      ],
    };

    return { updatedOrder, dispute };
  }

  public static resolveOrderDispute(
    dispute: CommercialDisputeRecord,
    order: OrderRecord,
    resolver: { id: string; name: string },
    resolution: string,
    action: 'REFUND_TOTAL' | 'REFUND_PARTIAL' | 'FORCE_DELIVERY' | 'DISMISSED'
  ): { updatedDispute: CommercialDisputeRecord; updatedOrder: OrderRecord } {
    if (dispute.status === 'RESOLVED') {
      throw new Error(`Le litige ${dispute.disputeNumber} est déjà résolu.`);
    }

    const updatedDispute: CommercialDisputeRecord = {
      ...dispute,
      status: 'RESOLVED',
      resolution,
      arbitrationAction: action,
      resolvedByUserId: resolver.id,
      resolvedByUserName: resolver.name,
      resolvedAt: new Date().toISOString(),
    };

    let nextOrderStatus: OrderStatus = 'COMPLETED';
    if (action === 'REFUND_TOTAL') {
      nextOrderStatus = 'CANCELLED';
    } else if (action === 'FORCE_DELIVERY') {
      nextOrderStatus = 'DELIVERED';
    }

    const updatedOrder: OrderRecord = {
      ...order,
      status: nextOrderStatus,
      timeline: [
        ...order.timeline,
        {
          step: `Litige ${dispute.disputeNumber} résolu par l'Administrateur (${action})`,
          timestamp: new Date().toISOString(),
          actor: resolver.name,
          completed: true,
          note: resolution,
        },
      ],
    };

    return { updatedDispute, updatedOrder };
  }

  /**
   * Sécurité & RBAC : Blocage strict des mutations commerciales pour le rôle COMPTABLE
   * "Le comptable conserve ses droits de lecture seule sur les données commerciales sources"
   */
  public static enforceCommercialAccessControl(
    role: UserRoleCode,
    _action: 'CREATE_PRODUCT' | 'UPDATE_STOCK' | 'CREATE_ORDER' | 'UPDATE_ORDER'
  ): void {
    if (role === 'COMPTABLE') {
      throw new Error(
        'ACCÈS REFUSÉ (Stage 3 Cahier des Charges) : Le rôle COMPTABLE dispose uniquement d’un droit de LECTURE SEULE sur les données commerciales sources (produits, stocks, commandes). Toute mutation est strictement interdite.'
      );
    }
  }
}

// ============================================================================
// 7. GESTIONNAIRE D'IDEMPOTENCE EN MÉMOIRE
// ============================================================================
export class IdempotencyStore {
  private cache = new Map<string, { response: any; createdAt: number }>();
  private readonly ttlMs: number;

  constructor(ttlMs = 24 * 3600 * 1000) {
    this.ttlMs = ttlMs;
  }

  public get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.response as T;
  }

  public set(key: string, response: any): void {
    this.cache.set(key, { response, createdAt: Date.now() });
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const defaultIdempotencyStore = new IdempotencyStore();
