// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.1 — GESTIONNAIRE DE CIRCUIT BREAKER & RÉSILIENCE AVEC JITTER (LOT 8)
// Protection contre les cascades de pannes, isolation des services tiers :
// Google Gemini AI, Google Meet API, ClamAV Daemon & Passerelle de Paiement
// ============================================================================

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // Nombre d'échecs consécutifs avant ouverture (défaut: 5)
  cooldownMs?: number; // Temps d'attente en OPEN avant passage en HALF_OPEN (défaut: 10000 ms)
  halfOpenSuccessThreshold?: number; // Succès consécutifs en HALF_OPEN avant fermeture (défaut: 2)
  timeoutMs?: number; // Timeout par tentative (défaut: 8000 ms)
}

export class CircuitBreakerOpenError extends Error {
  public readonly circuitName: string;
  public readonly retryAfterMs: number;

  constructor(circuitName: string, retryAfterMs: number) {
    super(
      `CIRCUIT_BREAKER_OPEN: Le service tiers "${circuitName}" est temporairement indisponible (Circuit Ouvert pour protection). Réessai possible dans ${Math.ceil(retryAfterMs / 1000)}s.`
    );
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = circuitName;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitBreakerState = 'CLOSED';
  private failureThreshold: number;
  private cooldownMs: number;
  private halfOpenSuccessThreshold: number;
  private timeoutMs: number;

  private failureCount = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private stateTransitionsCount = 0;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 10000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  public getState(): CircuitBreakerState {
    const now = Date.now();
    if (this.state === 'OPEN' && now >= this.nextAttemptTime) {
      this.transitionTo('HALF_OPEN');
    }
    return this.state;
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stateTransitionsCount++;
      if (newState === 'HALF_OPEN') {
        this.consecutiveSuccesses = 0;
      } else if (newState === 'CLOSED') {
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
      }
    }
  }

  /**
   * Exécute une opération protégée par le circuit breaker
   */
  public async execute<T>(action: () => Promise<T> | T): Promise<T> {
    const currentState = this.getState();
    const now = Date.now();

    if (currentState === 'OPEN') {
      const waitTime = Math.max(0, this.nextAttemptTime - now);
      throw new CircuitBreakerOpenError(this.name, waitTime);
    }

    try {
      // Exécution avec timeout de protection
      const result = await this.executeWithTimeout(action, this.timeoutMs);
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure(err);
      throw err;
    }
  }

  private async executeWithTimeout<T>(action: () => Promise<T> | T, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`CIRCUIT_TIMEOUT: L'opération sur "${this.name}" a dépassé ${timeoutMs}ms.`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([Promise.resolve(action()), timeoutPromise]);
      return result;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  public recordFailure(_err?: unknown): void {
    const now = Date.now();
    this.lastFailureTime = now;

    if (this.state === 'HALF_OPEN') {
      // En HALF_OPEN, un seul échec réouvre immédiatement le circuit
      this.nextAttemptTime = now + this.cooldownMs;
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.nextAttemptTime = now + this.cooldownMs;
        this.transitionTo('OPEN');
      }
    }
  }

  public getStats(): {
    name: string;
    state: CircuitBreakerState;
    failureCount: number;
    consecutiveSuccesses: number;
    lastFailureTime: number;
    nextAttemptTime: number;
    stateTransitionsCount: number;
  } {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      stateTransitionsCount: this.stateTransitionsCount,
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}

// ============================================================================
// INSTANCES OFFICIELLES DES CIRCUIT BREAKERS TRADELINK V6.1
// ============================================================================

export const geminiCircuitBreaker = new CircuitBreaker({
  name: 'GEMINI_AI',
  failureThreshold: 5,
  cooldownMs: 8000,
  halfOpenSuccessThreshold: 2,
  timeoutMs: 15000,
});

export const meetCircuitBreaker = new CircuitBreaker({
  name: 'GOOGLE_MEET',
  failureThreshold: 4,
  cooldownMs: 10000,
  halfOpenSuccessThreshold: 2,
  timeoutMs: 10000,
});

export const clamAvCircuitBreaker = new CircuitBreaker({
  name: 'CLAMAV_SCANNER',
  failureThreshold: 3,
  cooldownMs: 6000,
  halfOpenSuccessThreshold: 2,
  timeoutMs: 8000,
});

export const paymentCircuitBreaker = new CircuitBreaker({
  name: 'PAYMENT_GATEWAY',
  failureThreshold: 5,
  cooldownMs: 12000,
  halfOpenSuccessThreshold: 2,
  timeoutMs: 12000,
});

// ============================================================================
// RÉESSAI AVEC EXPONENTIAL BACKOFF ET RANDOM JITTER
// ============================================================================

export interface RetryOptions {
  maxRetries?: number; // Défaut: 3
  baseDelayMs?: number; // Défaut: 100 ms
  maxDelayMs?: number; // Défaut: 2000 ms
  jitter?: boolean; // Défaut: true
  shouldRetry?: (error: any) => boolean;
}

export async function executeWithRetryAndJitter<T>(
  operation: () => Promise<T> | T,
  options: RetryOptions = {}
): Promise<{ result: T; attempts: number }> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const useJitter = options.jitter ?? true;

  let attempts = 0;
  let lastError: any = null;

  while (attempts <= maxRetries) {
    attempts++;
    try {
      const result = await operation();
      return { result, attempts };
    } catch (err: any) {
      lastError = err;

      // Si erreur non-réessayable (ex: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found)
      if (options.shouldRetry && !options.shouldRetry(err)) {
        throw err;
      }
      const statusCode = err?.statusCode || err?.status;
      if (statusCode && [400, 401, 403, 404, 422].includes(statusCode)) {
        throw err;
      }

      if (attempts > maxRetries) {
        break;
      }

      // Calcul du délai exponentiel
      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempts - 1));
      const jitterFactor = useJitter ? 0.75 + Math.random() * 0.5 : 1; // 75% à 125%
      const finalDelay = Math.floor(exponentialDelay * jitterFactor);

      await new Promise((resolve) => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError;
}
