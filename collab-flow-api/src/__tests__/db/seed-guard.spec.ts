import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe(`Seed Guard`, () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe(`assertNotProduction`, () => {
    it(`should throw error when NODE_ENV is production`, async () => {
      process.env.NODE_ENV = `production`

      const { assertNotProduction } = await import(`@/db/seed-guard`)

      expect(() => assertNotProduction()).toThrow(`Seed script cannot run in production environment`)
    })

    it(`should not throw when NODE_ENV is development`, async () => {
      process.env.NODE_ENV = `development`

      const { assertNotProduction } = await import(`@/db/seed-guard`)

      expect(() => assertNotProduction()).not.toThrow()
    })

    it(`should not throw when NODE_ENV is test`, async () => {
      process.env.NODE_ENV = `test`

      const { assertNotProduction } = await import(`@/db/seed-guard`)

      expect(() => assertNotProduction()).not.toThrow()
    })

    it(`should not throw when NODE_ENV is undefined`, async () => {
      delete process.env.NODE_ENV

      const { assertNotProduction } = await import(`@/db/seed-guard`)

      expect(() => assertNotProduction()).not.toThrow()
    })

    it(`should include instruction to use --force in error message`, async () => {
      process.env.NODE_ENV = `production`

      const { assertNotProduction } = await import(`@/db/seed-guard`)

      expect(() => assertNotProduction()).toThrow(/--force/)
    })
  })

  describe(`assertNotProduction with force flag`, () => {
    it(`should not throw in production when force is true`, async () => {
      process.env.NODE_ENV = `production`

      const { assertNotProduction } = await import(`@/db/seed-guard`)

      expect(() => assertNotProduction({ force: true })).not.toThrow()
    })

    it(`should not throw in development regardless of force flag`, async () => {
      process.env.NODE_ENV = `development`

      const { assertNotProduction } = await import(`@/db/seed-guard`)

      expect(() => assertNotProduction({ force: false })).not.toThrow()
      expect(() => assertNotProduction({ force: true })).not.toThrow()
    })
  })
})
