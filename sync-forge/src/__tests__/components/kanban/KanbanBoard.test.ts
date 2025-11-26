import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import { createTestingPinia } from '@pinia/testing'
import type { Task } from '@/types/task'
import KanbanColumn from '@/components/kanban/KanbanColumn.vue'
import { useTaskStore } from '@/stores'
import { RouteNames } from '@/constants/routes'

const mockRoute = {
  params: {
    id: `proj-1`
  }
} 

const mockRouter = {
  push: vi.fn()
} 

/* eslint-disable @typescript-eslint/explicit-function-return-type */
vi.mock(`vue-router`, () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))
/* eslint-enable @typescript-eslint/explicit-function-return-type */

vi.mock(`@/components/kanban/KanbanColumn.vue`, () => ({
  default: {
    name: `KanbanColumn`,
    props: [`title`, `status`, `tasks`],
    template: `<div class="kanban-column">{{ title }}</div>`,
    emits: [`add-task`, `move-task`, `edit-task`, `delete-task`]
  }
}))

describe(`KanbanBoard.vue`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockRouter.push).mockClear()
    mockRoute.params.id = `proj-1`
  })

  const mountWithPinia = (tasksState: {
    tasks: Task[]
  }): VueWrapper<InstanceType<typeof KanbanBoard>> => {
    return mount(KanbanBoard, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              tasks: tasksState
            },
            stubActions: false
          })
        ],
        mocks: {
          $route: mockRoute,
          $router: mockRouter
        }
      }
    })
  }

  it(`renders the correct columns`, () => {
    const wrapper = mountWithPinia({
      tasks: [
        {
          id: `task-1`,
          projectId: `proj-1`,
          status: `todo`,
          title: `Test Task`,
          order: 0,
          description: ``,
          createdAt: ``,
          updatedAt: ``
        }
      ]
    })

    const columnWrappers = wrapper.findAll(`.kanban-column`)

    expect(columnWrappers).toHaveLength(4)
    expect(wrapper.text()).toContain(`Backlog`)
    expect(wrapper.text()).toContain(`To Do`)
    expect(wrapper.text()).toContain(`In Progress`)
    expect(wrapper.text()).toContain(`Done`)
  })

  it(`displays an empty state message when there are no tasks`, () => {
    const wrapper = mountWithPinia({
      tasks: []
    })

    expect(wrapper.text()).toContain(`No tasks yet in this project`)
    expect(wrapper.find(`.kanban-column`).exists()).toBe(true)
  })

  it(`displays empty columns when projectId is null`, () => {
    mockRoute.params.id = ``

    const wrapper = mountWithPinia({
      tasks: [
        {
          id: `1`,
          status: `backlog`,
          title: `Task 1`,
          projectId: `proj-1`,
          order: 1,
          description: ``,
          createdAt: ``,
          updatedAt: ``
        }
      ]
    })

    expect(wrapper.text()).toContain(`No tasks yet in this project`)

    const columns = wrapper.findAll(`.kanban-column`)

    expect(columns).toHaveLength(4)
  })

  it(`only displays tasks for the current project`, () => {
    const wrapper = mountWithPinia({
      tasks: [
        {
          id: `1`,
          status: `todo`,
          title: `Project 1 Task`,
          projectId: `proj-1`,
          order: 1,
          description: ``,
          createdAt: ``,
          updatedAt: ``
        },
        {
          id: `2`,
          status: `todo`,
          title: `Project 2 Task`,
          projectId: `proj-2`,
          order: 1,
          description: ``,
          createdAt: ``,
          updatedAt: ``
        }
      ]
    })

    const columnComponents = wrapper.findAllComponents(KanbanColumn)
    const todoColumn = columnComponents.find(c => c.props(`status`) === `todo`)

    expect(todoColumn).toBeDefined()

    const tasksInTodoColumn = todoColumn?.props(`tasks`) ?? []

    expect(tasksInTodoColumn).toHaveLength(1)
    expect(tasksInTodoColumn[0]?.title).toBe(`Project 1 Task`)
  })

  it(`navigates to create task when add-task is emitted`, () => {
    const wrapper = mountWithPinia({
      tasks: []
    })

    const columnComponents = wrapper.findAllComponents(KanbanColumn)
    const todoColumn = columnComponents.find(c => c.props(`status`) === `todo`)

    todoColumn?.vm.$emit(`add-task`, `todo`)

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: RouteNames.CREATE_TASK,
      params: { id: `proj-1` },
      query: { status: `todo` }
    })
  })

  it(`navigates to edit task when edit-task is emitted`, () => {
    const wrapper = mountWithPinia({
      tasks: []
    })

    const columnComponents = wrapper.findAllComponents(KanbanColumn)
    const todoColumn = columnComponents.find(c => c.props(`status`) === `todo`)

    const testTaskId = `task-123`

    todoColumn?.vm.$emit(`edit-task`, testTaskId)

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: RouteNames.EDIT_TASK,
      params: {
        id: mockRoute.params.id,
        taskId: testTaskId
      }
    })
  })

  it(`deletes a task after confirmation`, () => {
    const task: Task = {
      id: `task-1`,
      projectId: `proj-1`,
      status: `todo`,
      title: `Test Task`,
      order: 0,
      description: ``,
      createdAt: ``,
      updatedAt: ``
    }

    const wrapper = mountWithPinia({
      tasks: [task]
    })

    const taskStore = useTaskStore()

    const confirmSpy = vi.spyOn(window, `confirm`).mockReturnValue(true)

    const columns = wrapper.findAllComponents(KanbanColumn)
    columns[0]?.vm.$emit(`delete-task`, `task-1`)

    expect(confirmSpy).toHaveBeenCalledWith(`Delete this task permanently?`)
    expect(taskStore.deleteTask).toHaveBeenCalledWith(`task-1`)

    confirmSpy.mockRestore()
  })
})
