// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import Decimal from 'decimal.js';
import crypto from 'crypto';
import type {
  ProductItem,
  StockMovementType,
  StockMovementRecord,
  StockReservationRecord,
  PhysicalInventoryLine,
  PhysicalInventorySession,
  StockAlertRecord,
  StockValuationReport,
  UserRoleCode,
} from '../types';
import { defaultCatalogEngine, CentralCatalogEngine } from './catalogEngine';
import { defaultNotificationDispatcher, CentralNotificationDispatcher } from './notificationEngine';

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// ERREURS MÉTIERS NORMALISÉES POUR LA GESTION DES STOCKS
// ============================================================================

export class StockError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'StockError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface StockActor {
  id: string;
  name?: string;
  role?: UserRoleCode;
  companyName?: string;
  email?: string;
}

// ============================================================================
// MOTEUR CENTRAL DE GESTION DES STOCKS & DISPONIBILITÉS (CentralStockEngine)
// ============================================================================

export class CentralStockEngine {
  private movements: Map<string, StockMovementRecord> = new Map();
  private reservations: Map<string, StockReservationRecord> = new Map();
  private inventorySessions: Map<string, PhysicalInventorySession> = new Map();
  private alerts: Map<string, StockAlertRecord> = new Map();

  private catalogEngine: CentralCatalogEngine;
  private notificationDispatcher: CentralNotificationDispatcher;

  constructor(
    catalogEngine: CentralCatalogEngine = defaultCatalogEngine,
    notificationDispatcher: CentralNotificationDispatcher = defaultNotificationDispatcher
  ) {
    this.catalogEngine = catalogEngine;
    this.notificationDispatcher = notificationDispatcher;
  }

  // ==========================================================================
  // 1. ENTRÉES DE STOCK (INBOUND_RECEIPT)
  // ==========================================================================

