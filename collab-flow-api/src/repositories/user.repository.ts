import { eq } from 'drizzle-orm'
import { type Database, getDefaultDb } from '../db'
import { users } from '../db/schema'
import { type User } from '../types/user'

export interface UserRepository {
  find: () => Promise<User[]>
  findById: (id: string) => Promise<User | undefined>
  findByEmail: (email: string) => Promise<User | undefined>
  findByGoogleUserId: (googleUserId: string) => Promise<User | undefined>
  create: (userData: Omit<User, `id` | `createdAt` | `updatedAt`>) => Promise<User>
  update: (id: string, data: Partial<Omit<User, `id` | `createdAt` | `updatedAt`>>) => Promise<User | undefined>
}

type UserUpdateData = Partial<Omit<User, `id` | `createdAt` | `updatedAt`>>

const mapDbUserToUser = (dbUser: typeof users.$inferSelect): User => ({
  id: dbUser.id,
  googleUserId: dbUser.googleUserId ?? undefined,
  name: dbUser.name,
  email: dbUser.email,
  avatar: dbUser.avatar ?? undefined,
  role: dbUser.role,
  title: dbUser.title ?? undefined,
  organization: dbUser.organization ?? undefined,
  status: dbUser.status,
  lastLogin: dbUser.lastLogin?.toISOString(),
  createdAt: dbUser.createdAt.toISOString(),
  updatedAt: dbUser.updatedAt.toISOString()
})

const DIRECT_UPDATE_FIELDS = [`googleUserId`, `name`, `email`, `avatar`, `role`, `title`, `organization`, `status`] as const

/**
 * Builds the set clause for user updates, only including defined fields.
 */
function buildUserUpdateSet(data: UserUpdateData): Record<string, unknown> {
  const set: Record<string, unknown> = { updatedAt: new Date() }

  for (const field of DIRECT_UPDATE_FIELDS) {
    if (data[field] !== undefined) {
      set[field] = data[field]
    }
  }

  if (data.lastLogin !== undefined) {
    set.lastLogin = data.lastLogin ? new Date(data.lastLogin) : null
  }

  return set
}

const createFind = (db: Database) => async (): Promise<User[]> => {
  const result = await db.select().from(users)
  return result.map(mapDbUserToUser)
}

const createFindById = (db: Database) => async (id: string): Promise<User | undefined> => {
  const result = await db.select().from(users).where(eq(users.id, id))
  return result[0] ? mapDbUserToUser(result[0]) : undefined
}

const createFindByEmail = (db: Database) => async (email: string): Promise<User | undefined> => {
  const result = await db.select().from(users).where(eq(users.email, email))
  return result[0] ? mapDbUserToUser(result[0]) : undefined
}

const createFindByGoogleUserId = (db: Database) => async (googleUserId: string): Promise<User | undefined> => {
  const result = await db.select().from(users).where(eq(users.googleUserId, googleUserId))
  return result[0] ? mapDbUserToUser(result[0]) : undefined
}

const createCreate = (db: Database) => async (userData: Omit<User, `id` | `createdAt` | `updatedAt`>): Promise<User> => {
  const result = await db.insert(users).values({
    googleUserId: userData.googleUserId,
    name: userData.name,
    email: userData.email,
    avatar: userData.avatar,
    role: userData.role,
    title: userData.title,
    organization: userData.organization,
    status: userData.status,
    lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null
  }).returning()

  const user = result[0]
  if (!user) {
    throw new Error(`Failed to create user`)
  }
  return mapDbUserToUser(user)
}

const createUpdate = (db: Database) => async (id: string, data: UserUpdateData): Promise<User | undefined> => {
  const result = await db.update(users).set(buildUserUpdateSet(data)).where(eq(users.id, id)).returning()
  return result[0] ? mapDbUserToUser(result[0]) : undefined
}

/**
 * Creates a user repository with the given database connection.
 */
export function createUserRepository(db: Database): UserRepository {
  return {
    find: createFind(db),
    findById: createFindById(db),
    findByEmail: createFindByEmail(db),
    findByGoogleUserId: createFindByGoogleUserId(db),
    create: createCreate(db),
    update: createUpdate(db)
  }
}

/**
 * Default user repository using the default database connection.
 * Use this in production code.
 */
export const userRepository: UserRepository = createUserRepository(getDefaultDb().db)
