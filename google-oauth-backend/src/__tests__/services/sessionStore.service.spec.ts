import { describe, it, expect, beforeEach, vi } from 'vitest'
import type session from 'express-session'
import { InMemorySessionStore } from '../../services/sessionStore.service'

describe(`InMemorySessionStore`, () => {
  let store: InMemorySessionStore

  beforeEach(() => {
    store = new InMemorySessionStore()
    store.clear()
  })

  const sid1 = `SID_1`
  const sid2 = `SID_2`
  const userA = `USER_A`

  const sessionA: session.SessionData = {
    cookie: { maxAge: null } as any,
    userId: userA,
    email: `userA@example.com`,
    name: `User A`,
    encryptedGoogleRefreshToken: `token123`
  }

  const sessionA2: session.SessionData = {
    cookie: { maxAge: null } as any,
    userId: userA,
    email: `userA+2@example.com`,
    name: `User A Device 2`,
    encryptedGoogleRefreshToken: `token456`
  }

  // -------------------------------------------------------
  // set() + get()
  // -------------------------------------------------------
  it(`stores and retrieves a session`, () => {
    store.set(sid1, sessionA)

    store.get(sid1, (err, data) => {
      expect(err).toBeNull()
      expect(data).toBeDefined()
      expect(data?.userId).toBe(userA)
      expect(data?.email).toBe(`userA@example.com`)
    })
  })

  it(`returns null for non-existing session`, () => {
    store.get(`NON_EXISTENT`, (err, data) => {
      expect(err).toBeNull()
      expect(data).toBeNull()
    })
  })

  // -------------------------------------------------------
  // user session tracking
  // -------------------------------------------------------
  it(`tracks sessions by userId for logout-all-devices`, () => {
    store.set(sid1, sessionA)
    store.set(sid2, sessionA2)

    expect(store.getUserSessionCount(userA)).toBe(2)
    expect(store.getSessionCount()).toBe(2)
  })

  // -------------------------------------------------------
  // destroy()
  // -------------------------------------------------------
  it(`destroys a single session and updates user session map`, () => {
    store.set(sid1, sessionA)
    store.set(sid2, sessionA2)

    store.destroy(sid1)

    expect(store.getSessionCount()).toBe(1)
    expect(store.getUserSessionCount(userA)).toBe(1)
  })

  it(`destroy() on unknown session does not throw`, () => {
    expect(() => store.destroy(`unknown`)).not.toThrow()
  })

  // -------------------------------------------------------
  // destroyAllByUserId()
  // -------------------------------------------------------
  it(`destroys all sessions for a user ("logout all devices")`, () => {
    store.set(sid1, sessionA)
    store.set(sid2, sessionA2)

    store.destroyAllByUserId(userA)

    expect(store.getUserSessionCount(userA)).toBe(0)
    expect(store.getSessionCount()).toBe(0)
  })

  // -------------------------------------------------------
  // touch()
  // -------------------------------------------------------
  it(`touch() is a no-op but invokes callback`, () => {
    const callback = vi.fn()

    store.set(sid1, sessionA)
    store.touch(sid1, sessionA, callback)

    expect(callback).toHaveBeenCalled()
  })

  // -------------------------------------------------------
  // clear()
  // -------------------------------------------------------
  it(`clear() removes all sessions and user mappings`, () => {
    store.set(sid1, sessionA)
    store.set(sid2, sessionA2)

    store.clear()

    expect(store.getSessionCount()).toBe(0)
    expect(store.getUserSessionCount(userA)).toBe(0)
  })
})
