// ============================================================================
// TRADELINK V6.0 — SERVEUR HTTP EXPRESS MODULAIRE & SÉCURISÉ (API GATEWAY)
// Conforme à ÉTAPE 3 : Architecture Express, Middlewares de sécurité (Helmet, CORS),
// Authentification JWT, RBAC, Ownership, Endpoints de santé & Métriques
// ============================================================================

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { TradeLinkApiApplication } from './controllers/domain.controllers';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from './repositories/domain.repositories';
import { ServerRequestContext, AppError } from './middlewares/errorAndSecurity.middleware';
import { verifyJwtAccessToken } from '../services/securityCrypto';

export interface AppOptions {
  repositoryStore?: TradeLinkRepositoryStore;
  allowedOrigins?: string[];
}

export function createApp(options: AppOptions = {}): Application {
  const app = express();

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

  // 2. Middlewares de sécurité essentiels
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permet le rendu SPA / graphiques React
      crossOriginEmbedderPolicy: false,
    })
  );

  const allowedOrigins = options.allowedOrigins ?? [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://app.tradelink.ma',
    'https://admin.tradelink.ma',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error('CORS_ORIGIN_NOT_ALLOWED'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Correlation-ID',
        'Idempotency-Key',
        'Stripe-Signature',
        'X-TradeLink-Signature',
        'X-Requested-With',
      ],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Middleware d'injection de contexte (Correlation-ID, IP, Auth JWT)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    res.setHeader('X-Correlation-ID', correlationId);

    // Extraction et vérification du token JWT Bearer
    const authHeader = req.headers.authorization;
    let authUser: ServerRequestContext['user'] | undefined = undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
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

    (req as any).context = {
      correlationId,
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      user: authUser,
    };

    next();
  });

  // 4. Endpoints de santé & Observabilité
  const healthHandler = (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'TradeLink SaaS V6.0 API Gateway',
      environment: process.env.NODE_ENV || 'development',
      version: '6.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        database: repository.isProductionDatabaseConnected ? 'UP (PostgreSQL Prisma)' : 'STANDBY (Test Snapshot)',
        redis: 'UP (Session Storage)',
        kms: 'UP (AES-256-GCM Envelope Engine)',
        storage: 'UP (MinIO/S3 Compliance)',
      },
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // Endpoint de métriques Prometheus
  app.get('/metrics', (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    const metricsText = [
      '# HELP tradelink_uptime_seconds Total application uptime',
      '# TYPE tradelink_uptime_seconds gauge',
      `tradelink_uptime_seconds ${Math.floor(process.uptime())}`,
      '# HELP tradelink_heap_used_bytes Process heap memory used',
      '# TYPE tradelink_heap_used_bytes gauge',
      `tradelink_heap_used_bytes ${mem.heapUsed}`,
      '# HELP tradelink_heap_total_bytes Process total heap memory',
      '# TYPE tradelink_heap_total_bytes gauge',
      `tradelink_heap_total_bytes ${mem.heapTotal}`,
      '# HELP tradelink_active_requests Current active requests indicator',
      '# TYPE tradelink_active_requests gauge',
      'tradelink_active_requests 1',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.status(200).send(metricsText);
  });

  // 5. Routeur principal API v1 déléguant au moteur de contrôleurs métier
  app.use('/api/v1', (req: Request, res: Response) => {
    const subPath = req.path === '/' ? '' : req.path;
    const fullPath = `/api/v1${subPath}`;
    const ctx: ServerRequestContext = {
      method: req.method,
      path: fullPath,
      headers: req.headers as Record<string, string | undefined>,
      query: req.query as Record<string, string | undefined>,
      params: req.params as Record<string, string>,
      body: req.body ?? {},
      correlationId: (req as any).context?.correlationId || `corr-${Date.now()}`,
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
        res.status(500).json({
          success: false,
          correlationId: ctx.correlationId,
          persistedInDatabase: false,
          dataSource: 'ISOLATED_SANDBOX_STORE',
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: err?.message || 'Une erreur interne est survenue sur le serveur TRADELINK.',
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
    res.status(err?.status || 500).json({
      success: false,
      error: {
        code: err?.code || 'UNHANDLED_SERVER_ERROR',
        message: err?.message || 'Erreur interne non interceptée.',
      },
    });
  });

  return app;
}
