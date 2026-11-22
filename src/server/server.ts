// ============================================================================
// TRADELINK V6.1 — POINT D'ENTRÉE DU SERVEUR HTTP NODE.JS / EXPRESS
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import type { Server } from 'http';
import { createApp } from './app';
import { validateProductionSecurityEnv } from '../services/securityCrypto';
import { TradeLinkPostgresManager } from './database/prisma.client';
import { TradeLinkRedisManager } from './database/redis.client';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from './repositories/domain.repositories';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

let activeServer: Server | null = null;
let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  // 1. Contrôle de sécurité obligatoire au démarrage (bloque en production si secrets absents/faibles ou Vault dev)
  validateProductionSecurityEnv();

  // 2. Connexion PostgreSQL 16 (PrismaClient externe ou PGlite en dev/test; fail-closed en production)
  const dbMode = await TradeLinkPostgresManager.initDatabaseConnection();

  // 3. Connexion Redis 7 (ioredis externe ou cluster mémoire en dev/test; fail-closed en production)
  const redisConnected = await TradeLinkRedisManager.connectExternalRedis();
  if (process.env.NODE_ENV === 'production' && !redisConnected) {
    throw new Error('FATAL_REDIS_CONNECTION_ERROR: Connexion Redis 7 externe impossible en production.');
  }

  // 4. Initialisation du repository avec persistance adaptée au mode base de données
  const defaultSnapshot: DatabaseStateSnapshot = {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };

  const repositoryStore = new TradeLinkRepositoryStore(
    defaultSnapshot,
    true,
    dbMode === 'PGLITE_POSTGRESQL_16'
      ? {
          autoLoadFromDisk: true,
          persistenceFilePath: path.join(process.cwd(), 'dist', '.tradelink-pg16-persistent-state.json'),
        }
      : undefined
  );

  const app = createApp({ repositoryStore });

  activeServer = app.listen(PORT, HOST, () => {
    console.log(`============================================================================`);
    console.log(`🚀 TRADELINK V6.1 Backend Express Server démarré avec succès !`);
    console.log(`📡 URL API : http://${HOST}:${PORT}`);
    console.log(`🗄️  PostgreSQL Mode : ${dbMode} | Redis External : ${redisConnected ? 'UP (ioredis)' : 'SANDBOX_CLUSTER'}`);
    console.log(`🏥 Healthcheck : http://${HOST}:${PORT}/api/v1/health`);
    console.log(`📊 Prometheus Metrics : http://${HOST}:${PORT}/metrics`);
    console.log(`============================================================================`);
  });
}

// Arrêt gracieux du serveur (Graceful Shutdown)
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 Signal ${signal} reçu. Fermeture gracieuse du serveur HTTP, PostgreSQL et Redis...`);

  const finalize = async () => {
    await TradeLinkPostgresManager.shutdownDatabase().catch(() => {});
    await TradeLinkRedisManager.disconnectExternalRedis().catch(() => {});
    console.log('✅ Serveur HTTP, PostgreSQL et Redis fermés proprement.');
    process.exit(0);
  };

  if (activeServer) {
    activeServer.close(() => {
      void finalize();
    });
  } else {
    await finalize();
  }
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

bootstrap().catch(async (err) => {
  console.error('FATAL_BOOT_ERROR:', err);
  await TradeLinkPostgresManager.shutdownDatabase().catch(() => {});
  await TradeLinkRedisManager.disconnectExternalRedis().catch(() => {});
  process.exit(1);
});
