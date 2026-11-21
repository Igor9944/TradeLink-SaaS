// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import type {
  NotificationRecord,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationPreferencesRecord,
  NotificationDispatchResult,
  NotificationDispatchChannelResult,
} from '../types';

// ============================================================================
// DÉDUPLICATEUR INTELLIGENT DE NOTIFICATIONS (Fenêtre glissante 5 minutes)
// ============================================================================

export class NotificationDeduplicator {
  private recentKeys: Map<string, number> = new Map();
  private readonly windowMs: number;

  constructor(windowMs = 5 * 60 * 1000) {
    this.windowMs = windowMs;
  }

  public shouldSuppress(key?: string, now = Date.now()): boolean {
    if (!key) return false;
    const lastSeen = this.recentKeys.get(key);
    if (lastSeen && now - lastSeen < this.windowMs) {
      return true;
    }
    this.recentKeys.set(key, now);
    this.cleanupOldEntries(now);
    return false;
  }

  public clear(): void {
    this.recentKeys.clear();
  }

  private cleanupOldEntries(now: number): void {
    if (this.recentKeys.size > 2000) {
      for (const [k, timestamp] of this.recentKeys.entries()) {
        if (now - timestamp > this.windowMs) {
          this.recentKeys.delete(k);
        }
      }
    }
  }
}

// ============================================================================
// GESTIONNAIRE D'HEURES SILENCIEUSES (Quiet Hours)
// ============================================================================

export class QuietHoursManager {
  /**
   * Vérifie si l'heure donnée (ou l'heure courante) se situe dans la plage silencieuse.
   * Gère les plages chevauchant minuit (ex: "22:00" à "08:00").
   */
  public static isInQuietHours(
    startHourMin: string,
    endHourMin: string,
    date = new Date()
  ): boolean {
    if (!startHourMin || !endHourMin) return false;

    const [startH, startM] = startHourMin.split(':').map(Number);
    const [endH, endM] = endHourMin.split(':').map(Number);

    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      // Ex: 13:00 à 15:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Ex: 22:00 à 08:00 (traverse minuit)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }
}

// ============================================================================
// MOTEUR DE GABARITS & FORMATAGE MULTI-CANAUX (Email, Push, SMS)
// ============================================================================

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
  from: string;
  to: string;
}

export interface WebPushPayloadOutput {
  title: string;
  body: string;
  icon: string;
  badge: string;
  data: {
    actionUrl?: string;
    notificationId: string;
    category: NotificationCategory;
    priority: NotificationPriority;
  };
}

export interface SmsPayloadOutput {
  to: string;
  body: string;
  characterCount: number;
  isTruncated: boolean;
  provider: 'TWILIO' | 'INFOBIP' | 'ORANGE_API';
}

