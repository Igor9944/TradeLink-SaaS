// ============================================================================
// TRADELINK V6.0 — COUCHE REPOSITORIES, SOFT-DELETE & TRANSACTIONS ATOMIQUES
// Conforme à PROMPTS 4, 7, 8 & 9 :
// - Séparation stricte entre données persistées en base PostgreSQL et données Sandbox
// - Suppressions logiques (deletedAt) filtrées par défaut
// - Transactions atomiques (rollback intégral en cas d'erreur)
// - Support complet des agrégats Commerciaux, Logistiques et Comptables
// ============================================================================

import {
  AuditLogRecord,
  BackupRecord,
  CalculationResultRecord,
  IncidentRecord,
  InvoiceRecord,
  KYCDossier,
  OrderRecord,
  PaymentRecord,
  ProductItem,
  QuoteRecord,
  RoomLiveRecord,
  ShipmentRecord,
} from '../../types';
import { PaginationAndFilterParams } from '../validators/schema.validator';
import { StockMovementRecord } from '../../services/commercialEngine';
import {
  INITIAL_CARRIER_VEHICLES,
  LogisticsMissionRecord,
  TransportDocumentRecord,
  VehicleRecord,
} from '../../services/logisticsEngine';
import { AccountingEntryRecord } from '../../services/accountingEngine';

export interface SoftDeletableEntity {
  id: string;
  deletedAt?: string | null;
}

export interface DatabaseStateSnapshot {
  products: (ProductItem & { deletedAt?: string | null })[];
  orders: (OrderRecord & { deletedAt?: string | null })[];
  kycDossiers: KYCDossier[];
  backups: BackupRecord[];
  rooms: (RoomLiveRecord & { deletedAt?: string | null })[];
  calcHistory: CalculationResultRecord[];
  auditLogs: AuditLogRecord[];
  quotes?: QuoteRecord[];
  invoices?: InvoiceRecord[];
  payments?: PaymentRecord[];
  shipments?: ShipmentRecord[];
  incidents?: IncidentRecord[];
  stockMovements?: StockMovementRecord[];
  accountingEntries?: AccountingEntryRecord[];
  logisticsMissions?: LogisticsMissionRecord[];
  vehicles?: VehicleRecord[];
  transportDocuments?: TransportDocumentRecord[];
}

export class TradeLinkRepositoryStore {
  private state: Required<DatabaseStateSnapshot>;
  public readonly isProductionDatabaseConnected: boolean;

  constructor(initialState: DatabaseStateSnapshot, isProdDbConnected = false) {
    this.state = structuredClone({
      ...initialState,
      quotes: initialState.quotes ?? [],
      invoices: initialState.invoices ?? [],
      payments: initialState.payments ?? [],
      shipments: initialState.shipments ?? [],
      incidents: initialState.incidents ?? [],
      stockMovements: initialState.stockMovements ?? [],
      accountingEntries: initialState.accountingEntries ?? [],
      logisticsMissions: initialState.logisticsMissions ?? [],
      vehicles:
        initialState.vehicles && initialState.vehicles.length > 0
          ? initialState.vehicles
          : structuredClone(INITIAL_CARRIER_VEHICLES),
      transportDocuments: initialState.transportDocuments ?? [],
    });
    this.isProductionDatabaseConnected = isProdDbConnected;
  }

  // Exécute une transaction atomique avec rollback intégral en cas d'exception
  public executeTransaction<R>(work: (tx: Required<DatabaseStateSnapshot>) => R): R {
    const snapshotBefore = structuredClone(this.state);
    try {
      const result = work(this.state);
      return result;
    } catch (error) {
      // Rollback atomique de toutes les mutations de la transaction
      this.state = snapshotBefore;
      throw error;
    }
  }

  public getActiveProducts(params: PaginationAndFilterParams) {
    const active = this.state.products.filter((p) => !p.deletedAt);
    const filtered = params.search
      ? active.filter(
          (p) =>
            p.sku.toLowerCase().includes(params.search!.toLowerCase()) ||
            p.name.fr.toLowerCase().includes(params.search!.toLowerCase()) ||
            p.category.toLowerCase().includes(params.search!.toLowerCase())
        )
      : active;
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
    const items = filtered.slice((params.page - 1) * params.limit, params.page * params.limit);
    return { items, page: params.page, limit: params.limit, totalItems, totalPages };
  }

  public findActiveProductById(id: string) {
    return this.state.products.find((p) => p.id === id && !p.deletedAt) ?? null;
  }

  public softDeleteProduct(id: string): boolean {
    const prod = this.state.products.find((p) => p.id === id && !p.deletedAt);
    if (!prod) return false;
    prod.deletedAt = new Date().toISOString();
    return true;
  }

  public getActiveOrdersForActor(actorId: string, role: string, params: PaginationAndFilterParams) {
    const active = this.state.orders.filter((o) => !o.deletedAt);
    const scoped =
      role === 'ADMIN' || role === 'COMPTABLE'
        ? active
        : role === 'CLIENT'
        ? active.filter((o) => o.clientId === actorId)
        : role === 'FOURNISSEUR'
        ? active.filter((o) => o.supplierId === actorId)
        : active;
    const filtered = params.status
      ? scoped.filter((o) => o.status === params.status)
      : scoped;
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
    const items = filtered.slice((params.page - 1) * params.limit, params.page * params.limit);
    return { items, page: params.page, limit: params.limit, totalItems, totalPages };
  }

  public findActiveOrderById(id: string) {
    return this.state.orders.find((o) => o.id === id && !o.deletedAt) ?? null;
  }

  public getSnapshot(): Readonly<Required<DatabaseStateSnapshot>> {
    return this.state;
  }
}
