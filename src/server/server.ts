// ============================================================================
// TRADELINK V6.0 — POINT D'ENTRÉE DU SERVEUR HTTP NODE.JS / EXPRESS
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { validateProductionSecurityEnv } from '../services/securityCrypto';

// Contrôle de sécurité obligatoire au démarrage (bloque en production si secrets absents/faibles ou Vault dev)
validateProductionSecurityEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`============================================================================`);
  console.log(`🚀 TRADELINK V6.0 Backend Express Server démarré avec succès !`);
  console.log(`📡 URL API : http://${HOST}:${PORT}`);
  console.log(`🏥 Healthcheck : http://${HOST}:${PORT}/api/v1/health`);
  console.log(`📊 Prometheus Metrics : http://${HOST}:${PORT}/metrics`);
  console.log(`============================================================================`);
});

// Arrêt gracieux du serveur (Graceful Shutdown)
const shutdown = (signal: string) => {
  console.log(`\n🛑 Signal ${signal} reçu. Fermeture gracieuse du serveur HTTP...`);
  server.close(() => {
    console.log('✅ Serveur HTTP fermé sans perte de connexion.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