export class NotificationTemplateEngine {
  public static renderEmail(
    notification: NotificationRecord,
    recipientEmail: string,
    recipientName = 'Utilisateur TRADELINK'
  ): EmailRenderOutput {
    const priorityColor =
      notification.priority === 'CRITICAL'
        ? '#DC2626'
        : notification.priority === 'HIGH'
        ? '#EA580C'
        : '#0D9488';

    const subject = `[TRADELINK ${notification.category}] ${notification.title}`;
    const actionButton = notification.actionUrl
      ? `<div style="margin: 28px 0; text-align: center;">
          <a href="${notification.actionUrl}" style="background-color: #E85D22; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Accéder à l'action &rarr;
          </a>
        </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${notification.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr style="background-color: #0A2540;">
            <td style="padding: 24px 32px;">
              <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">TRADELINK</span>
              <span style="color: #94A3B8; font-size: 13px; margin-left: 8px;">V6.0 SaaS Hub</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: ${priorityColor}15; color: ${priorityColor}; text-transform: uppercase; margin-bottom: 12px;">
                ${notification.category} • ${notification.priority}
              </div>
              <h2 style="font-size: 18px; color: #0F172A; margin: 0 0 16px 0; font-weight: 600;">${notification.title}</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Bonjour ${recipientName},
              </p>
              <div style="background-color: #F8FAFC; border-left: 4px solid ${priorityColor}; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0;">
                  ${notification.body}
                </p>
              </div>
              ${actionButton}
              <hr style="border: none; border-top: 1px solid #F1F5F9; margin: 24px 0;" />
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                ID Notification : <code style="background-color: #F1F5F9; padding: 2px 4px; border-radius: 4px;">${notification.id}</code><br>
                Date de notification : ${notification.createdAt}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
            <td style="padding: 20px 32px; font-size: 11px; color: #64748B; text-align: center;">
              Cet email a été envoyé automatiquement par la plateforme TRADELINK V6.0 conformément à vos préférences.<br>
              Pour configurer vos notifications ou vous désinscrire, accédez à votre profil sécurisé.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `[TRADELINK V6.0 — ${notification.category} / ${notification.priority}]\n\n` +
      `${notification.title}\n\n` +
      `Bonjour ${recipientName},\n\n` +
      `${notification.body}\n\n` +
      (notification.actionUrl ? `Lien d'action : ${notification.actionUrl}\n\n` : '') +
      `ID Notification : ${notification.id} | Date : ${notification.createdAt}\n`;

    return {
      subject,
      html,
      text,
      from: 'notifications@tradelink-saas.com',
      to: recipientEmail,
    };
  }

  public static renderWebPush(notification: NotificationRecord): WebPushPayloadOutput {
    return {
      title: `[TRADELINK] ${notification.title}`,
      body: notification.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        actionUrl: notification.actionUrl,
        notificationId: notification.id,
        category: notification.category,
        priority: notification.priority,
      },
    };
  }

  public static renderSms(
    notification: NotificationRecord,
    phoneNumber: string
  ): SmsPayloadOutput {
    const prefix = `[TRADELINK] `;
    const linkSuffix = notification.actionUrl ? ` trd.lk/a` : '';
    const maxAvailable = 160 - prefix.length - linkSuffix.length;

    let cleanTitle = notification.title.trim();
    let cleanBody = notification.body.trim();
    let combined = `${cleanTitle}: ${cleanBody}`;

    let isTruncated = false;
    if (combined.length > maxAvailable) {
      combined = combined.slice(0, maxAvailable - 3) + '...';
      isTruncated = true;
    }

    const fullMessage = `${prefix}${combined}${linkSuffix}`;

    return {
      to: phoneNumber,
      body: fullMessage,
      characterCount: fullMessage.length,
      isTruncated,
      provider: 'TWILIO',
    };
  }
}

// ============================================================================
// GESTIONNAIRE DE FILE D'ATTENTE ASYNCHRONE (Retry Backoff)
// ============================================================================

export interface NotificationQueueJob {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  payload: any;
  attempts: number;
  maxAttempts: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  nextRetryAt?: number;
  error?: string;
}

export class NotificationJobQueue {
  private jobs: NotificationQueueJob[] = [];

