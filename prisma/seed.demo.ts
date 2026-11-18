// ============================================================================
// TRADELINK V6.0 — JEU DE DONNÉES DE DÉMONSTRATION ISOLÉ (SÉPARÉ DE LA PRODUCTION)
// Conforme à PROMPT 4 :
// - "Les données de démonstration doivent être séparées des données de production."
// - "Ne jamais considérer une donnée simulée comme une donnée réellement enregistrée."
// - Interdiction stricte d'exécution si NODE_ENV === 'production'
// ============================================================================

export function assertNonProductionEnvironment(env = process.env.NODE_ENV): void {
  if (env === 'production') {
    throw new Error(
      '[SECURITY_BLOCK] Les données de démonstration ne peuvent jamais être injectées dans un environnement de production.'
    );
  }
}

export const DEMO_SANDBOX_FLAG = 'DEMO_SANDBOX_STORE' as const;
export const PRODUCTION_POSTGRES_FLAG = 'POSTGRESQL_PRISMA_PERSISTED' as const;
