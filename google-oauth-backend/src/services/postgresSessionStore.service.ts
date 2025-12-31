import session from 'express-session'
import type { Sql } from 'postgres'
import Logger from '../utils/logger'

/**
 * Custom session data stored in each session.
 */
export interface CollabFlowSessionData {
  userId: string
  email: string
  name: string
  encryptedGoogleRefreshToken: string
}

/**
 * PostgreSQL session store implementing express-session Store interface.
 * Uses on-read cleanup for expired sessions.
 */
export class PostgresSessionStore extends session.Store {
  constructor(private sql: Sql) {
    super()
  }

  /**
   * Retrieve a session by its ID.
   * Deletes expired sessions on read (on-read cleanup).
   */
  get(
    sid: string,
    callback: (err?: Error | null, session?: session.SessionData | null) => void
  ): void {
    this.getSession(sid)
      .then(sessionData => callback(null, sessionData))
      .catch(err => callback(err))
  }

  private async getSession(sid: string): Promise<session.SessionData | null> {
    const result = await this.sql`
      SELECT data, expires_at FROM sessions WHERE sid = ${sid}
    `

    if (result.length === 0) {
      Logger.log(`[PostgresSessionStore] GET sid: ${sid} | not found`)
      return null
    }

    const row = result[0]
    const expiresAt = new Date(row.expires_at)

    // On-read cleanup: delete if expired
    if (expiresAt < new Date()) {
      Logger.log(`[PostgresSessionStore] GET sid: ${sid} | expired, deleting`)
      await this.sql`DELETE FROM sessions WHERE sid = ${sid}`
      return null
    }

    Logger.log(`[PostgresSessionStore] GET sid: ${sid} | found`)
    return JSON.parse(row.data as string)
  }

  /**
   * Store or update a session.
   * Uses UPSERT for atomic insert/update.
   */
  set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: Error) => void
  ): void {
    this.setSession(sid, sessionData)
      .then(() => callback?.())
      .catch(err => callback?.(err))
  }

  private async setSession(sid: string, sessionData: session.SessionData): Promise<void> {
    const data = JSON.stringify(sessionData)
    const maxAge = sessionData.cookie?.maxAge ?? 86400000 // Default 24 hours
    const expiresAt = new Date(Date.now() + maxAge)

    // Extract userId for the user_id column (enables destroyAllByUserId)
    const userId = (sessionData as unknown as CollabFlowSessionData).userId ?? null

    Logger.log(`[PostgresSessionStore] SET sid: ${sid} | userId: ${userId}`)

    await this.sql`
      INSERT INTO sessions (sid, user_id, data, expires_at)
      VALUES (${sid}, ${userId}, ${data}, ${expiresAt})
      ON CONFLICT (sid) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at
    `
  }

  /**
   * Destroy a single session by its ID.
   */
  destroy(sid: string, callback?: (err?: Error) => void): void {
    this.destroySession(sid)
      .then(() => callback?.())
      .catch(err => callback?.(err))
  }

  private async destroySession(sid: string): Promise<void> {
    Logger.log(`[PostgresSessionStore] DESTROY sid: ${sid}`)
    await this.sql`DELETE FROM sessions WHERE sid = ${sid}`
  }

  /**
   * Touch a session to refresh its expiry without modifying data.
   */
  touch(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: Error) => void
  ): void {
    this.touchSession(sid, sessionData)
      .then(() => callback?.())
      .catch(err => callback?.(err))
  }

  private async touchSession(sid: string, sessionData: session.SessionData): Promise<void> {
    const maxAge = sessionData.cookie?.maxAge ?? 86400000
    const expiresAt = new Date(Date.now() + maxAge)

    Logger.log(`[PostgresSessionStore] TOUCH sid: ${sid}`)
    await this.sql`
      UPDATE sessions SET expires_at = ${expiresAt} WHERE sid = ${sid}
    `
  }

  /**
   * Destroy ALL sessions for a given user.
   * Enables "logout from all devices" feature.
   */
  destroyAllByUserId(userId: string, callback?: (err?: Error) => void): void {
    this.destroyAllByUserIdAsync(userId)
      .then(() => callback?.())
      .catch(err => callback?.(err))
  }

  private async destroyAllByUserIdAsync(userId: string): Promise<void> {
    Logger.log(`[PostgresSessionStore] DESTROY ALL for userId: ${userId}`)
    await this.sql`DELETE FROM sessions WHERE user_id = ${userId}`
  }
}
