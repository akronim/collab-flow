import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '@/stores'

vi.mock(`@/components/kanban/KanbanColumn.vue`, () => ({
  default: {
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
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it(`renders the correct columns`, () => {
    const taskStore = useTaskStore()
    taskStore.currentProjectId = `proj-1`
    taskStore.tasks = [
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

    const wrapper = mount(KanbanBoard)

    const columnWrappers = wrapper.findAll(`.kanban-column`)

    expect(columnWrappers).toHaveLength(4)
    expect(wrapper.text()).toContain(`Backlog`)
    expect(wrapper.text()).toContain(`To Do`)
    expect(wrapper.text()).toContain(`In Progress`)
    expect(wrapper.text()).toContain(`Done`)
  })

  it(`displays an empty state message when there are no tasks`, () => {
    const taskStore = useTaskStore()
    taskStore.currentProjectId = `proj-1`
    taskStore.tasks = []

    const wrapper = mount(KanbanBoard)

    expect(wrapper.text()).toContain(`No tasks yet in this project`)
    expect(wrapper.find(`.kanban-column`).exists()).toBe(true)
  })
})