  public enqueue(
    notificationId: string,
    channel: NotificationChannel,
    payload: any,
    maxAttempts = 3
  ): NotificationQueueJob {
    const job: NotificationQueueJob = {
      id: `job-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      notificationId,
      channel,
      payload,
      attempts: 0,
      maxAttempts,
      status: 'PENDING',
    };
    this.jobs.push(job);
    return job;
  }

  public listPending(): NotificationQueueJob[] {
    return this.jobs.filter((j) => j.status === 'PENDING');
  }

  public processNext(
    jobId: string,
    executeFn: () => Promise<boolean> | boolean
  ): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    job.attempts += 1;
    try {
      const ok = executeFn();
      if (ok) {
        job.status = 'SUCCESS';
        return true;
      }
    } catch (err: any) {
      job.error = err?.message || 'Gateway error';
    }

    if (job.attempts >= job.maxAttempts) {
      job.status = 'FAILED';
    } else {
      job.nextRetryAt = Date.now() + Math.pow(2, job.attempts) * 1000;
    }
    return false;
  }

  public getJobs(): NotificationQueueJob[] {
    return [...this.jobs];
  }
}

// ============================================================================
// SERVICE CENTRAL DISPATCHER DE NOTIFICATIONS
// ============================================================================

export class CentralNotificationDispatcher {
  private deduplicator: NotificationDeduplicator;
  private jobQueue: NotificationJobQueue;
  private persistenceListeners: Array<(notification: NotificationRecord) => void> = [];

  constructor() {
    this.deduplicator = new NotificationDeduplicator(5 * 60 * 1000); // 5 min
    this.jobQueue = new NotificationJobQueue();
  }

  public registerPersistenceListener(listener: (notification: NotificationRecord) => void): void {
    this.persistenceListeners.push(listener);
  }

  public getDeduplicator(): NotificationDeduplicator {
    return this.deduplicator;
  }

  public getJobQueue(): NotificationJobQueue {
    return this.jobQueue;
  }

  /**
   * Dispatch central d'une notification avec tous les filtres :
   * - Déduplication intelligente
   * - Préférences utilisateur (canaux et catégories)
   * - Heures silencieuses (sauf priorité CRITICAL)
   */
  public dispatch(params: {
    notification: NotificationRecord;
    preferences?: NotificationPreferencesRecord;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientName?: string;
    currentTime?: Date;
  }): NotificationDispatchResult {
    const {
      notification,
      preferences,
      recipientEmail,
      recipientPhone,
      recipientName,
      currentTime = new Date(),
    } = params;

    // 1. Déduplication
    if (notification.deduplicationKey) {
      const suppressed = this.deduplicator.shouldSuppress(
        notification.deduplicationKey,
        currentTime.getTime()
      );
      if (suppressed) {
        return {
          notification,
          dispatchedChannels: notification.channels.map((ch) => ({
            channel: ch,
            status: 'QUEUED',
            error: 'Deduplicated (recent identical notification within 5 min window)',
          })),
          isDeduplicated: true,
        };
      }
    }

    // 2. Vérification de la catégorie dans les préférences
    if (preferences && preferences.enabledCategories[notification.category] === false) {
      return {
        notification,
        dispatchedChannels: notification.channels.map((ch) => ({
          channel: ch,
          status: 'DISABLED',
          error: `Category "${notification.category}" disabled by user preferences`,
        })),
        isDeduplicated: false,
      };
    }

    // 3. Calcul des heures silencieuses
    const isQuiet =
      preferences?.quietHoursEnabled &&
      QuietHoursManager.isInQuietHours(
        preferences.quietHoursStart,
        preferences.quietHoursEnd,
        currentTime
      );

    // Dérogation absolue si priorité critique
    const bypassQuietHours = notification.priority === 'CRITICAL';

    const dispatchedChannels: NotificationDispatchChannelResult[] = [];

    for (const channel of notification.channels) {
      // Vérification canal activé par l'utilisateur
      if (preferences && preferences.enabledChannels[channel] === false) {
        dispatchedChannels.push({
          channel,
          status: 'DISABLED',
          error: `Channel ${channel} disabled in preferences`,
        });
        continue;
      }

      // Filtrage Quiet Hours pour les canaux intrusifs (EMAIL, SMS, WEB_PUSH)
      if (isQuiet && !bypassQuietHours && channel !== 'IN_APP') {
        dispatchedChannels.push({
          channel,
          status: 'SUPPRESSED_QUIET_HOURS',
          error: `Suppressed during quiet hours (${preferences?.quietHoursStart} - ${preferences?.quietHoursEnd})`,
        });
        continue;
      }

      // Envoi effectif selon le canal
      switch (channel) {
        case 'IN_APP':
          dispatchedChannels.push({
            channel: 'IN_APP',
            status: 'DELIVERED',
            deliveredAt: currentTime.toISOString(),
          });
          break;

        case 'EMAIL':
          if (recipientEmail) {
            const emailOutput = NotificationTemplateEngine.renderEmail(
              notification,
              recipientEmail,
              recipientName
            );
            this.jobQueue.enqueue(notification.id, 'EMAIL', emailOutput);
            dispatchedChannels.push({
              channel: 'EMAIL',
              status: 'DELIVERED',
              deliveredAt: currentTime.toISOString(),
              gatewayPayload: { to: recipientEmail, subject: emailOutput.subject },
            });
          } else {
            dispatchedChannels.push({
              channel: 'EMAIL',
              status: 'FAILED',
              error: 'Recipient email address missing',
            });
          }
          break;

        case 'WEB_PUSH':
          const pushPayload = NotificationTemplateEngine.renderWebPush(notification);
          this.jobQueue.enqueue(notification.id, 'WEB_PUSH', pushPayload);
          dispatchedChannels.push({
            channel: 'WEB_PUSH',
            status: 'DELIVERED',
            deliveredAt: currentTime.toISOString(),
            gatewayPayload: pushPayload,
          });
          break;

        case 'SMS':
          const phone = recipientPhone || preferences?.smsPhoneNumber;
          if (phone) {
            const smsPayload = NotificationTemplateEngine.renderSms(notification, phone);
            this.jobQueue.enqueue(notification.id, 'SMS', smsPayload);
            dispatchedChannels.push({
              channel: 'SMS',
              status: 'DELIVERED',
              deliveredAt: currentTime.toISOString(),
              gatewayPayload: smsPayload,
            });
          } else {
            dispatchedChannels.push({
              channel: 'SMS',
              status: 'FAILED',
              error: 'Recipient phone number missing for SMS channel',
            });
          }
          break;
      }
    }

    const inAppDelivered = dispatchedChannels.some(
      (c) => c.channel === 'IN_APP' && c.status === 'DELIVERED'
    );
    if (inAppDelivered) {
      for (const listener of this.persistenceListeners) {
        try {
          listener(notification);
        } catch {
          // Ne jamais bloquer l'exécution métier si un listener échoue
        }
      }
    }

    return {
      notification,
      dispatchedChannels,
      isDeduplicated: false,
    };
  }

  // ==========================================================================
  // ÉVÉNEMENTS DÉCLENCHEURS MÉTIERS SPÉCIFIQUES
  // ==========================================================================

  public createAuthNotification(params: {
    userId: string;
    eventType: 'REGISTRATION_SUCCESS' | 'PASSWORD_RESET' | 'MFA_ENABLED' | 'NEW_LOGIN_DEVICE';
    details?: string;
  }): NotificationRecord {
    const titles = {
      REGISTRATION_SUCCESS: 'Bienvenue sur TRADELINK V6.0',
      PASSWORD_RESET: 'Votre mot de passe a été réinitialisé',
      MFA_ENABLED: 'Authentification à deux facteurs (MFA) configurée',
      NEW_LOGIN_DEVICE: 'Nouvelle connexion détectée sur votre compte',
    };

    const isSecurityAlert =
      params.eventType === 'NEW_LOGIN_DEVICE' || params.eventType === 'PASSWORD_RESET';

    return {
      id: `notif-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'SÉCURITÉ',
      priority: isSecurityAlert ? 'HIGH' : 'LOW',
      title: titles[params.eventType],
      body: params.details || `Événement d'authentification ${params.eventType} validé.`,
      channels: ['IN_APP', 'EMAIL'],
      actionUrl: '/security',
      isRead: false,
      deduplicationKey: `${params.userId}:AUTH:${params.eventType}`,
      icon: 'secure-parcel',
      createdAt: new Date().toISOString(),
    };
  }

