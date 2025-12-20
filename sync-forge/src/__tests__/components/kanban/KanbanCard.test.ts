import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import KanbanCard from '@/components/kanban/KanbanCard.vue'
import type { Task } from '@/types/task'

const MOCK_TASK: Task = {
  id: `task-1`,
  title: `Design the new login page`,
  description: `Create a modern and user-friendly login page design.`,
  status: `todo`,
  projectId: `proj-1`,
  order: 0,
  assigneeId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe(`KanbanCard.vue`, () => {
  it(`renders task title and description`, () => {
    const wrapper = mount(KanbanCard, { props: { task: MOCK_TASK } })

    expect(wrapper.text()).toContain(MOCK_TASK.title)
    expect(wrapper.text()).toContain(MOCK_TASK.description)
  })

  it(`renders 'No description' when task description is empty`, () => {
    const taskWithoutDescription = { ...MOCK_TASK, description: `` }
    const wrapper = mount(KanbanCard, { props: { task: taskWithoutDescription } })

    expect(wrapper.text()).toContain(`No description`)
  })

  it(`emits an edit event on edit button click`, async () => {
    const wrapper = mount(KanbanCard, { props: { task: MOCK_TASK } })
    await wrapper.find(`button[title="Edit task"]`).trigger(`click`)

    expect(wrapper.emitted(`edit`)).toBeDefined()
  })

  it(`emits a delete event on delete button click`, () => {
    const wrapper = mount(KanbanCard, { props: { task: MOCK_TASK } })
    
    // Simulate the delete event from the DeleteWithConfirmation component
    wrapper.findComponent({ name: `DeleteWithConfirmation` }).vm.$emit(`delete`)

    expect(wrapper.emitted(`delete`)).toBeDefined()
  })

  it(`sets the taskId on drag start`, async () => {
    const wrapper = mount(KanbanCard, { props: { task: MOCK_TASK } })
    const setData = vi.fn()
    const mockDataTransfer = { setData }

    await wrapper.trigger(`dragstart`, { dataTransfer: mockDataTransfer })

    expect(setData).toHaveBeenCalledWith(`taskId`, MOCK_TASK.id)
  })
})