  public recordInbound(params: {
    productId: string;
    quantity: number;
    reason: string;
    referenceDocument?: string;
    batchNumber?: string;
    actor: StockActor;
  }): StockMovementRecord {
    const { productId, quantity, reason, referenceDocument, batchNumber, actor } = params;

    // 1. Contrôle RBAC Stage 3 : Le Comptable est en lecture seule stricte
    if (actor.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    if (!quantity || quantity <= 0) {
      throw new StockError(400, 'INVALID_QUANTITY', 'La quantité reçue doit être strictement positive.');
    }

    if (!reason || reason.trim().length < 3) {
      throw new StockError(400, 'MISSING_REASON', 'Le motif de réception de stock est obligatoire.');
    }

    const product = this.catalogEngine.getProductById(productId);
    if (!product) {
      throw new StockError(404, 'PRODUCT_NOT_FOUND', `Produit "${productId}" introuvable.`);
    }

    // 2. Cloisonnement Anti-IDOR Fournisseur
    if (actor.role === 'FOURNISSEUR' && product.supplierId !== actor.id) {
      throw new StockError(
        403,
        'FORBIDDEN_IDOR_STOCK_ACCESS',
        'Accès refusé : vous ne pouvez modifier le stock que de vos propres produits.'
      );
    }

    const newAvailable = product.stockAvailable + quantity;

    // Mise à jour atomique du produit dans le catalogue
    this.catalogEngine.updateProductStockQuantities(productId, {
      stockAvailable: newAvailable,
    });

    // Résolution d'alerte si le stock repasse au-dessus du seuil
    if (newAvailable > product.minStockAlert) {
      this.resolveActiveAlert(productId);
    }

    const movementId = `stkm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const movementNumber = `MOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const movement: StockMovementRecord = {
      id: movementId,
      movementNumber,
      productId: product.id,
      sku: product.sku,
      movementType: 'INBOUND_RECEIPT',
      quantityChange: quantity,
      resultingAvailable: newAvailable,
      resultingReserved: product.stockReserved,
      resultingOrdered: product.stockOrdered || 0,
      resultingShipped: product.stockShipped || 0,
      reason: reason.trim(),
      referenceDocument: referenceDocument?.trim(),
      batchNumber: batchNumber?.trim(),
      performedByUserId: actor.id,
      performedByUserName: actor.name || actor.companyName || 'Utilisateur',
      performedByUserRole: actor.role,
      timestamp: new Date().toISOString(),
      minStockAlertTriggered: false,
    };

    this.movements.set(movementId, movement);
    return structuredClone(movement);
  }

  // ==========================================================================
  // 2. AJUSTEMENTS DE STOCK (MANUEL, CASSE, PERTE, RÉGULARISATION)
  // ==========================================================================

  public adjustStock(params: {
    productId: string;
    newStockAvailable?: number;
    deltaAvailable?: number;
    reason: string;
    movementType?: StockMovementType;
    referenceDocument?: string;
    batchNumber?: string;
    actor: StockActor;
  }): StockMovementRecord {
    const { productId, newStockAvailable, deltaAvailable, reason, referenceDocument, batchNumber, actor } = params;

    if (actor.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    if (!reason || reason.trim().length < 3) {
      throw new StockError(400, 'MISSING_REASON', "Le motif d'ajustement de stock est obligatoire.");
    }

    const product = this.catalogEngine.getProductById(productId);
    if (!product) {
      throw new StockError(404, 'PRODUCT_NOT_FOUND', `Produit "${productId}" introuvable.`);
    }

    if (actor.role === 'FOURNISSEUR' && product.supplierId !== actor.id) {
      throw new StockError(
        403,
        'FORBIDDEN_IDOR_STOCK_ACCESS',
        'Accès refusé : vous ne pouvez modifier le stock que de vos propres produits.'
      );
    }

    let targetAvailable: number;
    let quantityChange: number;

    if (newStockAvailable !== undefined) {
      targetAvailable = newStockAvailable;
      quantityChange = targetAvailable - product.stockAvailable;
    } else if (deltaAvailable !== undefined) {
      quantityChange = deltaAvailable;
      targetAvailable = product.stockAvailable + deltaAvailable;
    } else {
      throw new StockError(
        400,
        'INVALID_ADJUSTMENT_PARAMS',
        'Vous devez spécifier soit newStockAvailable soit deltaAvailable.'
      );
    }

    if (targetAvailable < 0) {
      throw new StockError(
        400,
        'INVALID_NEGATIVE_STOCK',
        `Le stock disponible résultant (${targetAvailable}) ne peut pas être négatif.`
      );
    }

    // Mise à jour catalogue
    this.catalogEngine.updateProductStockQuantities(productId, {
      stockAvailable: targetAvailable,
    });

    // Déclenchement ou résolution d'alerte
    let alertTriggered = false;
    if (targetAvailable <= product.minStockAlert) {
      alertTriggered = true;
      this.checkAndTriggerStockAlert(product, targetAvailable);
    } else {
      this.resolveActiveAlert(productId);
    }

    const movementType: StockMovementType =
      params.movementType ||
      (quantityChange < 0 ? 'SCRAP_OR_LOSS' : 'INVENTORY_ADJUSTMENT');

    const movementId = `stkm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const movementNumber = `MOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const movement: StockMovementRecord = {
      id: movementId,
      movementNumber,
      productId: product.id,
      sku: product.sku,
      movementType,
      quantityChange,
      resultingAvailable: targetAvailable,
      resultingReserved: product.stockReserved,
      resultingOrdered: product.stockOrdered || 0,
      resultingShipped: product.stockShipped || 0,
      reason: reason.trim(),
      referenceDocument: referenceDocument?.trim(),
      batchNumber: batchNumber?.trim(),
      performedByUserId: actor.id,
      performedByUserName: actor.name || actor.companyName || 'Utilisateur',
      performedByUserRole: actor.role,
      timestamp: new Date().toISOString(),
      minStockAlertTriggered: alertTriggered,
    };

    this.movements.set(movementId, movement);
    return structuredClone(movement);
  }

  // ==========================================================================
  // 3. RÉSERVATION ATOMIQUE CÔTÉ SERVEUR (ANTI-OVERSELLING)
  // ==========================================================================

  public reserveStockForOrder(params: {
    orderId: string;
    orderNumber?: string;
    clientId: string;
    clientName?: string;
    items: { productId: string; quantity: number }[];
    ttlMinutes?: number;
    actor: StockActor;
    notes?: string;
  }): StockReservationRecord[] {
    const { orderId, orderNumber, clientId, clientName, items, ttlMinutes = 30, actor, notes } = params;

    if (actor.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    if (!items || items.length === 0) {
      throw new StockError(400, 'EMPTY_RESERVATION_ITEMS', 'La demande de réservation ne contient aucun article.');
    }

    // ÉTAPE 1 : VÉRIFICATION STRICTE DE DISPONIBILITÉ (PASS 1 - SANS EFFET DE BORD)
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new StockError(400, 'INVALID_RESERVATION_QUANTITY', 'La quantité à réserver doit être supérieure à 0.');
      }
      const prod = this.catalogEngine.getProductById(item.productId);
      if (!prod) {
        throw new StockError(404, 'PRODUCT_NOT_FOUND', `Produit "${item.productId}" introuvable.`);
      }
      if (prod.stockAvailable < item.quantity) {
        throw new StockError(
          400,
          'INSUFFICIENT_STOCK_FOR_RESERVATION',
          `Stock insuffisant pour le produit "${prod.sku}" (${prod.name.fr}) : demandé ${item.quantity}, disponible ${prod.stockAvailable}.`
        );
      }
    }

    // ÉTAPE 2 : ENGAGEMENT ATOMIQUE DES QUANTITÉS (PASS 2)
    const createdReservations: StockReservationRecord[] = [];
    const now = Date.now();
    const expiresAt = new Date(now + ttlMinutes * 60 * 1000).toISOString();
    const reservedAt = new Date(now).toISOString();

    for (const item of items) {
      const prod = this.catalogEngine.getProductById(item.productId)!;
      const newAvailable = prod.stockAvailable - item.quantity;
      const newReserved = prod.stockReserved + item.quantity;
      const newOrdered = (prod.stockOrdered || 0) + item.quantity;

      this.catalogEngine.updateProductStockQuantities(prod.id, {
        stockAvailable: newAvailable,
        stockReserved: newReserved,
        stockOrdered: newOrdered,
      });

      // Vérifier le franchissement du seuil d'alerte
      let alertTriggered = false;
      if (newAvailable <= prod.minStockAlert) {
        alertTriggered = true;
        this.checkAndTriggerStockAlert(prod, newAvailable);
      }

      // Enregistrement de la réservation
      const reservationId = `res-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const reservationNumber = `RES-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const reservation: StockReservationRecord = {
        id: reservationId,
        reservationNumber,
        orderId,
        orderNumber: orderNumber || orderId,
        clientId,
        clientName,
        productId: prod.id,
        sku: prod.sku,
        quantity: item.quantity,
        reservedAt,
        expiresAt,
        status: 'ACTIVE',
        notes,
      };

      this.reservations.set(reservationId, reservation);
      createdReservations.push(reservation);

      // Traçabilité du mouvement de stock
      const movementId = `stkm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const movement: StockMovementRecord = {
        id: movementId,
        movementNumber: `MOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        productId: prod.id,
        sku: prod.sku,
        movementType: 'ORDER_RESERVATION',
        quantityChange: -item.quantity,
        resultingAvailable: newAvailable,
        resultingReserved: newReserved,
        resultingOrdered: newOrdered,
        resultingShipped: prod.stockShipped || 0,
        reason: `Réservation pour commande ${orderNumber || orderId}`,
        referenceDocument: orderNumber || orderId,
        orderId,
        orderNumber: orderNumber || orderId,
        performedByUserId: actor.id,
        performedByUserName: actor.name || actor.companyName || 'Système Commercial',
        performedByUserRole: actor.role,
        timestamp: reservedAt,
        minStockAlertTriggered: alertTriggered,
      };

      this.movements.set(movementId, movement);
    }

    return createdReservations.map((r) => structuredClone(r));
  }

