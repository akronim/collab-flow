/**
 * Shared test configuration constants.
 * Used by both vitest.config.ts and global-setup.ts to ensure consistency.
 */

/**
 * Number of parallel test workers.
 * Each worker gets its own isolated database.
 */
export const TEST_WORKER_COUNT = 4

/**
 * Prefix for test database names.
 * Worker databases are named: {prefix}_1, {prefix}_2, etc.
 */
export const TEST_DB_PREFIX = `collab_flow_test`
