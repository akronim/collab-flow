import { describe, it, expect, vi } from 'vitest'
import { createPinia, defineStore } from 'pinia'
import { authPlugin } from '@/plugins/auth'

describe('authPlugin', () => {
  it('calls init on the auth store', () => {
    const pinia = createPinia()
    const useTestAuthStore = defineStore('auth', {
      state: () => ({}),
      actions: {
        init: vi.fn(),
      },
    })

    const store = useTestAuthStore(pinia)

    const spy = vi.spyOn(store, 'init')
    authPlugin({ store })
    expect(spy).toHaveBeenCalled()
  })

  it('does not call init on other stores', () => {
    const pinia = createPinia()
    const useOtherStore = defineStore('other', {
      state: () => ({}),
      actions: {
        init() { },
      },
    })
    const store = useOtherStore(pinia)

    const spy = vi.spyOn(store, 'init')
    authPlugin({ store })
    expect(spy).not.toHaveBeenCalled()
  })
})
