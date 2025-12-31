/**
 * Options for the seed guard assertion.
 */
export interface SeedGuardOptions {
  /**
   * When true, allows seeding in production environment.
   * Use with extreme caution - this will delete all existing data.
   */
  force?: boolean
}

/**
 * Asserts that the current environment is not production.
 * Throws an error if NODE_ENV is 'production' unless force option is true.
 *
 * @param options - Optional configuration
 * @throws Error if running in production without force flag
 */
export function assertNotProduction(options?: SeedGuardOptions): void {
  const isProduction = process.env.NODE_ENV === `production`
  const force = options?.force ?? false

  if (isProduction && !force) {
    throw new Error(
      `Seed script cannot run in production environment. ` +
      `This would DELETE ALL DATA. If you really want to do this, use the --force flag.`
    )
  }
}
