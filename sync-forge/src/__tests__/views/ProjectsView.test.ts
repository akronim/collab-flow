import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProjectsView from '@/views/ProjectsView.vue'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'
import { mockProjects, mockTasks } from '../mocks'

describe(`ProjectsView`, () => {
  let router: ReturnType<typeof createRouter>

  it(`renders project and task count`, async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes
    })
    await router.push(`/projects`)
    await router.isReady()

    const wrapper = mount(ProjectsView, {
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
