import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '@/stores'

describe(`useTaskStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it(`should have initial task`, () => {
    const store = useTaskStore()

    expect(store.tasks).toHaveLength(3)
    expect(store.tasks[0]?.title).toBe(`Design homepage`)
  })
})
