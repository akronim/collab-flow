import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql, type Options } from 'postgres'
import * as schema from './schema'
import config from '../config'
import Logger from '../utils/logger'

export type Database = ReturnType<typeof drizzle<typeof schema>>

/**
 * Pool configuration options for postgres.js connections.
 */
export type PoolOptions = Pick<Options<Record<string, never>>, `max` | `idle_timeout` | `connect_timeout` | `max_lifetime`>

/**
 * Default connection pool configuration.
 * These values are suitable for most production workloads.
 */
export const DEFAULT_POOL_CONFIG: Required<PoolOptions> = {
  max: 20, // Maximum connections in pool
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 10, // Fail connection attempts after 10 seconds
  max_lifetime: 1800 // Rotate connections every 30 minutes (1800 seconds)
}

export interface DbConnection {
  db: Database
  client: Sql
  close: () => Promise<void>
}

/**
 * Creates a new database connection with connection pooling.
 * Caller is responsible for closing the connection when done.
 *
 * @param connectionString - PostgreSQL connection URL
 * @param options - Optional pool configuration to override defaults
 */
export function createDb(connectionString: string, options?: Partial<PoolOptions>): DbConnection {
  if (!connectionString) {
    throw new Error(`Database connection string is required`)
  }

  const poolConfig: PoolOptions = {
    ...DEFAULT_POOL_CONFIG,
    ...options
  }

  const isDev = process.env.NODE_ENV === `development`
  const client = postgres(connectionString, {
    ...poolConfig,
    debug: isDev ? (_, query): void => Logger.log(`[SQL]`, query) : undefined
  })
  const db = drizzle(client, { schema })

  return {
    db,
    client,
    close: async (): Promise<void> => {
      await client.end()
    }
  }
}

/**
 * Default database connection for production use.
 * Lazily initialized on first access.
 */
let defaultConnection: DbConnection | null = null

export function getDefaultDb(): DbConnection {
  if (!defaultConnection) {
    if (!config.db.url) {
      throw new Error(`DATABASE_URL environment variable is not set`)
    }
    defaultConnection = createDb(config.db.url)
  }
  return defaultConnection
}

/**
 * Closes the default database connection.
 * Call this during graceful shutdown.
 */
export async function closeDefaultConnection(): Promise<void> {
  if (defaultConnection) {
    await defaultConnection.close()
    defaultConnection = null
  }
}

// Re-export schema for convenience
export * as schema from './schema'
