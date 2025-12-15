import session from 'express-session'
import Logger from '../utils/logger'

/**
 * Custom session data stored in each session.
 * This extends the base SessionData from express-session.
 */
export interface CollabFlowSessionData {
  userId: string
  email: string
  name: string
  encryptedGoogleRefreshToken: string
}

/**
 * In-memory session store with support for "logout from all devices" feature.
 *
 * WARNING: This is NOT production-ready. Sessions are lost on server restart.
 * TODO: Replace with PostgresSessionStore using connect-pg-simple.
 */
export class InMemorySessionStore extends session.Store {
  private sessions = new Map<string, string>() // sid -> JSON session data
  private userSessions = new Map<string, Set<string>>() // userId -> Set of sids

  /**
   * Retrieve a session by its ID.
   */
  get(
    sid: string,
    callback: (err?: Error | null, session?: session.SessionData | null) => void
  ): void {
    const data = this.sessions.get(sid)
    Logger.log(`[SessionStore] GET sid: ${sid} | data: ${data}`)
    callback(null, data ? JSON.parse(data) : null)
  }

  /**
   * Store or update a session.
   * Also tracks the session by userId for "logout all devices" support.
   */
  set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: Error) => void
  ): void {
    Logger.log(`[SessionStore] SET sid: ${sid} | sessionData: ${JSON.stringify(sessionData)}`)
    this.sessions.set(sid, JSON.stringify(sessionData))

    // Track session by userId for "logout all devices"
    const userId = (sessionData as unknown as CollabFlowSessionData).userId
    if (userId) {
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set())
      }
      this.userSessions.get(userId)!.add(sid)
    }

    callback?.()
  }

  /**
   * Destroy a single session by its ID.
   * Also removes it from the userId tracking map.
   */
  destroy(sid: string, callback?: (err?: Error) => void): void {
    const data = this.sessions.get(sid)
    if (data) {
      const parsed = JSON.parse(data) as CollabFlowSessionData
      const userId = parsed.userId
      if (userId) {
        this.userSessions.get(userId)?.delete(sid)
        // Clean up empty sets
        if (this.userSessions.get(userId)?.size === 0) {
          this.userSessions.delete(userId)
        }
      }
    }
    this.sessions.delete(sid)
    callback?.()
  }

  /**
   * Touch a session to refresh its expiry without modifying data.
   * For in-memory store, this is a no-op since we don't track expiry internally
   * (express-session handles expiry via cookie maxAge).
   */
  touch(
    _sid: string,
    _session: session.SessionData,
    callback?: (err?: Error) => void
  ): void {
    callback?.()
  }

  /**
   * Destroy ALL sessions for a given user.
   * This enables the "logout from all devices" feature.
   */
  destroyAllByUserId(userId: string, callback?: (err?: Error) => void): void {
    const sids = this.userSessions.get(userId)
    if (sids) {
      for (const sid of sids) {
        this.sessions.delete(sid)
      }
      this.userSessions.delete(userId)
    }
    callback?.()
  }

  /**
   * Get the count of active sessions (for debugging/monitoring).
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Get the count of sessions for a specific user (for debugging/monitoring).
   */
  getUserSessionCount(userId: string): number {
    return this.userSessions.get(userId)?.size ?? 0
  }

  /**
   * Clear all sessions (useful for testing).
   */
  clear(): void {
    this.sessions.clear()
    this.userSessions.clear()
  }
}

// Export singleton instance
export const sessionStore = new InMemorySessionStore()
