import { describe, it, expect, vi } from 'vitest'
import type { PiniaPluginContext, Store } from 'pinia'
import { authPlugin } from '@/plugins/auth'

describe(`authPlugin`, () => {
  it(`calls fetchUser only on auth store`, async () => {
    const mockFetchUser = vi.fn().mockResolvedValue(undefined)
    
    const authStore = {
      $id: `auth`,
      fetchUser: mockFetchUser
    } as unknown as Store

    const otherStore = {
      $id: `not-auth`,
      fetchUser: mockFetchUser
    } as unknown as Store

    await authPlugin({ store: authStore } as PiniaPluginContext)

    expect(mockFetchUser).toHaveBeenCalledTimes(1)

    mockFetchUser.mockClear()
    
    await authPlugin({ store: otherStore } as PiniaPluginContext)

    expect(mockFetchUser).not.toHaveBeenCalled()
  })

  it(`does nothing if store has no fetchUser method`, async () => {
    const storeWithoutFetchUser = {
      $id: `auth`
    } as unknown as Store

    await expect(
      authPlugin({ store: storeWithoutFetchUser } as PiniaPluginContext)
    ).resolves.not.toThrow()
  })
})
