import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from '@/stores/notification'

describe(`useNotificationStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe(`show`, () => {
    it(`sets message, type, and visible`, () => {
      const store = useNotificationStore()

      store.show({ message: `Success!`, type: `success` })

      expect(store.message).toBe(`Success!`)
      expect(store.type).toBe(`success`)
      expect(store.visible).toBe(true)
    })

    it(`auto-hides after default duration (5000ms)`, () => {
      const store = useNotificationStore()

      store.show({ message: `Test`, type: `info` })

      expect(store.visible).toBe(true)

      vi.advanceTimersByTime(5000)

      expect(store.visible).toBe(false)
    })

    it(`auto-hides after custom duration`, () => {
      const store = useNotificationStore()

      store.show({ message: `Test`, type: `info`, duration: 2000 })

      vi.advanceTimersByTime(1999)

      expect(store.visible).toBe(true)

      vi.advanceTimersByTime(1)

      expect(store.visible).toBe(false)
    })

    it(`clears previous timeout when showing new notification`, () => {
      const store = useNotificationStore()

      store.show({ message: `First`, type: `info`, duration: 3000 })
      vi.advanceTimersByTime(2000)

      store.show({ message: `Second`, type: `success`, duration: 3000 })
      vi.advanceTimersByTime(2000)

      expect(store.visible).toBe(true)
      expect(store.message).toBe(`Second`)
    })
  })

  describe(`hide`, () => {
    it(`sets visible to false`, () => {
      const store = useNotificationStore()

      store.show({ message: `Test`, type: `info` })
      store.hide()

      expect(store.visible).toBe(false)
    })

    it(`clears timeout`, () => {
      const store = useNotificationStore()

      store.show({ message: `Test`, type: `info` })
      store.hide()

      expect(store.timeoutId).toBeUndefined()
    })
  })
})
