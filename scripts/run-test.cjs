// TRADELINK V6.0 — Script d'exécution unifié des tests TypeScript
const esbuild = require('esbuild');
const path = require('path');
const { spawnSync } = require('child_process');

const testFile = process.argv[2];
if (!testFile) {
  console.error('Usage: node scripts/run-test.cjs <test-file.ts>');
  process.exit(1);
}

const baseName = path.basename(testFile, '.ts');
const outfile = path.join('dist', `${baseName}.cjs`);

try {
  esbuild.buildSync({
    entryPoints: [testFile],
    bundle: true,
    platform: 'node',
    target: 'node20',
    external: ['@electric-sql/pglite', '@electric-sql/pglite/contrib/pgcrypto', '@node-rs/argon2', '@prisma/client'],
    outfile,
  });
} catch (err) {
  console.error(`Erreur de compilation esbuild pour ${testFile}:`, err);
  process.exit(1);
}

const result = spawnSync(process.execPath, [outfile], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);