  // ==========================================================================
  // 4. LIBÉRATION DE RÉSERVATION (ANNULATION OU EXPIRATION TTL)
  // ==========================================================================

  public releaseReservation(params: {
    reservationId?: string;
    orderId?: string;
    reason?: string;
    actor: StockActor;
  }): StockMovementRecord[] {
    const { reservationId, orderId, reason, actor } = params;

    if (actor.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    const targets: StockReservationRecord[] = [];
    if (reservationId) {
      const res = this.reservations.get(reservationId);
      if (res && res.status === 'ACTIVE') {
        targets.push(res);
      }
    } else if (orderId) {
      for (const res of this.reservations.values()) {
        if (res.orderId === orderId && res.status === 'ACTIVE') {
          targets.push(res);
        }
      }
    } else {
      throw new StockError(400, 'INVALID_RELEASE_PARAMS', 'Spécifiez reservationId ou orderId.');
    }

    if (targets.length === 0) {
      throw new StockError(404, 'NO_ACTIVE_RESERVATION_FOUND', 'Aucune réservation active trouvée à libérer.');
    }

    const movementsGenerated: StockMovementRecord[] = [];
    const now = new Date().toISOString();

    for (const res of targets) {
      const prod = this.catalogEngine.getProductById(res.productId);
      if (!prod) continue;

      const newReserved = Math.max(0, prod.stockReserved - res.quantity);
      const newAvailable = prod.stockAvailable + res.quantity;
      const newOrdered = Math.max(0, (prod.stockOrdered || 0) - res.quantity);

      this.catalogEngine.updateProductStockQuantities(prod.id, {
        stockAvailable: newAvailable,
        stockReserved: newReserved,
        stockOrdered: newOrdered,
      });

      // Mettre à jour la réservation
      res.status = 'CANCELLED';
      res.releasedAt = now;
      this.reservations.set(res.id, res);

      // Résoudre l'alerte éventuelle si le stock est restauré
      if (newAvailable > prod.minStockAlert) {
        this.resolveActiveAlert(prod.id);
      }

      // Mouvement de libération
      const movementId = `stkm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const movement: StockMovementRecord = {
        id: movementId,
        movementNumber: `MOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        productId: prod.id,
        sku: prod.sku,
        movementType: 'RESERVATION_RELEASE',
        quantityChange: res.quantity,
        resultingAvailable: newAvailable,
        resultingReserved: newReserved,
        resultingOrdered: newOrdered,
        resultingShipped: prod.stockShipped || 0,
        reason: reason || `Libération réservation suite à annulation de commande ${res.orderNumber || res.orderId}`,
        referenceDocument: res.orderNumber || res.orderId,
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        performedByUserId: actor.id,
        performedByUserName: actor.name || actor.companyName || 'Système',
        performedByUserRole: actor.role,
        timestamp: now,
        minStockAlertTriggered: false,
      };

      this.movements.set(movementId, movement);
      movementsGenerated.push(movement);
    }

    return movementsGenerated.map((m) => structuredClone(m));
  }

