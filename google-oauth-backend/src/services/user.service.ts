import { getDefaultDb } from '../db'
import { type CollabFlowUser, type FindOrCreateRequest } from '../types'
import Logger from '../utils/logger'

interface DbUser {
  id: string
  google_user_id: string | null
  name: string
  email: string
  avatar: string | null
  role: string
  title: string | null
  organization: string | null
  status: string
  last_login: Date | null
  created_at: Date
  updated_at: Date
}

function mapDbUserToCollabFlowUser(dbUser: DbUser): CollabFlowUser {
  return {
    id: dbUser.id,
    googleUserId: dbUser.google_user_id ?? undefined,
    name: dbUser.name,
    email: dbUser.email,
    avatar: dbUser.avatar ?? undefined,
    role: dbUser.role,
    title: dbUser.title ?? undefined,
    organization: dbUser.organization ?? undefined,
    status: dbUser.status,
    lastLogin: dbUser.last_login?.toISOString(),
    createdAt: dbUser.created_at.toISOString(),
    updatedAt: dbUser.updated_at.toISOString()
  }
}

/**
 * Finds an existing user by email or creates a new one from Google OAuth data.
 * Uses direct database access (same DB as collab-flow-api).
 */
export async function findOrCreateUser(data: FindOrCreateRequest): Promise<CollabFlowUser> {
  const { sql } = getDefaultDb()

  // First, try to find user by email
  const existingUsers = await sql<DbUser[]>`
    SELECT * FROM users WHERE email = ${data.email} LIMIT 1
  `

  Logger.log(`[UserService] Found ${String(existingUsers.length)} existing users`)

  if (existingUsers.length > 0) {
    const existingUser = existingUsers[0]
    Logger.log(`[UserService] Found existing user: ${existingUser.id}`)

    // Update lastLogin and link googleUserId if not already linked
    if (!existingUser.google_user_id) {
      const updated = await sql<DbUser[]>`
        UPDATE users
        SET google_user_id = ${data.googleUserId}, last_login = NOW(), updated_at = NOW()
        WHERE id = ${existingUser.id}
        RETURNING *
      `
      return mapDbUserToCollabFlowUser(updated[0])
    } else {
      const updated = await sql<DbUser[]>`
        UPDATE users
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = ${existingUser.id}
        RETURNING *
      `
      return mapDbUserToCollabFlowUser(updated[0])
    }
  }

  Logger.log(`[UserService] No existing users`)

  // Create new user
  const newUsers = await sql<DbUser[]>`
    INSERT INTO users (google_user_id, email, name, avatar, role, status, last_login)
    VALUES (${data.googleUserId}, ${data.email}, ${data.name}, ${data.avatar ?? null}, 'member', 'active', NOW())
    RETURNING *
  `

  Logger.log(`[UserService] Created new user: ${newUsers[0].id}`)
  return mapDbUserToCollabFlowUser(newUsers[0])
}
