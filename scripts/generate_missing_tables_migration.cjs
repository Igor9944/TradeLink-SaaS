const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const fullSql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
  encoding: 'utf8',
});
const initSql = fs.readFileSync('prisma/migrations/20261118000000_init_tradelink_v6/migration.sql', 'utf8');

function parseTableColumns(sql) {
  const tables = new Map();
  const regex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"(\w+)"\s*\(([\s\S]*?)\);/g;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const cols = new Map();
    for (const line of body.split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('--')) continue;
      const colMatch = trimmed.match(/^"(\w+)"\s+(.+)$/);
      if (colMatch) {
        cols.set(colMatch[1], colMatch[2]);
      }
    }
    tables.set(tableName, cols);
  }
  return tables;
}

const fullTableCols = parseTableColumns(fullSql);
const initTableCols = parseTableColumns(initSql);

// Find all tables in init migration
const initTables = new Set(
  [...initSql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi)].map(m => m[1])
);
console.log('Init tables count:', initTables.size);

// Find missing columns in the 17 initial tables
const alterInitialTableStatements = [];
for (const [tableName, initCols] of initTableCols.entries()) {
  const fullCols = fullTableCols.get(tableName);
  if (!fullCols) continue;
  for (const [colName, colDef] of fullCols.entries()) {
    if (!initCols.has(colName)) {
      alterInitialTableStatements.push(
        `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${colName}" ${colDef};`
      );
    }
  }
}
console.log('Missing columns added to initial 17 tables:', alterInitialTableStatements.length);

// Split fullSql into statements or sections
// In Prisma migrate diff, statements are separated by semicolons
const statements = fullSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

console.log('Total statements in full schema:', statements.length);

const missingTableStatements = [];
const missingConstraintStatements = [];
const missingIndexStatements = [];

// Determine which tables are missing
const createdTables = new Set();

for (const stmt of statements) {
  const tableMatch = stmt.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/i);
  if (tableMatch) {
    const tableName = tableMatch[1];
    if (!initTables.has(tableName)) {
      createdTables.add(tableName);
      // Ensure IF NOT EXISTS for safety
      const safeStmt = stmt.replace(/CREATE TABLE\s+["']?(\w+)["']?/i, 'CREATE TABLE IF NOT EXISTS "$1"');
      missingTableStatements.push(safeStmt + ';');
    }
  } else if (stmt.match(/CREATE (?:UNIQUE )?INDEX/i)) {
    // Check which table this index belongs to
    const indexTableMatch = stmt.match(/ON\s+["']?(\w+)["']?/i);
    if (indexTableMatch) {
      const targetTable = indexTableMatch[1];
      if (createdTables.has(targetTable)) {
        const safeIndex = stmt.replace(/CREATE (UNIQUE )?INDEX\s+["']?(\w+)["']?/i, 'CREATE $1INDEX IF NOT EXISTS "$2"');
        missingIndexStatements.push(safeIndex + ';');
      }
    }
  } else if (stmt.match(/ALTER TABLE\s+["']?(\w+)["']?\s+ADD CONSTRAINT/i)) {
    const alterTableMatch = stmt.match(/ALTER TABLE\s+["']?(\w+)["']?/i);
    if (alterTableMatch) {
      const targetTable = alterTableMatch[1];
      if (createdTables.has(targetTable)) {
        missingConstraintStatements.push(stmt + ';');
      }
    }
  }
}

console.log('Tables to create in migration:', createdTables.size);
console.log('Table names:', [...createdTables].join(', '));
console.log('Indices count:', missingIndexStatements.length);
console.log('Constraints count:', missingConstraintStatements.length);

const migrationSqlHeader = `-- ============================================================================
-- TRADELINK V6.0 — MIGRATION 2 : COMPLÉMENT DES 51 TABLES DU SCHÉMA PRISMA
-- Conforme à ÉTAPE 4 : Respect strict des 68 modèles Prisma sans altérer la migration initiale
-- Date : 20 novembre 2026
-- ============================================================================

`;

const migrationContent = [
  migrationSqlHeader,
  '-- 0. AJOUT DES COLONNES COMPLÉMENTAIRES SUR LES 17 TABLES INITIALES (USER & KYC)',
  ...alterInitialTableStatements,
  '',
  '-- 1. CRÉATION DES 51 TABLES MANQUANTES',
  ...missingTableStatements,
  '',
  "-- 2. CRÉATION DES INDEX DE RECHERCHE ET D'UNICITÉ",
  ...missingIndexStatements,
  '',
  "-- 3. AJOUT DES CLÉS ÉTRANGÈRES ET CONTRAINTES D'INTÉGRITÉ RÉFÉRENTIELLE",
  ...missingConstraintStatements,
  ''
].join('\n\n');

const migrationDir = path.join('prisma', 'migrations', '20261120000000_complete_51_tables');
if (!fs.existsSync(migrationDir)) {
  fs.mkdirSync(migrationDir, { recursive: true });
}

fs.writeFileSync(path.join(migrationDir, 'migration.sql'), migrationContent, 'utf8');
console.log('Migration generated successfully at:', path.join(migrationDir, 'migration.sql'));
