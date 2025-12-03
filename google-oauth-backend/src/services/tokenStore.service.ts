import { randomUUID } from 'crypto'

/**
 * A simple in-memory store for mapping internal refresh tokens to Google refresh tokens.
 * This is not suitable for production use as it will lose all data on server restart
 * and does not scale beyond a single instance.
 *
 * TODO: Replace with PostgreSQL storage when database is added.
 * Create a `refresh_tokens` table with columns: internal_token, google_token, expires_at.
 */
class InMemoryTokenStore {
  private readonly store = new Map<string, string>()

  /**
   * Generates a new internal refresh token (UUID), stores the mapping to the
   * Google refresh token, and returns the new internal token.
   * @param googleRefreshToken The Google refresh token to store.
   * @returns The generated internal refresh token.
   */
  public generateAndStore(googleRefreshToken: string): string {
    const internalRefreshToken = randomUUID()
    this.store.set(internalRefreshToken, googleRefreshToken)
    return internalRefreshToken
  }

  /**
   * Retrieves the Google refresh token associated with an internal refresh token.
   * @param internalRefreshToken The internal refresh token.
   * @returns The Google refresh token, or undefined if not found.
   */
  public getGoogleRefreshToken(internalRefreshToken: string): string | undefined {
    return this.store.get(internalRefreshToken)
  }

  /**
   * Deletes a token mapping from the store.
   * @param internalRefreshToken The internal refresh token to delete.
   */
  public deleteToken(internalRefreshToken: string): void {
    this.store.delete(internalRefreshToken)
  }
}

export default new InMemoryTokenStore()
