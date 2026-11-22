// ============================================================================
// TRADELINK V6.0 — SERVEUR HTTP EXPRESS MODULAIRE & SÉCURISÉ (API GATEWAY)
// Conforme à ÉTAPE 3 : Architecture Express, Middlewares de sécurité (Helmet, CORS),
// Authentification JWT, RBAC, Ownership, Endpoints de santé & Métriques
// ============================================================================

import crypto from 'node:crypto';
import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { TradeLinkApiApplication } from './controllers/domain.controllers';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from './repositories/domain.repositories';
import {
  ServerRequestContext,
  AppError,
  requireAuthenticatedSession,
} from './middlewares/errorAndSecurity.middleware';
import {
  verifyJwtAccessToken,
  constantTimeEqual,
  isWeakOrExposedSecret,
} from '../services/securityCrypto';
import { TradeLinkRedisManager } from './database/redis.client';
import { TradeLinkPostgresManager } from './database/prisma.client';
import { observabilityMetrics } from '../services/observabilityMetrics';
import { assertFlatStringQuery } from './validators/schema.validator';
import { ClamAvDaemonClient } from '../services/messagingEngine';
import { clamAvCircuitBreaker, geminiCircuitBreaker } from '../services/circuitBreaker';
import { GeminiAiService } from '../services/geminiAiService';

