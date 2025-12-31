import { execSync } from 'node:child_process'
import postgres from 'postgres'
import Logger from '../../utils/logger'
import config from '../../config'
import { TEST_WORKER_COUNT, TEST_DB_PREFIX } from './constants'

/**
 * Parses DATABASE_URL to extract components.
 */
function parseDatabaseUrl(url: string): { baseUrl: string; dbName: string } {
  const lastSlashIndex = url.lastIndexOf(`/`)
  return {
    baseUrl: url.substring(0, lastSlashIndex),
    dbName: url.substring(lastSlashIndex + 1)
  }
}

/**
 * Gets the database URL for a specific worker.
 */
export function getWorkerDatabaseUrl(baseUrl: string, workerId: number): string {
  return `${baseUrl}/${TEST_DB_PREFIX}_${workerId}`
}

/**
 * Drops a database if it exists.
 */
async function dropDatabaseIfExists(adminSql: postgres.Sql, dbName: string): Promise<void> {
  const result = await adminSql`
    SELECT 1 FROM pg_database WHERE datname = ${dbName}
  `

  if (result.length > 0) {
    // Terminate all connections to the database first
    await adminSql.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid()
    `)
    await adminSql.unsafe(`DROP DATABASE "${dbName}"`)
    Logger.log(`[global-setup] Dropped database: ${dbName}`)
  }
}

/**
 * Creates a fresh database (drops existing one first for clean slate).
 */
async function createFreshDatabase(adminSql: postgres.Sql, dbName: string): Promise<void> {
  await dropDatabaseIfExists(adminSql, dbName)
  await adminSql.unsafe(`CREATE DATABASE "${dbName}"`)
  Logger.log(`[global-setup] Created database: ${dbName}`)
}

/**
 * Waits for PostgreSQL to be ready.
 */
async function waitForPostgres(connectionUrl: string, retries = 10): Promise<void> {
  const sql = postgres(connectionUrl, { max: 1 })

  for (let i = 0; i < retries; i++) {
    try {
      await sql`SELECT 1`
      await sql.end()
      return
    } catch (error) {
      if (i === retries - 1) {
        await sql.end()
        throw error
      }
      Logger.log(`[global-setup] Waiting for PostgreSQL... (attempt ${i + 1}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

/**
 * Pushes schema to a specific database using drizzle-kit.
 * Since databases are dropped and recreated fresh, no interactive prompts occur.
 */
function pushSchemaToDatabase(databaseUrl: string): void {
  execSync(`drizzle-kit push`, {
    stdio: `pipe`, // Suppress drizzle-kit output for cleaner logs
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    }
  })
}

/**
 * Global setup runs ONCE before all test files.
 * Creates isolated databases for each parallel worker.
 */
export default async function globalSetup(): Promise<void> {
  const { baseUrl } = parseDatabaseUrl(config.db.url)
  const adminUrl = `${baseUrl}/postgres` // Connect to default 'postgres' db for admin operations

  Logger.log(`[global-setup] Waiting for PostgreSQL...`)
  await waitForPostgres(adminUrl)
  Logger.log(`[global-setup] PostgreSQL is ready.`)

  // Connect to admin database to create worker databases
  const adminSql = postgres(adminUrl, { max: 1 })

  try {
    Logger.log(`[global-setup] Creating ${TEST_WORKER_COUNT} fresh worker databases...`)

    for (let workerId = 1; workerId <= TEST_WORKER_COUNT; workerId++) {
      const workerDbName = `${TEST_DB_PREFIX}_${workerId}`
      await createFreshDatabase(adminSql, workerDbName)
    }
  } finally {
    await adminSql.end()
  }

  // Push schema to each worker database
  Logger.log(`[global-setup] Pushing schema to worker databases...`)
  for (let workerId = 1; workerId <= TEST_WORKER_COUNT; workerId++) {
    const workerDbUrl = getWorkerDatabaseUrl(baseUrl, workerId)
    pushSchemaToDatabase(workerDbUrl)
    Logger.log(`[global-setup] Schema pushed to worker ${workerId}`)
  }

  Logger.log(`[global-setup] Setup complete. ${TEST_WORKER_COUNT} databases ready.`)
}
