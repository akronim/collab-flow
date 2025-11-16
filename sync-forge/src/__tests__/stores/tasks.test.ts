import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '@/stores'

describe('useTaskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have initial task', () => {
    const store = useTaskStore()
    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0]?.title).toBe('Design hero')
  })
})