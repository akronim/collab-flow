import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import KanbanColumn from '@/components/kanban/KanbanColumn.vue'
import type { Task, TaskStatus } from '@/types/task'

vi.mock(`@/components/kanban/KanbanCard.vue`, () => ({
  default: {
    props: [`task`],
    template: `<div class="kanban-card">{{ task.title }}</div>`
  }
}))

const MOCK_TASKS: Task[] = [
  {
    id: `task-1`,
    title: `Task 1`,
    status: `todo`,
    projectId: `proj-1`,
    order: 0,
    description: ``,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `task-2`,
    title: `Task 2`,
    status: `todo`,
    projectId: `proj-1`,
    order: 1,
    description: ``,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

describe(`KanbanColumn.vue`, () => {
  it(`renders the title and task count`, () => {
    const wrapper = mount(KanbanColumn, {
      props: {
        title: `To Do`,
        status: `todo` as TaskStatus,
        tasks: MOCK_TASKS
      }
    })

    expect(wrapper.text()).toContain(`To Do`)
    expect(wrapper.find(`.rounded-full`).text()).toBe(String(MOCK_TASKS.length))
  })

  it(`renders a KanbanCard for each task`, () => {
    const wrapper = mount(KanbanColumn, {
      props: {
        title: `To Do`,
        status: `todo` as TaskStatus,
        tasks: MOCK_TASKS
      }
    })

    const cards = wrapper.findAll(`.kanban-card`)

    expect(cards).toHaveLength(MOCK_TASKS.length)
    
    const cardTexts = cards.map(card => card.text())

    expect(cardTexts).toStrictEqual([`Task 1`, `Task 2`])
  })

  it(`emits an add-task event on button click`, async () => {
    const wrapper = mount(KanbanColumn, {
      props: {
        title: `To Do`,
        status: `todo` as TaskStatus,
        tasks: []
      }
    })

    await wrapper.find(`button`).trigger(`click`)

    const addTaskEvent = wrapper.emitted(`add-task`)

    expect(addTaskEvent).toBeDefined()
    expect(addTaskEvent).toHaveLength(1)
  })

  it(`emits a move-task event on drop`, async () => {
    const wrapper = mount(KanbanColumn, {
      props: {
        title: `Done`,
        status: `done` as TaskStatus,
        tasks: []
      }
    })

    const mockDataTransfer = {
      getData: vi.fn().mockReturnValue(`task-dropped`),
      setData: vi.fn(),
      dropEffect: ``,
      effectAllowed: ``,
      files: FileList.prototype,
      items: DataTransferItemList.prototype,
      types: []
    }

    await wrapper.find(`.flex-shrink-0`).trigger(`drop`, {
      dataTransfer: mockDataTransfer
    })

    const moveTaskEvent = wrapper.emitted(`move-task`)

    expect(moveTaskEvent).toBeDefined()
    expect(moveTaskEvent?.[0]).toStrictEqual([`task-dropped`, `done`])
  })
})
