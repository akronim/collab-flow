import postgres, { type Sql, type Options } from 'postgres'
import config from '../config'
import Logger from '../utils/logger'

/**
 * Pool configuration options for postgres.js connections.
 */
export type PoolOptions = Pick<Options<Record<string, never>>, `max` | `idle_timeout` | `connect_timeout` | `max_lifetime`>

/**
 * Default connection pool configuration.
 */
export const DEFAULT_POOL_CONFIG: Required<PoolOptions> = {
  max: 10, // Smaller pool for session store (less traffic than main API)
  idle_timeout: 30,
  connect_timeout: 10,
  max_lifetime: 1800
}

export interface DbConnection {
  sql: Sql
  close: () => Promise<void>
}

/**
 * Creates a new database connection with connection pooling.
 */
export function createDb(connectionString: string, options?: Partial<PoolOptions>): DbConnection {
  if (!connectionString) {
    throw new Error(`Database connection string is required`)
  }

  Logger.log(`[DB Connection String: ${connectionString}]`)

  const poolConfig: PoolOptions = {
    ...DEFAULT_POOL_CONFIG,
    ...options
  }

  const isDev = config.nodeEnv === `development`
  const sql = postgres(connectionString, {
    ...poolConfig,
    debug: isDev ? (_, query): void => Logger.log(`[SQL]`, query) : undefined
  })

  return {
    sql,
    close: async (): Promise<void> => {
      await sql.end()
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
