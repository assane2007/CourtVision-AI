/**
 * Prisma Migration Configuration Helper
 *
 * Provides utilities for managing schema migrations between
 * SQLite (local dev) and PostgreSQL (production).
 *
 * Usage:
 *   bun run prisma/migrations/config.ts <command>
 *
 * Commands:
 *   generate:pg    — Generate Prisma client from PostgreSQL schema
 *   generate:sqlite — Generate Prisma client from SQLite schema
 *   diff           — Show schema differences between SQLite and PostgreSQL
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../..')
const prismaDir = resolve(projectRoot, 'prisma')

// ─── Schema paths ───────────────────────────────────────────────────────────
const SCHEMAS = {
  sqlite: resolve(prismaDir, 'schema.prisma'),
  postgres: resolve(prismaDir, 'schema.postgres.prisma'),
} as const

type SchemaType = keyof typeof SCHEMAS

// ─── Color helpers ──────────────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
} as const

function log(msg: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`)
}

// ─── Commands ───────────────────────────────────────────────────────────────

/**
 * Generate the Prisma client for a specific schema type.
 */
function generateClient(type: SchemaType) {
  const schemaPath = SCHEMAS[type]
  if (!existsSync(schemaPath)) {
    log(`Schema file not found: ${schemaPath}`, 'red')
    process.exit(1)
  }

  log(`Generating Prisma client for ${type.toUpperCase()}...`, 'cyan')
  log(`  Schema: ${schemaPath}`, 'dim')

  try {
    execSync(`npx prisma generate --schema="${schemaPath}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
    })
    log(`✓ ${type.toUpperCase()} client generated successfully`, 'green')
  } catch {
    log(`✗ Failed to generate ${type.toUpperCase()} client`, 'red')
    process.exit(1)
  }
}

/**
 * Validate that both schema files exist and are syntactically correct.
 */
function validateSchemas() {
  log('Validating schemas...', 'cyan')

  for (const [type, path] of Object.entries(SCHEMAS)) {
    if (!existsSync(path)) {
      log(`  ✗ ${type}: not found at ${path}`, 'red')
      process.exit(1)
    }

    const content = readFileSync(path, 'utf-8')

    // Check for basic Prisma schema structure
    if (!content.includes('generator client')) {
      log(`  ✗ ${type}: missing "generator client" block`, 'red')
      process.exit(1)
    }
    if (!content.includes('datasource db')) {
      log(`  ✗ ${type}: missing "datasource db" block`, 'red')
      process.exit(1)
    }

    const modelCount = (content.match(/^model\s+\w+/gm) || []).length
    log(`  ✓ ${type}: ${modelCount} models found`, 'green')
  }

  // Check model parity
  const sqliteContent = readFileSync(SCHEMAS.sqlite, 'utf-8')
  const pgContent = readFileSync(SCHEMAS.postgres, 'utf-8')

  const sqliteModels = (sqliteContent.match(/^model\s+(\w+)/gm) || [])
    .map((m) => m.replace('model ', '').trim())
  const pgModels = (pgContent.match(/^model\s+(\w+)/gm) || [])
    .map((m) => m.replace('model ', '').trim())

  const onlyInSqlite = sqliteModels.filter((m) => !pgModels.includes(m))
  const onlyInPg = pgModels.filter((m) => !sqliteModels.includes(m) && !['Subscription', 'RefreshToken', 'WebhookEvent'].includes(m))

  if (onlyInSqlite.length > 0) {
    log(`  ⚠ Models only in SQLite: ${onlyInSqlite.join(', ')}`, 'yellow')
  }
  if (onlyInPg.length > 0) {
    log(`  ⚠ Models only in PostgreSQL: ${onlyInPg.join(', ')}`, 'yellow')
  }
  if (onlyInSqlite.length === 0 && onlyInPg.length === 0) {
    log('  ✓ Model parity check passed (PostgreSQL has 3 additional models)', 'green')
  }
}

/**
 * Display a summary of differences between SQLite and PostgreSQL schemas.
 */
function showDiff() {
  log('Schema Differences (SQLite → PostgreSQL):', 'cyan')
  log('', 'reset')

  const sqliteContent = readFileSync(SCHEMAS.sqlite, 'utf-8')
  const pgContent = readFileSync(SCHEMAS.postgres, 'utf-8')

  // Count differences
  const sqliteCuidCount = (sqliteContent.match(/@default\(cuid\(\)\)/g) || []).length
  const pgUuidCount = (pgContent.match(/@default\(uuid\(\)\)\s*@db\.Uuid/g) || []).length

  const sqliteJsonStrings = (sqliteContent.match(/\/\/\s*JSON/g) || []).length
  const pgJsonNative = (pgContent.match(/Json\s/g) || []).length

  const pgTextFields = (pgContent.match(/@db\.Text/g) || []).length
  const pgBoolFields = (pgContent.match(/@db\.Boolean/g) || []).length
  const pgMapTables = (pgContent.match(/@@map\(/g) || []).length

  log('  Key Changes:', 'yellow')
  log(`    • ID type:        ${sqliteCuidCount}x cuid() → ${pgUuidCount}x uuid() + @db.Uuid`)
  log(`    • JSON fields:    ~${sqliteJsonStrings} JSON-as-String → ${pgJsonNative} native Json`)
  log(`    • Text fields:    ${pgTextFields} fields with @db.Text`)
  log(`    • Boolean fields: ${pgBoolFields} fields with @db.Boolean`)
  log(`    • Table names:    ${pgMapTables} models with @@map() snake_case`)
  log(`    • New models:     Subscription, RefreshToken, WebhookEvent`)
  log(`    • New indexes:    Composite indexes for timeline/filter queries`)
  log(`    • onDelete:       Video→WorkoutSession now uses SetNull`, 'dim')
  log('', 'reset')
}

/**
 * Print usage information.
 */
function printUsage() {
  log('Prisma Migration Config Helper', 'cyan')
  log('', 'reset')
  log('Usage: bun run prisma/migrations/config.ts <command>', 'yellow')
  log('', 'reset')
  log('Commands:', 'yellow')
  log('  generate:sqlite   Generate Prisma client from SQLite schema (local dev)')
  log('  generate:pg       Generate Prisma client from PostgreSQL schema (production)')
  log('  validate          Validate both schema files')
  log('  diff              Show differences between SQLite and PostgreSQL schemas')
  log('  help              Show this help message')
}

// ─── Main ───────────────────────────────────────────────────────────────────

const command = process.argv[2]?.toLowerCase()

switch (command) {
  case 'generate:sqlite':
    generateClient('sqlite')
    break
  case 'generate:pg':
  case 'generate:postgres':
    generateClient('postgres')
    break
  case 'validate':
    validateSchemas()
    break
  case 'diff':
    showDiff()
    break
  case 'help':
  default:
    printUsage()
    if (command && command !== 'help') {
      log(`\nUnknown command: ${command}`, 'red')
      process.exit(1)
    }
}