import { describe, it, expect, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useProjectStore } from '@/stores'
import { mockProjects } from '../mocks'

describe(`useProjectStore`, () => {
  it(`should have mock projects as initial state`, () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        projects: { projects: mockProjects }
      }
    })
    const store = useProjectStore(pinia)

    expect(store.projects).toHaveLength(mockProjects.length)
    expect(store.projects[0]?.name).toBe(mockProjects[0]?.name)
  })
})
