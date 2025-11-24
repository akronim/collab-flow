import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'
import { mockProjects, mockTasks } from '../mocks'

describe(`HomeView`, () => {
  let router: ReturnType<typeof createRouter>

  it(`renders project and task count`, async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes
    })
    await router.push(`/`)
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [
          router,
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              projects: {
                projects: mockProjects
              },
              tasks: {
                tasks: mockTasks
              }
            }
          })
        ]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain(`Website Redesign`)
    expect(wrapper.text()).toContain(`3 tasks`)
  })
})
