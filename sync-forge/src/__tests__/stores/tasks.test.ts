import { describe, it, expect, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useTaskStore } from '@/stores'
import { mockTasks } from '../mocks'

describe(`useTaskStore`, () => {
  it(`should have mock tasks as initial state`, () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        tasks: { tasks: mockTasks }
      }
    })
    const store = useTaskStore(pinia)

    expect(store.tasks).toHaveLength(mockTasks.length)
    expect(store.tasks[0]?.title).toBe(mockTasks[0]?.title)
  })
})
