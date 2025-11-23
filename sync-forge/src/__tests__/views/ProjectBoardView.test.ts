import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProjectBoardView from '@/views/ProjectBoardView.vue'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useProjectStore, useTaskStore } from '@/stores'

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

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes
    })
  })

  it(`renders the KanbanBoard when the project is valid`, async () => {
    const projectStore = useProjectStore()
    const taskStore = useTaskStore()
    const { projects } = storeToRefs(projectStore)
    projects.value = [{ id: `project-1`, name: `Test Project`, description: ``, createdAt: new Date().toISOString() }]
    const setCurrentProjectSpy = vi.spyOn(taskStore, `setCurrentProject`)

    await router.push(`/projects/project-1`)
    await router.isReady()

    const wrapper = mount(ProjectBoardView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    expect(wrapper.find(`[data-testid="kanban-board"]`).exists()).toBe(true)
    expect(wrapper.text()).toContain(`Demo Project Kanban`)
    expect(setCurrentProjectSpy).toHaveBeenCalledWith(`project-1`)
  })

  it(`renders a 404 message when the project is invalid`, async () => {
    const projectStore = useProjectStore()
    const taskStore = useTaskStore()
    const { projects } = storeToRefs(projectStore)
    projects.value = [] 
    const clearCurrentProjectSpy = vi.spyOn(taskStore, `clearCurrentProject`)

    await router.push(`/projects/invalid-id`)
    await router.isReady()

    const wrapper = mount(ProjectBoardView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    expect(wrapper.find(`[data-testid="kanban-board"]`).exists()).toBe(false)
    expect(wrapper.text()).toContain(`404`)
    expect(wrapper.text()).toContain(`Project not found`)
    expect(clearCurrentProjectSpy).toHaveBeenCalled()
  })

  it(`calls clearCurrentProject on unmount`, async () => {
    const projectStore = useProjectStore()
    const taskStore = useTaskStore()
    const { projects } = storeToRefs(projectStore)
    projects.value = [{ id: `project-1`, name: `Test Project`, description: ``, createdAt: new Date().toISOString() }]
    const clearCurrentProjectSpy = vi.spyOn(taskStore, `clearCurrentProject`)

    await router.push(`/projects/project-1`)
    await router.isReady()

    const wrapper = mount(ProjectBoardView, {
      global: {
        plugins: [router]
      }
    })
    await flushPromises()

    wrapper.unmount()

    expect(clearCurrentProjectSpy).toHaveBeenCalled()
  })
})
