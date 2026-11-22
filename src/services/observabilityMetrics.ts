// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.1 — MOTEUR D'OBSERVABILITÉ ET MÉTRIQUES PROMETHEUS (LOT 8)
// Collecte de métriques APM, Latences p50/p90/p95/p99, Taux d'erreurs 4xx/5xx,
// Cache Redis, Quotas IA Gemini & Format Exposition Prometheus (RFC 0.0.4)
// ============================================================================

export interface LatencyHistogramSnapshot {
  count: number;
  sumMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

export interface SystemMetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  http: {
    totalRequests: number;
    activeRequests: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    errorRatePct: number;
    latency: LatencyHistogramSnapshot;
  };
  database: {
    totalQueries: number;
    errorQueries: number;
    avgLatencyMs: number;
  };
  redis: {
    hits: number;
    misses: number;
    hitRatePct: number;
    operationsCount: number;
  };
  ai: {
    totalRequests: number;
    totalTokens: number;
    avgLatencyMs: number;
  };
  system: {
    heapUsedBytes: number;
    heapTotalBytes: number;
    rssBytes: number;
    externalBytes: number;
  };
}

class ObservabilityMetricsRegistry {
  private requestDurations: number[] = [];
  private totalRequests = 0;
  private activeRequests = 0;
  private status2xx = 0;
  private status4xx = 0;
  private status5xx = 0;

  private routeCounters: Map<string, number> = new Map();

  private dbQueryDurations: number[] = [];
  private dbQueriesCount = 0;
  private dbQueriesErrors = 0;

  private redisHits = 0;
  private redisMisses = 0;

  private aiRequestsCount = 0;
  private aiTokensConsumed = 0;
  private aiLatencies: number[] = [];

