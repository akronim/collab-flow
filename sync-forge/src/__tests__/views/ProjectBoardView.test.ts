import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ProjectBoardView from '@/views/ProjectBoardView.vue'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Project } from '@/stores/projects'

vi.mock(`@/components/kanban/KanbanBoard.vue`, () => ({
  default: {
    template: `<div data-testid="kanban-board"></div>`
  }
}))

const routes = [
  { path: `/`, name: `home`, component: { template: `<div>Home</div>` } },
  { path: `/projects/:id`, name: `project-board`, component: ProjectBoardView }
]

describe(`ProjectBoardView.vue`, () => {
  let router: ReturnType<typeof createRouter>

  const mountComponent = (
    initialState: { projects?: { projects: Project[] } } = {}
  ): VueWrapper<InstanceType<typeof ProjectBoardView>> => {
    router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    return mount(ProjectBoardView, {
      global: {
        plugins: [
          router,
          createTestingPinia({
            initialState,
            createSpy: vi.fn
          })
        ]
      }
    })
  }

  it(`renders the KanbanBoard when the project is valid`, async () => {
    const wrapper = mountComponent({
      projects: {
        projects: [
          {
            id: `project-1`,
            name: `Test Project`,
            description: ``,
            createdAt: new Date().toISOString()
          }
        ]
      }
    })

    await router.push(`/projects/project-1`)
    await router.isReady()
    await flushPromises()

    expect(wrapper.find(`[data-testid="kanban-board"]`).exists()).toBe(true)
    expect(wrapper.text()).toContain(`Test Project`)
  })

  it(`renders a 404 message when the project is invalid`, async () => {
    const wrapper = mountComponent({
      projects: {
        projects: []
      }
    })

    await router.push(`/projects/invalid-id`)
    await router.isReady()
    await flushPromises()

    expect(wrapper.find(`[data-testid="kanban-board"]`).exists()).toBe(false)
    expect(wrapper.text()).toContain(`404`)
    expect(wrapper.text()).toContain(`Project not found`)
  })
})
