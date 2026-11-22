// ============================================================================
// TRADELINK V6.0 — LES 25 SERVICES BACKEND & MOTEUR FINANCIER DECIMAL.JS
// Chapitre 10 & Annexe B du Cahier des Charges
// ============================================================================

import Decimal from 'decimal.js';
import {
  CalculationResultRecord,
  DayCountBasis,
  KYCDossier,
  KYCStatus,
  UserRoleCode,
} from '../types';

// Configuration haute précision Decimal.js (Chapitre 6.8 : jamais de flottant binaire)
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export interface BackendServiceDescriptor {
  id: number;
  name: string;
  file: string;
  domain: string;
  status: 'ACTIVE_VERIFIED';
  description: string;
}

export const BACKEND_25_SERVICES: BackendServiceDescriptor[] = [
  { id: 1, name: 'AuthService', file: 'services/auth.service.ts', domain: 'Sécurité', status: 'ACTIVE_VERIFIED', description: 'JWT courte durée, OTP 6 chiffres, hachage Argon2id, inscription et révocation' },
  { id: 2, name: 'MFAService', file: 'services/mfa.service.ts', domain: 'Sécurité', status: 'ACTIVE_VERIFIED', description: 'Configuration et vérification TOTP (obligatoire pour Administrateur)' },
  { id: 3, name: 'KYCService', file: 'services/kyc.service.ts', domain: 'Conformité', status: 'ACTIVE_VERIFIED', description: 'Upload chiffré AES-256-GCM, workflow par juridiction et validation motivée' },
  { id: 4, name: 'KYCCronService', file: 'services/cron/kyc.cron.ts', domain: 'Conformité', status: 'ACTIVE_VERIFIED', description: 'Rappels J+1/J+3/J+5/J+6 et suspension conditionnelle J+7 (protège les dossiers soumis à temps)' },
  { id: 5, name: 'SessionService', file: 'services/session.service.ts', domain: 'Sécurité', status: 'ACTIVE_VERIFIED', description: 'Session unique par utilisateur et invalidation immédiate via Redis' },
  { id: 6, name: 'NotificationService', file: 'services/notification.service.ts', domain: 'Transversal', status: 'ACTIVE_VERIFIED', description: 'Email, SMS, WhatsApp, Telegram selon consentement et préférences' },
  { id: 7, name: 'DocumentService', file: 'services/document.service.ts', domain: 'GED', status: 'ACTIVE_VERIFIED', description: 'Génération PDF, Word, Excel (Factures, CMR, Devis, États financiers)' },
  { id: 8, name: 'AIService', file: 'services/ai.service.ts', domain: 'IA & RAG', status: 'ACTIVE_VERIFIED', description: 'Google Gemini 1.5 Pro & Flash, filtrage RAG strict par rôle et propriété de ressource' },
  { id: 9, name: 'VoiceService', file: 'services/voice.service.ts', domain: 'IA & Voix', status: 'ACTIVE_VERIFIED', description: 'Dictée vocale STT et synthèse TTS trilingue FR/EN/AR avec consentement micro' },
  { id: 10, name: 'OCRService', file: 'services/ocr.service.ts', domain: 'OCR / IDP', status: 'ACTIVE_VERIFIED', description: 'Extraction structurée de textes, tableaux, dates, TVA et totaux' },
  { id: 11, name: 'IDPService', file: 'services/idp.service.ts', domain: 'OCR / IDP', status: 'ACTIVE_VERIFIED', description: 'Proposition de nouveaux champs dynamiques soumis à validation Admin' },
  { id: 12, name: 'CalculationEngine', file: 'services/calc.service.ts', domain: 'Comptabilité', status: 'ACTIVE_VERIFIED', description: 'Calculs financiers déterministes Decimal.js (ACT/365, ACT/360, ACT/ACT bissextile)' },
  { id: 13, name: 'RoomService', file: 'services/room.service.ts', domain: 'Room Live', status: 'ACTIVE_VERIFIED', description: 'Gestion des salles WebRTC/LiveKit SFU, STUN/TURN et restriction de création Client' },
  { id: 14, name: 'MeetingSummaryService', file: 'services/meeting-summary.service.ts', domain: 'Room Live', status: 'ACTIVE_VERIFIED', description: 'Compte rendu IA post-réunion, décisions et export PDF sécurisé' },
  { id: 15, name: 'ImportService', file: 'services/import.service.ts', domain: 'Admin', status: 'ACTIVE_VERIFIED', description: 'Import contrôlé CSV, XLSX, JSON avec validation de schéma' },
  { id: 16, name: 'ImportAdvancedService', file: 'services/import-advanced.service.ts', domain: 'Admin', status: 'ACTIVE_VERIFIED', description: 'Analyse isolée SQL, BAK, DBF et DBF/CDX sans accès production' },
  { id: 17, name: 'ExportService', file: 'services/export.service.ts', domain: 'Admin', status: 'ACTIVE_VERIFIED', description: 'Exports contrôlés et journalisés selon permissions RBAC' },
  { id: 18, name: 'EncryptionService', file: 'services/encryption.service.ts', domain: 'Sécurité', status: 'ACTIVE_VERIFIED', description: 'Chiffrement par enveloppe AES-256-GCM (DEK données + KEK maître)' },
  { id: 19, name: 'KMSService', file: 'services/kms.service.ts', domain: 'Sécurité', status: 'ACTIVE_VERIFIED', description: 'Rotation KEK/DEK via KMS/Vault/HSM sans exposition de clé brute' },
  { id: 20, name: 'BackupService', file: 'services/backup.service.ts', domain: 'Exploitation', status: 'ACTIVE_VERIFIED', description: 'Sauvegardes chiffrées et restauration soumise à double validation Admin' },
  { id: 21, name: 'AuditService', file: 'services/audit.service.ts', domain: 'Conformité', status: 'ACTIVE_VERIFIED', description: 'Journal d’audit append-only immuable avec ID de corrélation' },
  { id: 22, name: 'SandboxService', file: 'services/sandbox.service.ts', domain: 'Sécurité', status: 'ACTIVE_VERIFIED', description: 'Instance éphémère isolée réseau désactivé pour restauration BAK/SQL' },
  { id: 23, name: 'IntegrationService', file: 'services/integration.service.ts', domain: 'Transversal', status: 'ACTIVE_VERIFIED', description: 'Connecteurs SMTP, Stripe, WhatsApp, Google Gemini / Meet, S3/MinIO' },
  { id: 24, name: 'PaymentService', file: 'services/payment.service.ts', domain: 'Finance', status: 'ACTIVE_VERIFIED', description: 'Paiements Stripe/Virements, webhooks signés idempotents et rapprochement' },
  { id: 25, name: 'SecurityScannerService', file: 'services/security-scanner.service.ts', domain: 'Sécurité', status: 'ACTIVE_VERIFIED', description: 'Scan antivirus fichiers, SHA-256 checksum et prévention SSRF/IDOR/XSS' },
];