  public createKycNotification(params: {
    userId: string;
    milestone: 'DOCUMENT_UPLOADED' | 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'J+1' | 'J+3' | 'J+5' | 'J+6' | 'J+7';
    reason?: string;
    daysRemaining?: number;
  }): NotificationRecord {
    const isCritical = params.milestone === 'J+7' || params.milestone === 'REJECTED';
    const isReminder = ['J+1', 'J+3', 'J+5', 'J+6'].includes(params.milestone);

    let title = `Mise à jour de votre dossier KYC (${params.milestone})`;
    let body = `Le statut de votre vérification KYC est : ${params.milestone}.`;

    if (params.milestone === 'DOCUMENT_UPLOADED') {
      title = 'Nouveau document KYC téléversé avec succès';
      body = 'Votre document a été chiffré KMS AES-256 et placé dans le coffre d’analyse.';
    } else if (params.milestone === 'VALIDATED') {
      title = 'Félicitations ! Votre dossier KYC est validé';
      body = 'Votre compte entreprise est désormais certifié et pleinement opérationnel sur TRADELINK.';
    } else if (params.milestone === 'REJECTED') {
      title = 'Dossier KYC rejeté par le service conformité';
      body = params.reason ? `Motif de rejet : ${params.reason}` : 'Votre dossier a été refusé.';
    } else if (params.milestone === 'COMPLEMENT_REQUESTED') {
      title = 'Complément de pièces demandé pour votre KYC';
      body = params.reason ? `Pièces requises : ${params.reason}` : 'Des justificatifs supplémentaires sont requis.';
    } else if (isReminder) {
      title = `Rappel KYC (${params.milestone}) : ${params.daysRemaining ?? 'quelques'} jour(s) restant(s)`;
      body = `Veuillez soumettre vos justificatifs légaux avant l'échéance des 7 jours pour éviter la suspension.`;
    } else if (params.milestone === 'J+7') {
      title = 'Alerte KYC : Délai de 7 jours dépassé — Compte suspendu';
      body = 'Le délai de soumission est expiré. Votre compte a été suspendu par mesure de conformité légale.';
    }

    return {
      id: `notif-kyc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'KYC',
      priority: isCritical ? 'CRITICAL' : isReminder ? 'HIGH' : 'MEDIUM',
      title,
      body,
      channels: ['IN_APP', 'EMAIL', 'SMS', 'WEB_PUSH'],
      actionUrl: '/kyc',
      isRead: false,
      deduplicationKey: `${params.userId}:KYC:${params.milestone}`,
      icon: 'customs-stamp',
      createdAt: new Date().toISOString(),
    };
  }

  public createOrderNotification(params: {
    userId: string;
    orderNumber: string;
    status: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    totalAmount?: string;
    currency?: string;
  }): NotificationRecord {
    const titles = {
      CREATED: `Nouvelle commande enregistrée (${params.orderNumber})`,
      CONFIRMED: `Commande ${params.orderNumber} confirmée par le fournisseur`,
      PREPARING: `Préparation en entrepôt (${params.orderNumber})`,
      SHIPPED: `Commande ${params.orderNumber} expédiée avec succès`,
      DELIVERED: `Commande ${params.orderNumber} livrée et émargée`,
      CANCELLED: `Commande ${params.orderNumber} annulée`,
    };

    return {
      id: `notif-ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'COMMERCIAL',
      priority: params.status === 'CANCELLED' ? 'HIGH' : 'MEDIUM',
      title: titles[params.status],
      body: `Commande ${params.orderNumber} — statut actuel : ${params.status}. Montant : ${params.totalAmount || '0.00'} ${params.currency || 'EUR'}.`,
      channels: ['IN_APP', 'EMAIL', 'WEB_PUSH'],
      actionUrl: `/orders/${params.orderNumber}`,
      isRead: false,
      deduplicationKey: `${params.userId}:ORDER:${params.orderNumber}:${params.status}`,
      icon: 'parcel-stack',
      createdAt: new Date().toISOString(),
    };
  }

