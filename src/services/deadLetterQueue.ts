// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.1 — DEAD LETTER QUEUE (DLQ) & GESTION DES TÂCHES ÉCHOUÉES (LOT 8)
// Traitement des échecs asynchrones, archivage diagnostique & rejeu résilient
// ============================================================================

export type DlqJobStatus = 'FAILED' | 'REPLAYED' | 'DISCARDED';

export interface DeadLetterJob<T = any> {
  id: string;
  queueName: string;
  payload: T;
  errorMessage: string;
  errorStack?: string;
  failedAt: string;
  attemptsCount: number;
  status: DlqJobStatus;
  replayedAt?: string;
  metadata?: Record<string, unknown>;
}

export class DeadLetterQueueManager {
  private static jobs: Map<string, DeadLetterJob> = new Map();
  private static maxRetentionCount = 5000;

  /**
   * Enfile une tâche échouée dans la Dead Letter Queue
   */
  public static enqueueFailedJob<T = any>(params: {
    queueName: string;
    payload: T;
    error: unknown;
    attemptsCount: number;
    metadata?: Record<string, unknown>;
  }): DeadLetterJob<T> {
    const err = params.error instanceof Error ? params.error : new Error(String(params.error));
    const id = `dlq-${params.queueName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const job: DeadLetterJob<T> = {
      id,
      queueName: params.queueName,
      payload: params.payload,
      errorMessage: err.message,
      errorStack: err.stack,
      failedAt: new Date().toISOString(),
      attemptsCount: params.attemptsCount,
      status: 'FAILED',
      metadata: params.metadata,
    };

    this.jobs.set(id, job);

    // Élagage automatique FIFO si la file dépasse la taille maximale
    if (this.jobs.size > this.maxRetentionCount) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }

    return job;
  }

  /**
   * Liste les tâches en DLQ avec filtres optionnels
   */
  public static listJobs(filter?: {
    queueName?: string;
    status?: DlqJobStatus;
  }): DeadLetterJob[] {
    let list = Array.from(this.jobs.values());
    if (filter?.queueName) {
      list = list.filter((j) => j.queueName === filter.queueName);
    }
    if (filter?.status) {
      list = list.filter((j) => j.status === filter.status);
    }
    return list.sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());
  }

  /**
   * Récupère une tâche spécifique par son identifiant
   */
  public static getJobById(jobId: string): DeadLetterJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Rejoue une tâche échouée via un handler métier
   */
  public static async replayJob<T = any>(
    jobId: string,
    handler: (payload: T) => Promise<boolean> | boolean
  ): Promise<{ success: boolean; job: DeadLetterJob<T> }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`DLQ_JOB_NOT_FOUND: Aucune tâche trouvée avec l'identifiant "${jobId}".`);
    }

    try {
      const ok = await handler(job.payload);
      if (ok) {
        job.status = 'REPLAYED';
        job.replayedAt = new Date().toISOString();
        return { success: true, job };
      }
      return { success: false, job };
    } catch (err: any) {
      job.errorMessage = `Replay Failed: ${err?.message || String(err)}`;
      job.attemptsCount++;
      return { success: false, job };
    }
  }

  /**
   * Rejette ou supprime une tâche de la file
   */
  public static discardJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'DISCARDED';
      return true;
    }
    return false;
  }

  /**
   * Purge les tâches rejouées ou plus anciennes qu'un délai donné
   */
  public static purge(maxAgeMs?: number): number {
    let deletedCount = 0;
    const now = Date.now();

    for (const [id, job] of this.jobs.entries()) {
      const jobTime = new Date(job.failedAt).getTime();
      const shouldDelete =
        job.status === 'REPLAYED' ||
        job.status === 'DISCARDED' ||
        (maxAgeMs !== undefined && now - jobTime > maxAgeMs);

      if (shouldDelete) {
        this.jobs.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Statistiques globales de la Dead Letter Queue
   */
  public static getStats(): {
    totalJobs: number;
    failedCount: number;
    replayedCount: number;
    discardedCount: number;
    byQueue: Record<string, number>;
  } {
    const byQueue: Record<string, number> = {};
    let failedCount = 0;
    let replayedCount = 0;
    let discardedCount = 0;

    for (const job of this.jobs.values()) {
      byQueue[job.queueName] = (byQueue[job.queueName] || 0) + 1;
      if (job.status === 'FAILED') failedCount++;
      else if (job.status === 'REPLAYED') replayedCount++;
      else if (job.status === 'DISCARDED') discardedCount++;
    }

    return {
      totalJobs: this.jobs.size,
      failedCount,
      replayedCount,
      discardedCount,
      byQueue,
    };
  }

  public static clear(): void {
    this.jobs.clear();
  }
}
