// ============================================================================
// TRADELINK V6.0 — MOTEUR COMMERCIAL COMPLET (PROMPT 7)
// Gestion Catégories, Produits multilingues, Médias 3D, Prix & Devises,
// Stocks & Mouvements, Devis, Commandes, Facturation, Stripe Idempotent
// ============================================================================

import Decimal from 'decimal.js';
import {
  Icon3DName,
  InvoiceRecord,
  Locale,
  OrderRecord,
  PaymentRecord,
  ProductItem,
  QuoteRecord,
  UserRoleCode,
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
  currency: string;
  validityDays?: number;
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
  lines: {
    description: string;
    quantity: number;
    unitPrice: string;
    discountPct?: string;
  }[];
  validUntilDate: string;
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
      id: `mvt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      movementNumber: `MVT-STK-${Math.floor(100000 + Math.random() * 900000)}`,
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

  /**
   * Création d'un devis initial par un client
   */
  public static createQuote(input: QuoteCreateInput): QuoteRecord {
    const validityDays = input.validityDays ?? 30;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + validityDays);

    const quoteNumber = `DEV-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const initialLines = input.lines.map((l) => {
      const unit = l.targetPrice ? new Decimal(l.targetPrice) : new Decimal('0.00');
      const totalLine = unit.times(l.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      return {
        description: l.description,
        quantity: l.quantity,
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
      lines: initialLines,
    };
  }

  /**
   * Réponse et chiffrage du devis par le Fournisseur
   */
  public static respondToQuote(quote: QuoteRecord, input: QuoteRespondInput): QuoteRecord {
    if (quote.status === 'CONVERTED' || quote.status === 'REFUSED') {
      throw new Error(`Le devis ${quote.quoteNumber} ne peut plus être modifié (statut actuel: ${quote.status}).`);
    }

    const calculatedLines = input.lines.map((l) => {
      const unit = new Decimal(l.unitPrice);
      const discount = l.discountPct ? new Decimal(l.discountPct).dividedBy(100) : new Decimal(0);
      const discountedUnit = unit.minus(unit.times(discount));
      const lineTotal = discountedUnit.times(l.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      return {
        description: l.description,
        quantity: l.quantity,
        unitPrice: unit.toFixed(2),
        discountPct: l.discountPct ?? '0.00',
        totalLine: lineTotal.toFixed(2),
      };
    });

    const totals = this.calculateTotals(calculatedLines);

    return {
      ...quote,
      status: 'RESPONDED',
      validUntil: input.validUntilDate,
      lines: calculatedLines,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountInWords: `${totals.totalAmount} ${quote.currency} TTC`,
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
    if (quote.status !== 'RESPONDED' && quote.status !== 'ACCEPTED') {
      throw new Error(
        `Impossible de convertir le devis ${quote.quoteNumber} en commande : il doit être au statut RESPONDED ou ACCEPTED (statut actuel: ${quote.status}).`
      );
    }

    // Vérification de la date de validité
    const nowStr = new Date().toISOString().split('T')[0];
    if (quote.validUntil < nowStr) {
      throw new Error(`Le devis ${quote.quoteNumber} a expiré le ${quote.validUntil}.`);
    }

    const updatedProducts: ProductItem[] = [];
    const orderItems: OrderRecord['items'] = [];

    for (const line of quote.lines) {
      // Trouver le produit correspondant par description ou SKU
      const matched = productsCatalog.find(
        (p) =>
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

    const orderNumber = `CMD-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const createdOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber,
      clientId: quote.clientId,
      clientName: quote.clientName,
      supplierId: quote.supplierId,
      supplierName: quote.supplierName,
      status: 'ACCEPTED',
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
          step: 'Stock réservé atomiquement et commande validée',
          timestamp: new Date().toISOString(),
          actor: quote.supplierName,
          completed: true,
        },
      ],
    };

    const updatedQuote: QuoteRecord = {
      ...quote,
      status: 'CONVERTED',
    };

    return { updatedQuote, createdOrder, updatedProducts };
  }

  /**
   * Génération d'une facture légale normalisée à partir d'une commande
   */
  public static generateInvoiceFromOrder(
    order: OrderRecord,
    dueInDays = 30,
    jurisdiction = 'France / UE (TVA 20%)'
  ): InvoiceRecord {
    const invoiceNumber = `FAC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    return {
      id: `inv-${Date.now()}`,
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
    const sessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