  public createQuoteNotification(params: {
    userId: string;
    quoteNumber: string;
    action: 'REQUESTED' | 'PRICE_OFFERED' | 'ACCEPTED' | 'REJECTED';
  }): NotificationRecord {
    const titles = {
      REQUESTED: `Nouvelle demande de devis RFQ (${params.quoteNumber})`,
      PRICE_OFFERED: `Offre commerciale reçue pour le devis ${params.quoteNumber}`,
      ACCEPTED: `Devis ${params.quoteNumber} accepté par le client`,
      REJECTED: `Devis ${params.quoteNumber} décliné`,
    };

    return {
      id: `notif-quo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'COMMERCIAL',
      priority: 'MEDIUM',
      title: titles[params.action],
      body: `Devis ${params.quoteNumber} mis à jour : ${params.action}.`,
      channels: ['IN_APP', 'EMAIL'],
      actionUrl: `/quotes/${params.quoteNumber}`,
      isRead: false,
      deduplicationKey: `${params.userId}:QUOTE:${params.quoteNumber}:${params.action}`,
      icon: 'checklist',
      createdAt: new Date().toISOString(),
    };
  }

  public createPaymentNotification(params: {
    userId: string;
    invoiceNumber: string;
    status: 'ESCROW_HELD' | 'PAYMENT_RECEIVED' | 'REFUNDED' | 'DISPUTED';
    amount: string;
    currency: string;
  }): NotificationRecord {
    const titles = {
      ESCROW_HELD: `Fonds sécurisés sous séquestre Escrow (${params.amount} ${params.currency})`,
      PAYMENT_RECEIVED: `Paiement reçu pour la facture ${params.invoiceNumber}`,
      REFUNDED: `Remboursement exécuté pour la facture ${params.invoiceNumber}`,
      DISPUTED: `Litige de paiement signalé sur la facture ${params.invoiceNumber}`,
    };

    return {
      id: `notif-pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'FINANCE',
      priority: params.status === 'DISPUTED' ? 'CRITICAL' : 'HIGH',
      title: titles[params.status],
      body: `Montant : ${params.amount} ${params.currency}. Facture de référence : ${params.invoiceNumber}.`,
      channels: ['IN_APP', 'EMAIL', 'WEB_PUSH'],
      actionUrl: `/invoices/${params.invoiceNumber}`,
      isRead: false,
      deduplicationKey: `${params.userId}:PAYMENT:${params.invoiceNumber}:${params.status}`,
      icon: 'payment',
      createdAt: new Date().toISOString(),
    };
  }