  // ==========================================================================
  // 5. BALAYAGE AUTOMATIQUE DES RÉSERVATIONS EXPIRÉES (TTL SWEEP)
  // ==========================================================================

  public expirePendingReservations(currentTime = Date.now()): {
    expiredCount: number;
    releasedMovements: StockMovementRecord[];
  } {
    const expiredReservations: StockReservationRecord[] = [];

    for (const res of this.reservations.values()) {
      if (res.status === 'ACTIVE' && new Date(res.expiresAt).getTime() <= currentTime) {
        expiredReservations.push(res);
      }
    }

    if (expiredReservations.length === 0) {
      return { expiredCount: 0, releasedMovements: [] };
    }

    const releasedMovements: StockMovementRecord[] = [];
    const nowIso = new Date(currentTime).toISOString();

    for (const res of expiredReservations) {
      const prod = this.catalogEngine.getProductById(res.productId);
      if (!prod) continue;

      const newReserved = Math.max(0, prod.stockReserved - res.quantity);
      const newAvailable = prod.stockAvailable + res.quantity;
      const newOrdered = Math.max(0, (prod.stockOrdered || 0) - res.quantity);

      this.catalogEngine.updateProductStockQuantities(prod.id, {
        stockAvailable: newAvailable,
        stockReserved: newReserved,
        stockOrdered: newOrdered,
      });

      res.status = 'EXPIRED';
      res.releasedAt = nowIso;
      this.reservations.set(res.id, res);

      if (newAvailable > prod.minStockAlert) {
        this.resolveActiveAlert(prod.id);
      }

      const movementId = `stkm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const movement: StockMovementRecord = {
        id: movementId,
        movementNumber: `MOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        productId: prod.id,
        sku: prod.sku,
        movementType: 'RESERVATION_RELEASE',
        quantityChange: res.quantity,
        resultingAvailable: newAvailable,
        resultingReserved: newReserved,
        resultingOrdered: newOrdered,
        resultingShipped: prod.stockShipped || 0,
        reason: `Libération automatique : expiration TTL réservation commande ${res.orderNumber || res.orderId}`,
        referenceDocument: res.orderNumber || res.orderId,
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        performedByUserId: 'system-ttl-worker',
        performedByUserName: 'Automate TTL Réservations',
        performedByUserRole: 'ADMIN',
        timestamp: nowIso,
        minStockAlertTriggered: false,
      };

      this.movements.set(movementId, movement);
      releasedMovements.push(movement);
    }