// ============================================================================
// SERVICE 12 : MOTEUR DE CALCUL FINANCIER DÉTERMINISTE (Decimal.js)
// Formule : Montant × (Taux / 100) × Nombre de jours / Base annuelle
// Base par défaut : ACT/365 ; options : ACT/360 et ACT/ACT (gestion bissextile)
// ============================================================================

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function calculateFinancialInterest(params: {
  principalStr: string;
  annualRatePctStr: string;
  startDateStr: string;
  endDateStr: string;
  basis: DayCountBasis;
  currency?: string;
  executedBy?: string;
  ruleVersion?: string;
}): CalculationResultRecord {
  const principal = new Decimal(params.principalStr || '0');
  const ratePct = new Decimal(params.annualRatePctStr || '0');
  const start = new Date(params.startDateStr);
  const end = new Date(params.endDateStr);

  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const daysCount = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const leapDetected = isLeapYear(startYear) || isLeapYear(endYear);

  let annualDivisor = 365;
  let interest: Decimal;
  const rateDecimal = ratePct.dividedBy(100);

  if (params.basis === 'ACT/360') {
    annualDivisor = 360;
    interest = principal
      .times(rateDecimal)
      .times(daysCount)
      .dividedBy(annualDivisor)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else if (params.basis === 'ACT/365') {
    annualDivisor = 365;
    interest = principal
      .times(rateDecimal)
      .times(daysCount)
      .dividedBy(annualDivisor)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else {
    // Convention financière internationale ACT/ACT (ICMA / ISDA) mono & multi-années
    if (startYear === endYear) {
      annualDivisor = isLeapYear(startYear) ? 366 : 365;
      interest = principal
        .times(rateDecimal)
        .times(daysCount)
        .dividedBy(annualDivisor)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    } else {
      // Décomposition par tranche d'année civile avec diviseur spécifique (365 ou 366)
      let weightedDaysFraction = new Decimal(0);
      for (let y = startYear; y <= endYear; y++) {
        const yIsLeap = isLeapYear(y);
        const yDays = yIsLeap ? 366 : 365;
        const curYearStart = new Date(Date.UTC(y, 0, 1));
        const curYearEnd = new Date(Date.UTC(y + 1, 0, 1)); // Début année suivante

        const segStart = start.getTime() > curYearStart.getTime() ? start : curYearStart;
        const segEnd = end.getTime() < curYearEnd.getTime() ? end : curYearEnd;

        if (segEnd.getTime() > segStart.getTime()) {
          const segDays = Math.round((segEnd.getTime() - segStart.getTime()) / (1000 * 60 * 60 * 24));
          weightedDaysFraction = weightedDaysFraction.plus(new Decimal(segDays).dividedBy(yDays));
        }
      }
      annualDivisor = leapDetected ? 366 : 365;
      interest = principal
        .times(rateDecimal)
        .times(weightedDaysFraction)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
  }

  const total = principal.plus(interest).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    id: `CALC-${Date.now().toString().slice(-6)}`,
    ruleVersion: params.ruleVersion ?? 'RULE-FIN-V6.2 (Decimal.js)',
    principal: principal.toFixed(2),
    annualRatePct: ratePct.toFixed(4),
    startDate: params.startDateStr,
    endDate: params.endDateStr,
    daysCount,
    basis: params.basis,
    annualDivisor,
    isLeapYearDetected: leapDetected,
    interestAmount: interest.toFixed(2),
    totalAmount: total.toFixed(2),
    currency: params.currency ?? 'EUR',
    executedBy: params.executedBy ?? 'Comptable Stage 3',
    executedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
}

// ============================================================================
// SERVICE 3 & 4 : RÈGLE MÉTIER KYC J+1 / J+3 / J+5 / J+6 / J+7
// Règle critique Annexe B :
// "À J+7, suspension uniquement si les documents obligatoires n'ont pas été soumis
// dans le délai. Si les documents ont été soumis à temps et sont en attente de revue
// administrative, aucune suspension automatique ne doit être déclenchée."
// ============================================================================

export function evaluateKYCDossierRule(dossier: KYCDossier): {
  computedStatus: KYCStatus;
  nextReminder: string | null;
  protectedFromAutoSuspension: boolean;
  explanation: string;
} {
  if (dossier.status === 'VALIDATED') {
    return {
      computedStatus: 'VALIDATED',
      nextReminder: null,
      protectedFromAutoSuspension: true,
      explanation: 'Dossier validé par un administrateur habilité.',
    };
  }
  if (dossier.submittedAt) {
    return {
      computedStatus: 'SUBMITTED_IN_TIME_PENDING_REVIEW',
      nextReminder: null,
      protectedFromAutoSuspension: true,
      explanation:
        'Pièces obligatoires soumises dans le délai de 7 jours. Aucune suspension automatique J+7 ne peut être déclenchée pendant la revue administrative.',
    };
  }
  if (dossier.daysElapsed >= 7) {
    return {
      computedStatus: 'SUSPENDED_J7',
      nextReminder: 'Échéance J+7 dépassée',
      protectedFromAutoSuspension: false,
      explanation:
        'Suspension automatique déclenchée à J+7 : documents obligatoires non transmis malgré les rappels J+1, J+3, J+5 et J+6.',
    };
  }
  const reminderSteps = [1, 3, 5, 6];
  const nextStep = reminderSteps.find((d) => d > dossier.daysElapsed);
  return {
    computedStatus: 'PENDING_SUBMISSION',
    nextReminder: nextStep ? `J+${nextStep}` : 'Échéance J+7 demain',
    protectedFromAutoSuspension: false,
    explanation: `En attente des pièces justificatives (${7 - dossier.daysElapsed} jour(s) restant(s) avant J+7).`,
  };
}

// ============================================================================
// SERVICE 13 : RÈGLE MÉTIER ROOM LIVE PAR RÔLE
// "Tous les acteurs opérationnels autorisés, à l'exception du client en création
// générale, peuvent créer une Room Live."
// ============================================================================

export function canCreateRoomLiveGeneral(role: UserRoleCode): boolean {
  return ['ADMIN', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT'].includes(role);
}

// ============================================================================
// SERVICE 20 : DOUBLE VALIDATION ADMIN (INTERDICTION D'AUTO-APPROBATION)
// "Deux administrateurs distincts doivent approuver l'opération. L'initiateur ne peut
// pas approuver sa propre demande."
// ============================================================================

export function validateDualAdminApproval(initiatorId: string, approverId: string): {
  allowed: boolean;
  reason: string;
} {
  if (initiatorId === approverId) {
    return {
      allowed: false,
      reason:
        'Refusé (Sécurité Chapitre 7.3) : Un administrateur ne peut jamais s’auto-approuver une opération soumise à double validation.',
    };
  }
  return {
    allowed: true,
    reason: 'Double validation conforme : second administrateur distinct vérifié.',
  };
}

// ============================================================================
// SERVICE 23 & 24 : RÉSILIENCE APIS EXTERNES, TIMEOUTS & RETRIES AVEC EXPONENTIAL BACKOFF
// Protège Stripe, Google Gemini, Google Meet et SMTP contre les ralentissements réseau
// ============================================================================

export interface RetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
}

export async function executeWithTimeoutAndRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { timeoutMs = 5000, maxRetries = 3, backoffMs = 200 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await operation(controller.signal);
      clearTimeout(timer);
      return result;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        // Exponentielle avec jitter
        const delay = backoffMs * Math.pow(2, attempt - 1) + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Échec opération externe après ${maxRetries} tentatives. Dernier message : ${
      (lastError as Error)?.message || 'Timeout'
    }`
  );
}

// ============================================================================
// MESURE DES PERFORMANCES APM / RUM & OPENTELEMETRY
// Cible : Latence < 200 ms, traçabilité des opérations
// ============================================================================

export interface PerformanceMetricPoint {
  operation: string;
  durationMs: number;
  success: boolean;
  timestamp: number;
}

class TelemetryCollector {
  private metrics: PerformanceMetricPoint[] = [];

  public record(operation: string, durationMs: number, success = true) {
    this.metrics.push({ operation, durationMs, success, timestamp: Date.now() });
    if (this.metrics.length > 5000) {
      this.metrics.splice(0, 1000); // Nettoyage de mémoire circulaire
    }
  }

  public getSummary(operation?: string): {
    count: number;
    avgMs: number;
    p95Ms: number;
    maxMs: number;
    successRatePct: number;
  } {
    const subset = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;
    if (subset.length === 0) {
      return { count: 0, avgMs: 0, p95Ms: 0, maxMs: 0, successRatePct: 100 };
    }
    const durations = subset.map((s) => s.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
    const successCount = subset.filter((s) => s.success).length;

    return {
      count: subset.length,
      avgMs: Number((sum / durations.length).toFixed(2)),
      p95Ms: Number(durations[p95Index].toFixed(2)),
      maxMs: Number(durations[durations.length - 1].toFixed(2)),
      successRatePct: Number(((successCount / subset.length) * 100).toFixed(1)),
    };
  }
}

export const APM_TELEMETRY = new TelemetryCollector();