  public createShipmentNotification(params: {
    userId: string;
    trackingNumber: string;
    status: 'IN_TRANSIT' | 'TEMPERATURE_ALERT' | 'POD_SIGNED' | 'DELAY';
    details?: string;
  }): NotificationRecord {
    const isCritical = params.status === 'TEMPERATURE_ALERT';

    return {
      id: `notif-shp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'LOGISTIQUE',
      priority: isCritical ? 'CRITICAL' : 'MEDIUM',
      title: `Expédition ${params.trackingNumber} — ${params.status}`,
      body: params.details || `Mise à jour logistique : statut ${params.status}.`,
      channels: ['IN_APP', 'EMAIL', 'SMS', 'WEB_PUSH'],
      actionUrl: `/shipments/${params.trackingNumber}`,
      isRead: false,
      deduplicationKey: `${params.userId}:SHIPMENT:${params.trackingNumber}:${params.status}`,
      icon: 'delivery-van',
      createdAt: new Date().toISOString(),
    };
  }

  public createIncidentNotification(params: {
    userId: string;
    incidentId: string;
    severity: NotificationPriority;
    title: string;
    description: string;
  }): NotificationRecord {
    return {
      id: `notif-inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'LOGISTIQUE',
      priority: params.severity,
      title: `Incident Logistique : ${params.title}`,
      body: params.description,
      channels: ['IN_APP', 'EMAIL', 'SMS'],
      actionUrl: `/incidents/${params.incidentId}`,
      isRead: false,
      deduplicationKey: `${params.userId}:INCIDENT:${params.incidentId}`,
      icon: 'hazardous-goods',
      createdAt: new Date().toISOString(),
    };
  }

