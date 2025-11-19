import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores'

describe(`useProjectStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it(`should have initial project`, () => {
    const store = useProjectStore()

    expect(store.projects).toHaveLength(1)
    expect(store.projects[0]?.name).toBe(`Website Redesign`)
  })
})
