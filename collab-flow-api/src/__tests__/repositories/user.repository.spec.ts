import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { createTestContext, type TestContext } from '../setup/test-db'
import { users } from '@/db/schema'

const TEST_USER_1 = {
  id: `11111111-1111-1111-1111-111111111111`,
  name: `Test User 1`,
  email: `test1@example.com`,
  role: `member` as const,
  status: `active` as const,
  googleUserId: `google-user-id-1`
}

const TEST_USER_2 = {
  id: `22222222-2222-2222-2222-222222222222`,
  name: `Test User 2`,
  email: `test2@example.com`,
  role: `admin` as const,
  status: `active` as const,
  googleUserId: null
}

describe(`User Repository`, () => {
  let ctx: TestContext

  beforeAll(() => {
    ctx = createTestContext()
  })

  afterAll(async () => {
    await ctx.close()
  })

  beforeEach(async () => {
    await ctx.resetDb()
    await ctx.db.insert(users).values([TEST_USER_1, TEST_USER_2])
  })

  describe(`find`, () => {
    it(`should return all users`, async () => {
      const result = await ctx.userRepository.find()

      expect(result).toHaveLength(2)
      expect(result.map(u => u.email)).toContain(TEST_USER_1.email)
      expect(result.map(u => u.email)).toContain(TEST_USER_2.email)
    })

    it(`should return users with correct properties`, async () => {
      const result = await ctx.userRepository.find()
      const user1 = result.find(u => u.id === TEST_USER_1.id)

      expect(user1).toBeDefined()
      expect(user1?.name).toBe(TEST_USER_1.name)
      expect(user1?.email).toBe(TEST_USER_1.email)
      expect(user1?.role).toBe(TEST_USER_1.role)
      expect(user1?.status).toBe(TEST_USER_1.status)
      expect(user1?.googleUserId).toBe(TEST_USER_1.googleUserId)
    })
  })

  describe(`findById`, () => {
    it(`should return a user by id`, async () => {
      const result = await ctx.userRepository.findById(TEST_USER_1.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe(TEST_USER_1.name)
      expect(result?.email).toBe(TEST_USER_1.email)
    })

    it(`should return undefined for non-existent id`, async () => {
      const result = await ctx.userRepository.findById(`99999999-9999-9999-9999-999999999999`)

      expect(result).toBeUndefined()
    })
  })

  describe(`findByEmail`, () => {
    it(`should return a user by email`, async () => {
      const result = await ctx.userRepository.findByEmail(TEST_USER_1.email)

      expect(result).toBeDefined()
      expect(result?.id).toBe(TEST_USER_1.id)
      expect(result?.name).toBe(TEST_USER_1.name)
    })

    it(`should return undefined for non-existent email`, async () => {
      const result = await ctx.userRepository.findByEmail(`nonexistent@example.com`)

      expect(result).toBeUndefined()
    })

    it(`should be case-sensitive`, async () => {
      const result = await ctx.userRepository.findByEmail(`TEST1@EXAMPLE.COM`)

      expect(result).toBeUndefined()
    })
  })

  describe(`findByGoogleUserId`, () => {
    it(`should return a user by googleUserId`, async () => {
      const result = await ctx.userRepository.findByGoogleUserId(TEST_USER_1.googleUserId!)

      expect(result).toBeDefined()
      expect(result?.id).toBe(TEST_USER_1.id)
      expect(result?.email).toBe(TEST_USER_1.email)
    })

    it(`should return undefined for non-existent googleUserId`, async () => {
      const result = await ctx.userRepository.findByGoogleUserId(`non-existent-google-id`)

      expect(result).toBeUndefined()
    })

    it(`should return undefined when user has null googleUserId`, async () => {
      // TEST_USER_2 has null googleUserId
      const result = await ctx.userRepository.findByGoogleUserId(``)

      expect(result).toBeUndefined()
    })
  })

  describe(`create`, () => {
    it(`should create a new user with generated id and timestamps`, async () => {
      const newUserData = {
        name: `New User`,
        email: `new@example.com`,
        role: `member` as const,
        status: `active` as const
      }

      const result = await ctx.userRepository.create(newUserData)

      expect(result.id).toBeDefined()
      expect(result.name).toBe(newUserData.name)
      expect(result.email).toBe(newUserData.email)
      expect(result.role).toBe(newUserData.role)
      expect(result.status).toBe(newUserData.status)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()

      const allUsers = await ctx.userRepository.find()
      expect(allUsers).toHaveLength(3)
    })

    it(`should create user with googleUserId`, async () => {
      const newUserData = {
        name: `Google User`,
        email: `google@example.com`,
        role: `member` as const,
        status: `active` as const,
        googleUserId: `new-google-id`
      }

      const result = await ctx.userRepository.create(newUserData)

      expect(result.googleUserId).toBe(`new-google-id`)
    })

    it(`should create user with optional fields`, async () => {
      const newUserData = {
        name: `Full User`,
        email: `full@example.com`,
        role: `admin` as const,
        status: `active` as const,
        avatar: `https://example.com/avatar.jpg`,
        title: `Senior Developer`,
        organization: `Test Corp`,
        lastLogin: new Date().toISOString()
      }

      const result = await ctx.userRepository.create(newUserData)

      expect(result.avatar).toBe(newUserData.avatar)
      expect(result.title).toBe(newUserData.title)
      expect(result.organization).toBe(newUserData.organization)
      expect(result.lastLogin).toBeDefined()
    })
  })

  describe(`update`, () => {
    it(`should update an existing user`, async () => {
      const updates = { name: `Updated Name` }

      const result = await ctx.userRepository.update(TEST_USER_1.id, updates)

      expect(result).toBeDefined()
      expect(result?.name).toBe(`Updated Name`)
      expect(result?.email).toBe(TEST_USER_1.email)
    })

    it(`should return undefined for non-existent user`, async () => {
      const result = await ctx.userRepository.update(`99999999-9999-9999-9999-999999999999`, { name: `Test` })

      expect(result).toBeUndefined()
    })

    it(`should not modify other fields`, async () => {
      const originalUser = await ctx.userRepository.findById(TEST_USER_1.id)

      const result = await ctx.userRepository.update(TEST_USER_1.id, { name: `New Name` })

      expect(result?.email).toBe(originalUser?.email)
      expect(result?.role).toBe(originalUser?.role)
      expect(result?.googleUserId).toBe(originalUser?.googleUserId)
    })

    it(`should update the updatedAt timestamp`, async () => {
      const before = await ctx.userRepository.findById(TEST_USER_1.id)

      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await ctx.userRepository.update(TEST_USER_1.id, { name: `Updated` })

      expect(new Date(result!.updatedAt).getTime()).toBeGreaterThan(new Date(before!.updatedAt).getTime())
    })

    it(`should link googleUserId to existing user`, async () => {
      // TEST_USER_2 has null googleUserId
      const result = await ctx.userRepository.update(TEST_USER_2.id, { googleUserId: `new-linked-google-id` })

      expect(result).toBeDefined()
      expect(result?.googleUserId).toBe(`new-linked-google-id`)
    })

    it(`should update lastLogin`, async () => {
      const newLastLogin = new Date().toISOString()

      const result = await ctx.userRepository.update(TEST_USER_1.id, { lastLogin: newLastLogin })

      expect(result).toBeDefined()
      expect(result?.lastLogin).toBeDefined()
    })
  })
})