  public createMessageNotification(params: {
    userId: string;
    conversationId: string;
    senderName: string;
    snippet: string;
  }): NotificationRecord {
    return {
      id: `notif-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'MESSAGE',
      priority: 'MEDIUM',
      title: `Nouveau message de ${params.senderName}`,
      body: params.snippet,
      channels: ['IN_APP', 'WEB_PUSH', 'EMAIL'],
      actionUrl: `/messaging?conversation=${params.conversationId}`,
      isRead: false,
      deduplicationKey: `${params.userId}:MSG:${params.conversationId}:${Date.now()}`,
      icon: 'mailbox',
      createdAt: new Date().toISOString(),
    };
  }

  public createRoomLiveNotification(params: {
    userId: string;
    roomCode: string;
    roomTitle: string;
    eventType: 'INVITATION' | 'STARTING_SOON' | 'RECORDING_READY';
  }): NotificationRecord {
    const titles = {
      INVITATION: `Invitation à la Room Live : ${params.roomTitle}`,
      STARTING_SOON: `Rappel : La Room Live ${params.roomTitle} débute dans 15 min`,
      RECORDING_READY: `Synthèse IA et enregistrement disponibles (${params.roomTitle})`,
    };

    return {
      id: `notif-room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'ROOM_LIVE',
      priority: 'MEDIUM',
      title: titles[params.eventType],
      body: `Code de salle : ${params.roomCode}. Cliquez pour rejoindre ou consulter la synthèse.`,
      channels: ['IN_APP', 'EMAIL', 'WEB_PUSH'],
      actionUrl: `/room-live?code=${params.roomCode}`,
      isRead: false,
      deduplicationKey: `${params.userId}:ROOMLIVE:${params.roomCode}:${params.eventType}`,
      icon: 'live-tracking',
      createdAt: new Date().toISOString(),
    };
  }

  public createSupportNotification(params: {
    userId: string;
    ticketId: string;
    title: string;
    action: 'CREATED' | 'AGENT_REPLIED' | 'RESOLVED';
  }): NotificationRecord {
    const titles = {
      CREATED: `Ticket Support #${params.ticketId} ouvert`,
      AGENT_REPLIED: `Réponse du support sur le ticket #${params.ticketId}`,
      RESOLVED: `Ticket #${params.ticketId} marqué comme résolu`,
    };

    return {
      id: `notif-sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'SUPPORT',
      priority: 'MEDIUM',
      title: titles[params.action],
      body: params.title,
      channels: ['IN_APP', 'EMAIL'],
      actionUrl: `/support?ticket=${params.ticketId}`,
      isRead: false,
      deduplicationKey: `${params.userId}:SUPPORT:${params.ticketId}:${params.action}`,
      icon: 'support',
      createdAt: new Date().toISOString(),
    };
  }

  public createSecurityNotification(params: {
    userId: string;
    alertType: 'BRUTE_FORCE_BLOCKED' | 'SUSPICIOUS_IP' | 'CREDENTIAL_REVOKED';
    details: string;
  }): NotificationRecord {
    return {
      id: `notif-sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      category: 'SÉCURITÉ',
      priority: 'CRITICAL',
      title: `Alerte de Sécurité Critique — ${params.alertType}`,
      body: params.details,
      channels: ['IN_APP', 'EMAIL', 'SMS', 'WEB_PUSH'],
      actionUrl: '/security/audit',
      isRead: false,
      deduplicationKey: `${params.userId}:SECURITY:${params.alertType}:${Date.now()}`,
      icon: 'secure-parcel',
      createdAt: new Date().toISOString(),
    };
  }
}

// Instance singleton par défaut
export const defaultNotificationDispatcher = new CentralNotificationDispatcher();