export interface AppOptions {
  repositoryStore?: TradeLinkRepositoryStore;
  allowedOrigins?: string[];
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

export function createApp(options: AppOptions = {}): Application {
  const app = express();
  app.set('trust proxy', 1);

  // 1. Initialisation du repository et du contrôleur métier
  const defaultSnapshot: DatabaseStateSnapshot = {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };

  const repository = options.repositoryStore ?? new TradeLinkRepositoryStore(defaultSnapshot, true);
  const domainApp = new TradeLinkApiApplication(repository);

  // 2. Middlewares de sécurité essentiels (Helmet CSP durci, HSTS & HTTPS Enforcement en production)
  const isProd = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https://app.tradelink.ma'],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Redirection / Obligation HTTPS en production
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isProd && req.headers['x-forwarded-proto'] === 'http') {
      res.status(426).json({
        success: false,
        error: {
          code: 'HTTPS_TLS_REQUIRED',
          message: 'Sécurité TRADELINK : Toutes les communications de production exigent HTTPS/TLS 1.3.',
        },
      });
      return;
    }
    next();
  });

  // Suivi de latence et métriques HTTP en amont
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    observabilityMetrics.incrementActiveRequests();
    res.on('finish', () => {
      observabilityMetrics.decrementActiveRequests();
      const durationMs = performance.now() - start;
      const routePath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
      observabilityMetrics.recordHttpRequest(req.method, routePath, res.statusCode, durationMs);
    });
    next();
  });

  // Rate Limiting HTTP distribué par palier via Redis 7
  const authWindowLimit = Number(process.env.RATE_LIMIT_AUTH_MAX || 40);
  const apiWindowLimit = Number(process.env.RATE_LIMIT_API_MAX || 400);
  const aiWindowLimit = Number(process.env.RATE_LIMIT_AI_MAX || 60);
  const exportWindowLimit = Number(process.env.RATE_LIMIT_EXPORT_MAX || 30);
  const translationWindowLimit = Number(process.env.RATE_LIMIT_TRANSLATION_MAX || 100);
  const windowDurationMs = 60 * 1000;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const isAuthRoute = req.path.startsWith('/api/v1/auth');
    const isAiRoute = req.path.startsWith('/api/v1/ai') || req.path.startsWith('/api/v1/copilot');
    const isExportRoute = req.path.includes('/export') || req.path.includes('/download');
    const isTranslationRoute = req.path.startsWith('/api/v1/translation');

    let tier = 'API';
    let maxLimit = apiWindowLimit;
    if (isAuthRoute) {
      tier = 'AUTH';
      maxLimit = authWindowLimit;
    } else if (isAiRoute) {
      tier = 'AI';
      maxLimit = aiWindowLimit;
    } else if (isExportRoute) {
      tier = 'EXPORT';
      maxLimit = exportWindowLimit;
    } else if (isTranslationRoute) {
      tier = 'TRANSLATION';
      maxLimit = translationWindowLimit;
    }

    const bucketKey = `${clientIp}:${tier}`;
    const now = Date.now();

    try {
      const { count, resetAtMs } = TradeLinkRedisManager.incrementRateLimitCounter(
        bucketKey,
        windowDurationMs
      );
      const remaining = Math.max(0, maxLimit - count);
      res.setHeader('X-RateLimit-Limit', String(maxLimit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));

      if (count > maxLimit) {
        const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
          success: false,
          error: {
            code: 'HTTP_RATE_LIMIT_EXCEEDED',
            message: `Limite de requêtes distribuée (${tier}) atteinte (${maxLimit}/min). Veuillez réessayer dans ${retryAfterSec}s.`,
          },
        });
        return;
      }
    } catch {
      // Dégradation maîtrisée si Redis est temporairement indisponible sur le compteur de rate-limit
      res.setHeader('X-RateLimit-Degraded', 'true');
    }
    next();
  });

  const envAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const allowedOrigins =
    options.allowedOrigins ??
    (envAllowedOrigins.length > 0
      ? envAllowedOrigins
      : isProd
      ? ['https://app.tradelink.ma', 'https://admin.tradelink.ma']
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'https://app.tradelink.ma',
          'https://admin.tradelink.ma',
        ]);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || !isProd) {
          callback(null, true);
        } else {
          const corsErr = Object.assign(new Error('CORS_ORIGIN_NOT_ALLOWED'), {
            status: 403,
            code: 'CORS_ORIGIN_NOT_ALLOWED',
          });
          callback(corsErr);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Correlation-ID',
        'X-CSRF-Token',
        'Idempotency-Key',
        'Stripe-Signature',
        'X-TradeLink-Signature',
        'X-Timestamp',
        'X-TradeLink-Timestamp',
        'X-Requested-With',
      ],
    })
  );

  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        if (buf && buf.length > 0) {
          req.rawBody = buf.toString('utf8');
        }
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Middleware d'injection de contexte (Correlation-ID, IP, Auth JWT + Double-Submit CSRF)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      `corr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    res.setHeader('X-Correlation-ID', correlationId);

    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;
    const cookieJwt = cookies.tradelink_session;
    const isBearerAuth = Boolean(authHeader && authHeader.startsWith('Bearer '));
    const token = isBearerAuth ? authHeader!.slice(7).trim() : cookieJwt;

    let authUser: ServerRequestContext['user'] | undefined = undefined;
    if (token) {
      const payload = verifyJwtAccessToken(token);
      if (payload) {
        authUser = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          sessionId: payload.sessionId,
          companyName: 'TradeLink B2B Network',
          mfaVerified: payload.mfaVerified,
        };
      }
    }

    // Protection CSRF double-submit pour les requêtes mutantes authentifiées par cookie (sans Bearer)
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    const isCsrfExemptPath =
      req.path.startsWith('/api/v1/auth/') ||
      req.path === '/api/v1/payments/stripe/webhook' ||
      req.path.startsWith('/api/v1/webhooks/payments/');
    if (isMutating && !isBearerAuth && Boolean(cookieJwt) && !isCsrfExemptPath) {
      const csrfCookie = cookies.tradelink_csrf || '';
      const csrfHeader = String(req.headers['x-csrf-token'] || '');
      if (!csrfCookie || !csrfHeader || !constantTimeEqual(csrfCookie, csrfHeader)) {
        res.status(403).json({
          success: false,
          correlationId,
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'Jeton CSRF manquant ou invalide pour une session cookie.',
          },
        });
        return;
      }
    }

    (req as any).context = {
      correlationId,
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      user: authUser,
    };

    next();
  });

  // 4. Endpoints de santé & Observabilité (état réel PostgreSQL 16, Redis 7, ClamAV, KMS, Storage, Gemini)
  const computeRealHealth = async () => {
    const [pgReport, redisHealth, clamPing] = await Promise.all([
      TradeLinkPostgresManager.checkPostgresHealthAsync(),
      TradeLinkRedisManager.checkRedisHealthAsync(),
      ClamAvDaemonClient.pingClamd(),
    ]);

    const pgUp = pgReport.status === 'UP';
    const redisUp = redisHealth.status === 'UP';
    const clamBreakerState = clamAvCircuitBreaker.getState();
    const geminiBreakerState = geminiCircuitBreaker.getState();
    const geminiConfigured = GeminiAiService.getInstance().isConfigured();
    const kmsConfigured = Boolean(
      process.env.KMS_VAULT_ADDR &&
        process.env.KMS_VAULT_TOKEN &&
        !isWeakOrExposedSecret(process.env.KMS_VAULT_TOKEN, 20)
    );
    const storageConfigured = Boolean(
      process.env.S3_ENDPOINT &&
        process.env.S3_ACCESS_KEY &&
        process.env.S3_SECRET_KEY &&
        !isWeakOrExposedSecret(process.env.S3_SECRET_KEY, 20)
    );

    const clamHealthy = clamPing.status === 'UP' && clamBreakerState !== 'OPEN';
    const isHealthy = pgUp && redisUp && (!isProd || clamHealthy);

    const clamStatusLabel =
      clamBreakerState === 'OPEN'
        ? 'DEGRADED (Circuit Open)'
        : clamPing.status === 'UP'
        ? 'UP (ClamAV zPING PONG)'
        : clamPing.status === 'NOT_CONFIGURED'
        ? 'NOT_CONFIGURED (Sandbox Fallback)'
        : 'DOWN (ClamAV Unreachable)';

    const kmsLabel = kmsConfigured ? 'UP (Vault KMS Configured)' : 'NOT_CONFIGURED';
    const storageLabel = storageConfigured ? 'UP (S3/MinIO Configured)' : 'NOT_CONFIGURED';
    const geminiLabel =
      geminiBreakerState === 'OPEN'
        ? 'DEGRADED (Circuit Open)'
        : geminiConfigured
        ? 'UP (Gemini API Configured)'
        : 'NOT_CONFIGURED';

    return {
      isHealthy,
      pgReport,
      pgUp,
      redisUp,
      clamPing,
      clamBreakerState,
      kmsConfigured,
      storageConfigured,
      geminiConfigured,
      geminiBreakerState,
      clamStatusLabel,
      kmsLabel,
      storageLabel,
      geminiLabel,
    };
  };

  const healthHandler = async (_req: Request, res: Response) => {
    const h = await computeRealHealth();
    res.status(h.isHealthy ? 200 : 503).json({
      status: h.isHealthy ? 'UP' : 'DEGRADED',
      service: 'TradeLink SaaS V6.1 API Gateway',
      environment: process.env.NODE_ENV || 'development',
      version: '6.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        database: !h.pgUp
          ? 'DOWN (PostgreSQL Connection Error)'
          : repository.isProductionDatabaseConnected
          ? 'UP (PostgreSQL Prisma)'
          : 'STANDBY (Test Snapshot)',
        redis: h.redisUp ? 'UP (Session Storage)' : 'DOWN (Redis Cluster Unreachable)',
        kms: h.kmsLabel,
        storage: h.storageLabel,
        gemini: h.geminiLabel,
        clamav: h.clamStatusLabel,
      },
    });
  };

  const readyHandler = async (_req: Request, res: Response) => {
    const h = await computeRealHealth();
    res.status(h.isHealthy ? 200 : 503).json({
      ready: h.isHealthy,
      checks: {
        postgresql16: h.pgUp ? 'READY' : 'UNAVAILABLE',
        redis7Cluster: h.redisUp ? 'READY' : 'UNAVAILABLE',
        clamAvDaemon:
          h.clamBreakerState === 'OPEN'
            ? 'DEGRADED'
            : h.clamPing.status === 'UP'
            ? 'READY'
            : h.clamPing.status === 'NOT_CONFIGURED'
            ? 'NOT_CONFIGURED'
            : 'UNAVAILABLE',
        hashiCorpVaultKms: h.kmsConfigured ? 'READY' : 'NOT_CONFIGURED',
        googleGeminiAi:
          h.geminiBreakerState === 'OPEN'
            ? 'DEGRADED'
            : h.geminiConfigured
            ? 'READY'
            : 'NOT_CONFIGURED',
      },
    });
  };

  const liveHandler = (_req: Request, res: Response) => {
    res.status(200).json({
      live: true,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryOk: process.memoryUsage().heapUsed < 1.5 * 1024 * 1024 * 1024,
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);
  app.get('/health/ready', readyHandler);
  app.get('/api/v1/health/ready', readyHandler);
  app.get('/health/live', liveHandler);
  app.get('/api/v1/health/live', liveHandler);

  // Endpoint de métriques Prometheus & APM (protégé par ADMIN JWT ou METRICS_SCRAPE_TOKEN)
  const metricsHandler = (req: Request, res: Response) => {
    const scrapeToken = process.env.METRICS_SCRAPE_TOKEN?.trim();
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const hasValidScrapeToken =
      Boolean(scrapeToken) &&
      scrapeToken!.length >= 16 &&
      Boolean(bearer) &&
      constantTimeEqual(bearer, scrapeToken!);

    if (!hasValidScrapeToken) {
      const reqCtx: ServerRequestContext = {
        method: req.method,
        path: req.path,
        headers: req.headers as Record<string, string | undefined>,
        query: {},
        params: {},
        body: {},
        correlationId: (req as any).context?.correlationId || `corr-${Date.now()}`,
        ipAddress: (req as any).context?.ipAddress || '127.0.0.1',
        user: (req as any).context?.user,
      };
      try {
        const user = requireAuthenticatedSession(reqCtx);
        if (user.role !== 'ADMIN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'RBAC_FORBIDDEN_ROLE',
              message: 'Accès refusé : rôle ADMIN ou METRICS_SCRAPE_TOKEN requis pour /metrics.',
            },
          });
          return;
        }
      } catch (err: any) {
        if (err instanceof AppError) {
          res.status(err.statusCode).json({
            success: false,
            error: { code: err.errorCode, message: err.message },
          });
          return;
        }
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_UNAUTHORIZED', message: 'Authentification requise pour /metrics.' },
        });
        return;
      }
    }

    if (req.headers.accept?.includes('application/json') || req.path.endsWith('/json')) {
      res.status(200).json(observabilityMetrics.getSnapshot());
      return;
    }
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.status(200).send(observabilityMetrics.toPrometheusFormat());
  };

  app.get('/metrics', metricsHandler);
  app.get('/health/metrics', metricsHandler);
  app.get('/api/v1/metrics', metricsHandler);

  // 5. Routeur principal API v1 déléguant au moteur de contrôleurs métier
  app.use('/api/v1', (req: Request, res: Response) => {
    const subPath = req.path === '/' ? '' : req.path;
    const fullPath = `/api/v1${subPath}`;
    const correlationId = (req as any).context?.correlationId || `corr-${Date.now()}`;

    let flatQuery: Record<string, string | undefined>;
    try {
      flatQuery = assertFlatStringQuery(req.query);
    } catch (qErr: any) {
      if (qErr instanceof AppError) {
        res.status(qErr.statusCode).json({
          success: false,
          correlationId,
          persistedInDatabase: repository.isProductionDatabaseConnected,
          dataSource: repository.isProductionDatabaseConnected ? 'POSTGRESQL_PRISMA' : 'ISOLATED_SANDBOX_STORE',
          error: {
            code: qErr.errorCode,
            message: qErr.message,
            details: qErr.details,
          },
        });
        return;
      }
      throw qErr;
    }

    const ctx: ServerRequestContext = {
      method: req.method,
      path: fullPath,
      headers: req.headers as Record<string, string | undefined>,
      query: flatQuery,
      params: req.params as Record<string, string>,
      body: req.body ?? {},
      rawBody: (req as any).rawBody,
      correlationId,
      ipAddress: (req as any).context?.ipAddress || '127.0.0.1',
      user: (req as any).context?.user,
    };

    try {
      const result = domainApp.handleRequest(ctx);
      for (const [headerKey, headerVal] of Object.entries(result.headers)) {
        res.setHeader(headerKey, headerVal);
      }
      res.status(result.statusCode).json(result.body);
    } catch (err: any) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({
          success: false,
          correlationId: ctx.correlationId,
          persistedInDatabase: repository.isProductionDatabaseConnected,
          dataSource: repository.isProductionDatabaseConnected ? 'POSTGRESQL_PRISMA' : 'ISOLATED_SANDBOX_STORE',
          error: {
            code: err.errorCode,
            message: err.message,
            details: err.details,
          },
        });
      } else {
        console.error('EXPRESS_API_UNHANDLED_ERROR:', err);
        res.status(500).json({
          success: false,
          correlationId: ctx.correlationId,
          persistedInDatabase: false,
          dataSource: 'ISOLATED_SANDBOX_STORE',
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: isProd
              ? 'Une erreur interne est survenue sur le serveur TRADELINK.'
              : err?.message || 'Une erreur interne est survenue sur le serveur TRADELINK.',
          },
        });
      }
    }
  });

  // 6. Gestionnaire 404 global
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Endpoint introuvable sur le serveur TRADELINK V6.0.',
      },
    });
  });

  // 7. Gestionnaire global d'erreurs Express
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    if (status >= 500) {
      console.error('EXPRESS_GLOBAL_ERROR:', err);
    }
    res.status(status).json({
      success: false,
      error: {
        code: err?.code || 'UNHANDLED_SERVER_ERROR',
        message:
          status >= 500 && isProd
            ? 'Erreur interne non interceptée.'
            : err?.message || 'Erreur interne non interceptée.',
      },
    });
  });

  return app;
}
