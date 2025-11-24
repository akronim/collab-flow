import { describe, it, expect, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import { createTestingPinia } from '@pinia/testing'
import type { Task } from '@/types/task'
import KanbanColumn from '@/components/kanban/KanbanColumn.vue'

vi.mock(`@/components/kanban/KanbanColumn.vue`, () => ({
  default: {
    name: `KanbanColumn`,
    props: [`title`, `status`, `tasks`],
    template: `<div class="kanban-column">{{ title }}</div>`
  }
}))
vi.mock(`@/components/kanban/TaskFormModal.vue`, () => ({
  default: {
    template: `<div data-testid="task-form-modal"></div>`
  }
}))

describe(`KanbanBoard.vue`, () => {
  const mountWithPinia = (tasksState: {
    tasks: Task[]
    currentProjectId: string | null
  }): VueWrapper<InstanceType<typeof KanbanBoard>> => {
    return mount(KanbanBoard, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              tasks: tasksState
            }
          })
        ]
      }
    })
  }

  it(`renders the correct columns`, () => {
    const wrapper = mountWithPinia({
      currentProjectId: `proj-1`,
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
      currentProjectId: `proj-1`,
      tasks: []
    })

    expect(wrapper.text()).toContain(`No tasks yet in this project`)
    expect(wrapper.find(`.kanban-column`).exists()).toBe(true)
  })

  it(`displays empty columns when currentProjectId is null`, () => {
    const wrapper = mountWithPinia({
      currentProjectId: null,
      tasks: [
        {
          id: `1`,
          status: `backlog`,
          title: `Task 1`,
          projectId: `proj-1`,
          order: 1,
          createdAt: ``,
          updatedAt: ``
        }
      ]
    })

    expect(wrapper.text()).toContain(`No tasks yet in this project`)

    const columns = wrapper.findAll(`.kanban-column`)

    expect(columns).toHaveLength(4) // The columns are still rendered
  })

  it(`only displays tasks for the current project`, () => {
    const wrapper = mountWithPinia({
      currentProjectId: `proj-1`,
      tasks: [
        {
          id: `1`,
          status: `todo`,
          title: `Project 1 Task`,
          projectId: `proj-1`,
          order: 1,
          createdAt: ``,
          updatedAt: ``
        },
        {
          id: `2`,
          status: `todo`,
          title: `Project 2 Task`,
          projectId: `proj-2`,
          order: 1,
          createdAt: ``,
          updatedAt: ``
        }
      ]
    })

    const columns = wrapper.findAllComponents<typeof KanbanColumn>(
      `.kanban-column`
    )
    const todoColumn = columns.find(c => c.props(`status`) === `todo`)

    expect(todoColumn).toBeDefined()
    expect(todoColumn?.props(`tasks`)).toHaveLength(1)
    expect(todoColumn?.props(`tasks`)[0]?.title).toBe(`Project 1 Task`)
  })
})
