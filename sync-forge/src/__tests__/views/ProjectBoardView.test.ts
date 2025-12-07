import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ProjectBoardView from '@/views/ProjectBoardView.vue'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Project } from '@/types/project'
import { RouteNames } from '@/constants/routes'
import { projectApiService } from '@/services/project.service'
import { taskApiService } from '@/services/task.service'
import ApiCallResult from '@/utils/apiCallResult'

vi.mock(`@/components/kanban/KanbanBoard.vue`, () => ({
  default: {
    template: `<div data-testid="kanban-board"></div>`
  }
}))

vi.mock(`@/services/project.service`, () => ({
  projectApiService: {
    getProjectById: vi.fn()
  }
}))

vi.mock(`@/services/task.service`, () => ({
  taskApiService: {
    getTasksByProjectId: vi.fn()
  }
}))

const routes = [
  { path: `/`, name: RouteNames.HOME, component: { template: `<div>Home</div>` } },
  { path: `/projects/:projectId`, name: RouteNames.PROJECT_BOARD, component: ProjectBoardView }
]

describe(`ProjectBoardView.vue`, () => {
  let router: ReturnType<typeof createRouter>

  const mountComponent = (): VueWrapper<InstanceType<typeof ProjectBoardView>> => {
    return mount(ProjectBoardView, {
      global: {
        plugins: [
          router,
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false
          })
        ]
      }
    })
  }

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory(),
      routes
    })
    vi.clearAllMocks()
  })

  it(`renders the KanbanBoard when the project is valid`, async () => {
    const mockProject: Project = {
      id: `project-1`,
      name: `Test Project`,
      description: ``,
      createdAt: new Date().toISOString()
    }
    vi.mocked(projectApiService.getProjectById).mockResolvedValue(
      ApiCallResult.Success(mockProject, 200)
    )
    vi.mocked(taskApiService.getTasksByProjectId).mockResolvedValue(
      ApiCallResult.Success([], 200)
    )

    await router.push(`/projects/project-1`)
    await router.isReady()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find(`[data-testid="kanban-board"]`).exists()).toBe(true)
    expect(wrapper.text()).toContain(`Test Project`)
    expect(taskApiService.getTasksByProjectId).toHaveBeenCalledWith(`project-1`)
  })

  it(`renders a 404 message when the project is invalid`, async () => {
    vi.mocked(projectApiService.getProjectById).mockResolvedValue(
      ApiCallResult.Fail(new Error(`Not found`))
    )
    vi.mocked(taskApiService.getTasksByProjectId).mockResolvedValue(
      ApiCallResult.Success([], 200)
    )

    await router.push(`/projects/invalid-id`)
    await router.isReady()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find(`[data-testid="kanban-board"]`).exists()).toBe(false)
    expect(wrapper.text()).toContain(`404`)
    expect(wrapper.text()).toContain(`Project not found`)
  })
})