    return {
      expiredCount: expiredReservations.length,
      releasedMovements: releasedMovements.map((m) => structuredClone(m)),
    };
  }

  // ==========================================================================
  // 6. CONFIRMATION DE SORTIE D'EXPÉDITION (FULFILLMENT / OUTBOUND_SHIPMENT)
  // ==========================================================================

  public fulfillReservation(params: {
    reservationId?: string;
    orderId?: string;
    referenceDocument?: string;
    reason?: string;
    actor: StockActor;
  }): StockMovementRecord[] {
    const { reservationId, orderId, referenceDocument, reason, actor } = params;

    if (actor.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    const targets: StockReservationRecord[] = [];
    if (reservationId) {
      const res = this.reservations.get(reservationId);
      if (res && res.status === 'ACTIVE') {
        targets.push(res);
      }
    } else if (orderId) {
      for (const res of this.reservations.values()) {
        if (res.orderId === orderId && res.status === 'ACTIVE') {
          targets.push(res);
        }
      }
    } else {
      throw new StockError(400, 'INVALID_FULFILL_PARAMS', 'Spécifiez reservationId ou orderId.');
    }

    if (targets.length === 0) {
      throw new StockError(404, 'NO_ACTIVE_RESERVATION_TO_FULFILL', 'Aucune réservation active trouvée à expédier.');
    }

    const movements: StockMovementRecord[] = [];
    const now = new Date().toISOString();

    for (const res of targets) {
      const prod = this.catalogEngine.getProductById(res.productId);
      if (!prod) continue;

      const newReserved = Math.max(0, prod.stockReserved - res.quantity);
      const newShipped = (prod.stockShipped || 0) + res.quantity;

      this.catalogEngine.updateProductStockQuantities(prod.id, {
        stockReserved: newReserved,
        stockShipped: newShipped,
      });

      res.status = 'FULFILLED';
      res.fulfilledAt = now;
      this.reservations.set(res.id, res);

      const movementId = `stkm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const movement: StockMovementRecord = {
        id: movementId,
        movementNumber: `MOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        productId: prod.id,
        sku: prod.sku,
        movementType: 'OUTBOUND_SHIPMENT',
        quantityChange: -res.quantity,
        resultingAvailable: prod.stockAvailable,
        resultingReserved: newReserved,
        resultingOrdered: prod.stockOrdered || 0,
        resultingShipped: newShipped,
        reason: reason || `Sortie définitive expédition commande ${res.orderNumber || res.orderId}`,
        referenceDocument: referenceDocument || res.orderNumber || res.orderId,
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        performedByUserId: actor.id,
        performedByUserName: actor.name || actor.companyName || 'Responsable Expéditions',
        performedByUserRole: actor.role,
        timestamp: now,
        minStockAlertTriggered: false,
      };

      this.movements.set(movementId, movement);
      movements.push(movement);
    }

    return movements.map((m) => structuredClone(m));
  }

  // ==========================================================================
  // 7. INVENTAIRES PHYSIQUES & RAPPROCHEMENT D'ÉCARTS
  // ==========================================================================

  public createInventorySession(params: {
    supplierId: string;
    supplierName: string;
    title: string;
    conductedBy: StockActor;
    productIds?: string[];
    notes?: string;
  }): PhysicalInventorySession {
    const { supplierId, supplierName, title, conductedBy, productIds, notes } = params;

    if (conductedBy.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    if (conductedBy.role === 'FOURNISSEUR' && conductedBy.id !== supplierId) {
      throw new StockError(
        403,
        'FORBIDDEN_IDOR_INVENTORY',
        'Vous ne pouvez créer une session d’inventaire que pour vos propres stocks.'
      );
    }

    const allProducts = this.catalogEngine.getAllProducts();
    let targetProducts = allProducts.filter((p) => p.supplierId === supplierId);

    if (productIds && productIds.length > 0) {
      targetProducts = targetProducts.filter((p) => productIds.includes(p.id));
    }

    if (targetProducts.length === 0) {
      throw new StockError(400, 'NO_PRODUCTS_TO_INVENTORY', 'Aucun produit éligible pour cette session d’inventaire.');
    }

    let totalTheoreticalQty = 0;
    const lines: PhysicalInventoryLine[] = targetProducts.map((p) => {
      totalTheoreticalQty += p.stockAvailable;
      return {
        productId: p.id,
        sku: p.sku,
        productName: p.name.fr,
        theoreticalAvailable: p.stockAvailable,
        physicalCounted: p.stockAvailable, // Initialisé au théorique avant saisie
        varianceQuantity: 0,
        unitPrice: p.unitPrice,
        varianceValueEur: '0.00',
        reconciled: false,
      };
    });

    const sessionId = `inv-sess-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const sessionNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const session: PhysicalInventorySession = {
      id: sessionId,
      sessionNumber,
      supplierId,
      supplierName,
      title: title.trim() || `Inventaire physique ${new Date().toLocaleDateString('fr-FR')}`,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      conductedByUserId: conductedBy.id,
      conductedByUserName: conductedBy.name || conductedBy.companyName || conductedBy.email || 'Responsable Stock',
      lines,
      totalTheoreticalQty,
      totalPhysicalQty: totalTheoreticalQty,
      totalVarianceQty: 0,
      totalVarianceValueEur: '0.00',
      notes,
    };

    this.inventorySessions.set(sessionId, session);
    return structuredClone(session);
  }

  public updateInventoryCount(
    sessionId: string,
    counts: { productId: string; physicalCounted: number; notes?: string }[],
    actor: StockActor
  ): PhysicalInventorySession {
    if (actor.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    const session = this.inventorySessions.get(sessionId);
    if (!session) {
      throw new StockError(404, 'INVENTORY_SESSION_NOT_FOUND', `Session d'inventaire "${sessionId}" introuvable.`);
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new StockError(
        400,
        'INVENTORY_SESSION_NOT_IN_PROGRESS',
        `La session d'inventaire est déjà ${session.status} et ne peut plus être modifiée.`
      );
    }

    if (actor.role === 'FOURNISSEUR' && session.supplierId !== actor.id) {
      throw new StockError(403, 'FORBIDDEN_IDOR_INVENTORY', 'Accès interdit à cet inventaire.');
    }

    const countsMap = new Map(counts.map((c) => [c.productId, c]));
    let totalPhysical = 0;
    let totalVariance = 0;
    let totalVarianceVal = new Decimal(0);

    for (const line of session.lines) {
      const input = countsMap.get(line.productId);
      if (input !== undefined) {
        if (input.physicalCounted < 0) {
          throw new StockError(
            400,
            'INVALID_NEGATIVE_COUNT',
            `Le comptage pour ${line.sku} ne peut pas être négatif.`
          );
        }
        line.physicalCounted = input.physicalCounted;
        if (input.notes) line.notes = input.notes;
      }

      line.varianceQuantity = line.physicalCounted - line.theoreticalAvailable;
      const lineVarianceVal = new Decimal(line.varianceQuantity).times(line.unitPrice);
      line.varianceValueEur = lineVarianceVal.toFixed(2);

      totalPhysical += line.physicalCounted;
      totalVariance += line.varianceQuantity;
      totalVarianceVal = totalVarianceVal.plus(lineVarianceVal);
    }

    session.totalPhysicalQty = totalPhysical;
    session.totalVarianceQty = totalVariance;
    session.totalVarianceValueEur = totalVarianceVal.toFixed(2);

    this.inventorySessions.set(sessionId, session);
    return structuredClone(session);
  }

  public reconcileInventorySession(
    sessionId: string,
    actor: StockActor,
    completionNotes?: string
  ): { session: PhysicalInventorySession; adjustmentsMade: StockMovementRecord[] } {
    if (actor.role === 'COMPTABLE') {
      throw new StockError(
        403,
        'FORBIDDEN_COMPTABLE_READ_ONLY',
        "Le profil Comptable dispose d'un accès strictement en lecture seule."
      );
    }

    const session = this.inventorySessions.get(sessionId);
    if (!session) {
      throw new StockError(404, 'INVENTORY_SESSION_NOT_FOUND', `Session d'inventaire "${sessionId}" introuvable.`);
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new StockError(
        400,
        'INVENTORY_SESSION_NOT_IN_PROGRESS',
        `Cette session d'inventaire est déjà clôturée (${session.status}).`
      );
    }

    if (actor.role === 'FOURNISSEUR' && session.supplierId !== actor.id) {
      throw new StockError(403, 'FORBIDDEN_IDOR_INVENTORY', 'Accès interdit à cet inventaire.');
    }

    const adjustmentsMade: StockMovementRecord[] = [];
    const now = new Date().toISOString();

    for (const line of session.lines) {
      if (line.varianceQuantity !== 0 && !line.reconciled) {
        const prod = this.catalogEngine.getProductById(line.productId);
        if (!prod) continue;

        // Ajuster le stock disponible au comptage physique réel constaté
        const targetAvailable = line.physicalCounted;
        this.catalogEngine.updateProductStockQuantities(prod.id, {
          stockAvailable: targetAvailable,
        });

        // Vérifier les seuils d'alerte
        let alertTriggered = false;
        if (targetAvailable <= prod.minStockAlert) {
          alertTriggered = true;
          this.checkAndTriggerStockAlert(prod, targetAvailable);
        } else {
          this.resolveActiveAlert(prod.id);
        }

        const movementId = `stkm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const movement: StockMovementRecord = {
          id: movementId,
          movementNumber: `MOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
          productId: prod.id,
          sku: prod.sku,
          movementType: 'INVENTORY_ADJUSTMENT',
          quantityChange: line.varianceQuantity,
          resultingAvailable: targetAvailable,
          resultingReserved: prod.stockReserved,
          resultingOrdered: prod.stockOrdered || 0,
          resultingShipped: prod.stockShipped || 0,
          reason: `Rapprochement inventaire ${session.sessionNumber} (écart de ${line.varianceQuantity > 0 ? '+' : ''}${line.varianceQuantity} unités)`,
          referenceDocument: session.sessionNumber,
          inventorySessionId: session.id,
          performedByUserId: actor.id,
          performedByUserName: actor.name || actor.companyName || 'Responsable Inventaire',
          performedByUserRole: actor.role,
          timestamp: now,
          minStockAlertTriggered: alertTriggered,
        };

        this.movements.set(movementId, movement);
        adjustmentsMade.push(movement);
        line.reconciled = true;
      } else {
        line.reconciled = true;
      }
    }

    session.status = 'COMPLETED';
    session.completedAt = now;
    if (completionNotes) {
      session.notes = (session.notes ? session.notes + '\n' : '') + completionNotes;
    }

    this.inventorySessions.set(sessionId, session);

    return {
      session: structuredClone(session),
      adjustmentsMade: adjustmentsMade.map((m) => structuredClone(m)),
    };
  }

  // ==========================================================================
  // 8. GESTION DES ALERTES DE STOCK FAIBLE & RUPTURES
  // ==========================================================================

  private checkAndTriggerStockAlert(product: ProductItem, currentAvailable: number): void {
    const isCritical = currentAvailable === 0;
    const severity = isCritical ? 'CRITICAL_OUT' : 'WARNING_LOW';

    // Éviter de re-déclencher la même alerte si une alerte identique non résolue existe déjà
    const existing = Array.from(this.alerts.values()).find(
      (a) => a.productId === product.id && !a.resolved && a.severity === severity
    );

    if (existing) return;

    const alertId = `stk-alert-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const alert: StockAlertRecord = {
      id: alertId,
      productId: product.id,
      sku: product.sku,
      productName: product.name.fr,
      supplierId: product.supplierId,
      stockAvailable: currentAvailable,
      minStockAlert: product.minStockAlert,
      severity,
      triggeredAt: new Date().toISOString(),
      resolved: false,
    };

    this.alerts.set(alertId, alert);

    // Envoi de la notification centrale au fournisseur
    try {
      this.notificationDispatcher.dispatch({
        notification: {
          id: `notif-stk-${Date.now()}`,
          userId: product.supplierId,
          category: 'COMMERCIAL',
          priority: isCritical ? 'CRITICAL' : 'HIGH',
          title: isCritical
            ? `🚨 RUPTURE DE STOCK CRITIQUE : ${product.sku}`
            : `⚠️ SEUIL DE STOCK BAS ATTEINT : ${product.sku}`,
          body: isCritical
            ? `Le produit "${product.name.fr}" (SKU: ${product.sku}) est en rupture totale de stock (0 unité disponible). Veuillez réapprovisionner au plus vite.`
            : `Le stock disponible du produit "${product.name.fr}" (${currentAvailable} ${product.unit}) est inférieur ou égal au seuil d'alerte configuré (${product.minStockAlert}).`,
          channels: ['IN_APP', 'EMAIL'],
          actionUrl: `/supplier/stocks?sku=${product.sku}`,
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      });
    } catch {
      // Tolérance si le dispatcher n'a pas de profil configuré pour ce fournisseur
    }
  }

  private resolveActiveAlert(productId: string): void {
    const now = new Date().toISOString();
    for (const alert of this.alerts.values()) {
      if (alert.productId === productId && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = now;
        this.alerts.set(alert.id, alert);
      }
    }
  }

  public getAlerts(supplierId?: string, onlyUnresolved = true): StockAlertRecord[] {
    let list = Array.from(this.alerts.values());
    if (supplierId) {
      list = list.filter((a) => a.supplierId === supplierId);
    }
    if (onlyUnresolved) {
      list = list.filter((a) => !a.resolved);
    }
    return list.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  public resolveAlertManual(alertId: string): StockAlertRecord {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new StockError(404, 'ALERT_NOT_FOUND', 'Alerte de stock introuvable.');
    }
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    this.alerts.set(alertId, alert);
    return structuredClone(alert);
  }

  // ==========================================================================
  // 9. SUPERVISION CONSOLIDÉE & RAPPORT DE VALORISATION FINANCIÈRE
  // ==========================================================================

  public getOverview(supplierId?: string) {
    const allProducts = this.catalogEngine.getAllProducts();
    const products = supplierId ? allProducts.filter((p) => p.supplierId === supplierId) : allProducts;

    let totalAvailable = 0;
    let totalReserved = 0;
    let totalOrdered = 0;
    let totalShipped = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    const enrichedProducts = products.map((p) => {
      totalAvailable += p.stockAvailable;
      totalReserved += p.stockReserved;
      totalOrdered += p.stockOrdered || 0;
      totalShipped += p.stockShipped || 0;

      let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (p.stockAvailable === 0) {
        stockStatus = 'OUT_OF_STOCK';
        outOfStockItems++;
      } else if (p.stockAvailable <= p.minStockAlert) {
        stockStatus = 'LOW_STOCK';
        lowStockItems++;
      }

      return {
        ...p,
        stockStatus,
      };
    });

    return {
      totalAvailable,
      totalReserved,
      totalOrdered,
      totalShipped,
      lowStockItems,
      outOfStockItems,
      totalReferences: products.length,
      products: enrichedProducts,
    };
  }

  public getValuationReport(supplierId?: string): StockValuationReport {
    const allProducts = this.catalogEngine.getAllProducts();
    const products = supplierId ? allProducts.filter((p) => p.supplierId === supplierId) : allProducts;

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    let totalAvailableUnits = 0;
    let totalReservedUnits = 0;
    let totalOrderedUnits = 0;
    let totalShippedUnits = 0;

    let totalAvailableValueEur = new Decimal(0);
    let totalReservedValueEur = new Decimal(0);

    for (const p of products) {
      if (p.stockAvailable === 0) {
        outOfStockCount++;
      } else if (p.stockAvailable <= p.minStockAlert) {
        lowStockCount++;
      } else {
        inStockCount++;
      }

      totalAvailableUnits += p.stockAvailable;
      totalReservedUnits += p.stockReserved;
      totalOrderedUnits += p.stockOrdered || 0;
      totalShippedUnits += p.stockShipped || 0;

      const availVal = new Decimal(p.unitPrice).times(p.stockAvailable);
      const resVal = new Decimal(p.unitPrice).times(p.stockReserved);

      totalAvailableValueEur = totalAvailableValueEur.plus(availVal);
      totalReservedValueEur = totalReservedValueEur.plus(resVal);
    }

    // Top moving products d'après les mouvements
    const productMovementsCount: Record<string, { totalMoved: number; totalShipped: number }> = {};
    for (const mov of this.movements.values()) {
      if (!productMovementsCount[mov.productId]) {
        productMovementsCount[mov.productId] = { totalMoved: 0, totalShipped: 0 };
      }
      productMovementsCount[mov.productId].totalMoved += Math.abs(mov.quantityChange);
      if (mov.movementType === 'OUTBOUND_SHIPMENT') {
        productMovementsCount[mov.productId].totalShipped += Math.abs(mov.quantityChange);
      }
    }

    const topMovingProducts = products
      .map((p) => ({
        productId: p.id,
        sku: p.sku,
        name: p.name.fr,
        totalMoved: productMovementsCount[p.id]?.totalMoved || 0,
        totalShipped: productMovementsCount[p.id]?.totalShipped || 0,
      }))
      .sort((a, b) => b.totalMoved - a.totalMoved)
      .slice(0, 5);

    // Estimation du ratio de rotation annualisé : (expédiées * 12) / moyen stock
    const avgPhysicalStock = Math.max(1, totalAvailableUnits + totalReservedUnits);
    const annualShippedEstimate = totalShippedUnits > 0 ? totalShippedUnits * 12 : totalAvailableUnits * 2;
    const turnoverRatio = new Decimal(annualShippedEstimate).dividedBy(avgPhysicalStock).toFixed(2);

    return {
      supplierId,
      totalReferencesCount: products.length,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalAvailableUnits,
      totalReservedUnits,
      totalOrderedUnits,
      totalShippedUnits,
      totalAvailableValueEur: totalAvailableValueEur.toFixed(2),
      totalReservedValueEur: totalReservedValueEur.toFixed(2),
      turnoverRatioAnnualEstimate: turnoverRatio,
      topMovingProducts,
    };
  }

  // ==========================================================================
  // 10. HISTORIQUE DES MOUVEMENTS & RÉSERVATIONS
  // ==========================================================================

  public listMovements(filter?: {
    productId?: string;
    supplierId?: string;
    movementType?: StockMovementType;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): StockMovementRecord[] {
    let list = Array.from(this.movements.values());

    if (filter?.productId) {
      list = list.filter((m) => m.productId === filter.productId);
    }

    if (filter?.supplierId) {
      const supplierProductIds = new Set(
        this.catalogEngine
          .getAllProducts()
          .filter((p) => p.supplierId === filter.supplierId)
          .map((p) => p.id)
      );
      list = list.filter((m) => supplierProductIds.has(m.productId));
    }

    if (filter?.movementType) {
      list = list.filter((m) => m.movementType === filter.movementType);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.sku.toLowerCase().includes(q) ||
          m.movementNumber.toLowerCase().includes(q) ||
          m.reason.toLowerCase().includes(q) ||
          (m.referenceDocument && m.referenceDocument.toLowerCase().includes(q))
      );
    }

    if (filter?.startDate) {
      list = list.filter((m) => new Date(m.timestamp) >= new Date(filter.startDate!));
    }

    if (filter?.endDate) {
      list = list.filter((m) => new Date(m.timestamp) <= new Date(filter.endDate!));
    }

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public listReservations(filter?: {
    orderId?: string;
    clientId?: string;
    productId?: string;
    status?: 'ACTIVE' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  }): StockReservationRecord[] {
    let list = Array.from(this.reservations.values());

    if (filter?.orderId) {
      list = list.filter((r) => r.orderId === filter.orderId);
    }
    if (filter?.clientId) {
      list = list.filter((r) => r.clientId === filter.clientId);
    }
    if (filter?.productId) {
      list = list.filter((r) => r.productId === filter.productId);
    }
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
    }

    return list.sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime());
  }

  public getReservationById(id: string): StockReservationRecord | null {
    const res = this.reservations.get(id);
    return res ? structuredClone(res) : null;
  }

  public getInventorySessionById(id: string): PhysicalInventorySession | null {
    const sess = this.inventorySessions.get(id);
    return sess ? structuredClone(sess) : null;
  }

  public listInventorySessions(supplierId?: string): PhysicalInventorySession[] {
    let list = Array.from(this.inventorySessions.values());
    if (supplierId) {
      list = list.filter((s) => s.supplierId === supplierId);
    }
    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public clear(): void {
    this.movements.clear();
    this.reservations.clear();
    this.inventorySessions.clear();
    this.alerts.clear();
  }
}

// Instance globale par défaut du moteur de stock
export const defaultStockEngine = new CentralStockEngine();