  /**
   * Enregistre l'exécution d'une requête HTTP
   */
  public recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number
  ): void {
    this.totalRequests++;
    this.requestDurations.push(durationMs);
    // Limite l'historique en mémoire pour éviter tout memory leak
    if (this.requestDurations.length > 5000) {
      this.requestDurations.shift();
    }

    if (statusCode >= 200 && statusCode < 400) {
      this.status2xx++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.status4xx++;
    } else if (statusCode >= 500) {
      this.status5xx++;
    }

    const key = `${method.toUpperCase()} ${route}:${statusCode}`;
    this.routeCounters.set(key, (this.routeCounters.get(key) || 0) + 1);
  }

  public incrementActiveRequests(): void {
    this.activeRequests++;
  }

  public decrementActiveRequests(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
  }

  /**
   * Enregistre une requête SQL / Prisma
   */
  public recordDbQuery(durationMs: number, success = true): void {
    this.dbQueriesCount++;
    if (!success) {
      this.dbQueriesErrors++;
    }
    this.dbQueryDurations.push(durationMs);
    if (this.dbQueryDurations.length > 2000) {
      this.dbQueryDurations.shift();
    }
  }

  /**
   * Enregistre un accès au cache Redis
   */
  public recordRedisAccess(hit: boolean): void {
    if (hit) {
      this.redisHits++;
    } else {
      this.redisMisses++;
    }
  }

  /**
   * Enregistre un appel à l'IA Google Gemini
   */
  public recordAiUsage(tokens: number, durationMs: number): void {
    this.aiRequestsCount++;
    this.aiTokensConsumed += tokens;
    this.aiLatencies.push(durationMs);
    if (this.aiLatencies.length > 1000) {
      this.aiLatencies.shift();
    }
  }

  /**
   * Calcule les percentiles de latence (p50, p90, p95, p99)
   */
  public calculateLatencyPercentiles(samples: number[]): LatencyHistogramSnapshot {
    if (samples.length === 0) {
      return {
        count: 0,
        sumMs: 0,
        p50Ms: 0,
        p90Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        minMs: 0,
        maxMs: 0,
      };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const count = sorted.length;
    const sumMs = sorted.reduce((acc, val) => acc + val, 0);

    const getPercentile = (p: number): number => {
      const idx = Math.min(Math.floor((p / 100) * count), count - 1);
      return Number(sorted[idx].toFixed(2));
    };

    return {
      count,
      sumMs: Number(sumMs.toFixed(2)),
      p50Ms: getPercentile(50),
      p90Ms: getPercentile(90),
      p95Ms: getPercentile(95),
      p99Ms: getPercentile(99),
      minMs: Number(sorted[0].toFixed(2)),
      maxMs: Number(sorted[count - 1].toFixed(2)),
    };
  }

  /**
   * Restitue un instantané complet des métriques au format JSON
   */
  public getSnapshot(): SystemMetricsSnapshot {
    const mem = process.memoryUsage();
    const redisTotal = this.redisHits + this.redisMisses;
    const redisHitRate = redisTotal > 0 ? (this.redisHits / redisTotal) * 100 : 100;
    const errorCount = this.status4xx + this.status5xx;
    const errorRate = this.totalRequests > 0 ? (errorCount / this.totalRequests) * 100 : 0;

    const dbAvg =
      this.dbQueryDurations.length > 0
        ? this.dbQueryDurations.reduce((a, b) => a + b, 0) / this.dbQueryDurations.length
        : 0;

    const aiAvg =
      this.aiLatencies.length > 0
        ? this.aiLatencies.reduce((a, b) => a + b, 0) / this.aiLatencies.length
        : 0;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      http: {
        totalRequests: this.totalRequests,
        activeRequests: this.activeRequests,
        status2xx: this.status2xx,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        errorRatePct: Number(errorRate.toFixed(2)),
        latency: this.calculateLatencyPercentiles(this.requestDurations),
      },
      database: {
        totalQueries: this.dbQueriesCount,
        errorQueries: this.dbQueriesErrors,
        avgLatencyMs: Number(dbAvg.toFixed(2)),
      },
      redis: {
        hits: this.redisHits,
        misses: this.redisMisses,
        hitRatePct: Number(redisHitRate.toFixed(2)),
        operationsCount: redisTotal,
      },
      ai: {
        totalRequests: this.aiRequestsCount,
        totalTokens: this.aiTokensConsumed,
        avgLatencyMs: Number(aiAvg.toFixed(2)),
      },
      system: {
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        rssBytes: mem.rss,
        externalBytes: mem.external,
      },
    };
  }

  /**
   * Exposition officielle au format Prometheus standard (version 0.0.4)
   */
  public toPrometheusFormat(): string {
    const snap = this.getSnapshot();
    const lines: string[] = [];

    // 1. HTTP Metrics
    lines.push('# HELP tradelink_http_requests_total Nombre total de requêtes HTTP');
    lines.push('# TYPE tradelink_http_requests_total counter');
    lines.push(`tradelink_http_requests_total{status="2xx"} ${snap.http.status2xx}`);
    lines.push(`tradelink_http_requests_total{status="4xx"} ${snap.http.status4xx}`);
    lines.push(`tradelink_http_requests_total{status="5xx"} ${snap.http.status5xx}`);

    lines.push('# HELP tradelink_http_active_requests Requêtes HTTP actuellement en cours');
    lines.push('# TYPE tradelink_http_active_requests gauge');
    lines.push(`tradelink_http_active_requests ${snap.http.activeRequests}`);

    lines.push('# HELP tradelink_http_request_duration_seconds Latence des requêtes HTTP en secondes');
    lines.push('# TYPE tradelink_http_request_duration_seconds summary');
    lines.push(`tradelink_http_request_duration_seconds{quantile="0.5"} ${(snap.http.latency.p50Ms / 1000).toFixed(4)}`);
    lines.push(`tradelink_http_request_duration_seconds{quantile="0.9"} ${(snap.http.latency.p90Ms / 1000).toFixed(4)}`);
    lines.push(`tradelink_http_request_duration_seconds{quantile="0.95"} ${(snap.http.latency.p95Ms / 1000).toFixed(4)}`);
    lines.push(`tradelink_http_request_duration_seconds{quantile="0.99"} ${(snap.http.latency.p99Ms / 1000).toFixed(4)}`);
    lines.push(`tradelink_http_request_duration_seconds_count ${snap.http.latency.count}`);
    lines.push(`tradelink_http_request_duration_seconds_sum ${(snap.http.latency.sumMs / 1000).toFixed(4)}`);

    // 2. Database Metrics
    lines.push('# HELP tradelink_db_queries_total Nombre de requêtes PostgreSQL exécutées');
    lines.push('# TYPE tradelink_db_queries_total counter');
    lines.push(`tradelink_db_queries_total ${snap.database.totalQueries}`);
    lines.push('# HELP tradelink_db_queries_errors_total Nombre d erreurs de requêtes SQL');
    lines.push('# TYPE tradelink_db_queries_errors_total counter');
    lines.push(`tradelink_db_queries_errors_total ${snap.database.errorQueries}`);

    // 3. Redis Metrics
    lines.push('# HELP tradelink_redis_cache_hits_total Nombre d accès réussis au cache Redis');
    lines.push('# TYPE tradelink_redis_cache_hits_total counter');
    lines.push(`tradelink_redis_cache_hits_total ${snap.redis.hits}`);
    lines.push('# HELP tradelink_redis_cache_misses_total Nombre d accès manqués au cache Redis');
    lines.push('# TYPE tradelink_redis_cache_misses_total counter');
    lines.push(`tradelink_redis_cache_misses_total ${snap.redis.misses}`);
    lines.push('# HELP tradelink_redis_cache_hit_ratio Ratio de succès du cache Redis');
    lines.push('# TYPE tradelink_redis_cache_hit_ratio gauge');
    lines.push(`tradelink_redis_cache_hit_ratio ${(snap.redis.hitRatePct / 100).toFixed(4)}`);

    // 4. AI Gemini Metrics
    lines.push('# HELP tradelink_ai_requests_total Nombre d invocations du moteur IA Google Gemini');
    lines.push('# TYPE tradelink_ai_requests_total counter');
    lines.push(`tradelink_ai_requests_total ${snap.ai.totalRequests}`);
    lines.push('# HELP tradelink_ai_tokens_consumed_total Jetons IA Google Gemini consommés');
    lines.push('# TYPE tradelink_ai_tokens_consumed_total counter');
    lines.push(`tradelink_ai_tokens_consumed_total ${snap.ai.totalTokens}`);

    // 5. System & Memory Metrics
    lines.push('# HELP tradelink_uptime_seconds Temps de disponibilité du service en secondes');
    lines.push('# TYPE tradelink_uptime_seconds gauge');
    lines.push(`tradelink_uptime_seconds ${snap.uptimeSeconds}`);
    lines.push('# HELP nodejs_heap_size_used_bytes Mémoire tas V8 consommée en octets');
    lines.push('# TYPE nodejs_heap_size_used_bytes gauge');
    lines.push(`nodejs_heap_size_used_bytes ${snap.system.heapUsedBytes}`);
    lines.push('# HELP nodejs_heap_size_total_bytes Mémoire tas V8 allouée en octets');
    lines.push('# TYPE nodejs_heap_size_total_bytes gauge');
    lines.push(`nodejs_heap_size_total_bytes ${snap.system.heapTotalBytes}`);
    lines.push('# HELP process_resident_memory_bytes Mémoire résidente RSS en octets');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${snap.system.rssBytes}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Réinitialise les compteurs (pour tests unitaires)
   */
  public reset(): void {
    this.requestDurations = [];
    this.totalRequests = 0;
    this.activeRequests = 0;
    this.status2xx = 0;
    this.status4xx = 0;
    this.status5xx = 0;
    this.routeCounters.clear();
    this.dbQueryDurations = [];
    this.dbQueriesCount = 0;
    this.dbQueriesErrors = 0;
    this.redisHits = 0;
    this.redisMisses = 0;
    this.aiRequestsCount = 0;
    this.aiTokensConsumed = 0;
    this.aiLatencies = [];
  }
}

export const observabilityMetrics = new ObservabilityMetricsRegistry();
