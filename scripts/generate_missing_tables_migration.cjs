const fs = require('fs');
const path = require('path');

const fullSql = fs.readFileSync('prisma/full_schema_generated.sql', 'utf8');
const initSql = fs.readFileSync('prisma/migrations/20261118000000_init_tradelink_v6/migration.sql', 'utf8');

// Find all tables in init migration
const initTables = new Set(
  [...initSql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi)].map(m => m[1])
);
console.log('Init tables count:', initTables.size);

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
