import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TaskFormModal from '@/components/kanban/TaskFormModal.vue'
import type { Task } from '@/types/task'
import JoditEditor from '@/components/shared/editors/jodit/JoditEditor.vue'

const MOCK_TASK: Task = {
  id: `task-1`,
  title: `Existing Task`,
  description: `Existing Description`,
  status: `todo`,
  projectId: `proj-1`,
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe(`TaskFormModal.vue`, () => {
  describe(`Create Mode`, () => {
    it(`renders with "New Task" title and empty inputs`, async () => {
      const wrapper = mount(TaskFormModal)
      await flushPromises()

      expect(wrapper.text()).toContain(`New Task`)
      expect((wrapper.find(`input[type="text"]`).element as HTMLInputElement).value).toBe(``)
      expect(wrapper.findComponent(JoditEditor).props(`editorModel`)).toBe(``)
    })

    it(`emits save and close events with new data on submit`, async () => {
      const wrapper = mount(TaskFormModal)
      await flushPromises()
      await wrapper.find(`input[type="text"]`).setValue(`New Title`)
      
      const joditEditor = wrapper.findComponent(JoditEditor)
      await joditEditor.vm.$emit(`update:editorModel`, `New Description`)

      await wrapper.find(`form`).trigger(`submit`)

      const saveEvent = wrapper.emitted(`save`)

      expect(saveEvent).toHaveLength(1)
      expect(saveEvent?.[0]).toStrictEqual([{ title: `New Title`, description: `New Description` }])

      expect(wrapper.emitted(`close`)).toBeDefined()
    })

    it(`emits close on cancel button click`, async () => {
      const wrapper = mount(TaskFormModal)
      await wrapper.find(`button[type="button"]`).trigger(`click`)

      expect(wrapper.emitted(`close`)).toBeDefined()
    })

    it(`does not emit save if title is empty`, async () => {
      const wrapper = mount(TaskFormModal)
      await wrapper.find(`form`).trigger(`submit`)

      expect(wrapper.emitted(`save`)).toBeUndefined()
    })
  })

  describe(`Edit Mode`, () => {
    it(`renders with "Edit Task" title and pre-filled inputs`, async () => {
      const wrapper = mount(TaskFormModal, { props: { task: MOCK_TASK } })
      await flushPromises()

      expect(wrapper.text()).toContain(`Edit Task`)
      expect((wrapper.find(`input[type="text"]`).element as HTMLInputElement).value).toBe(MOCK_TASK.title)
      expect(wrapper.findComponent(JoditEditor).props(`editorModel`)).toBe(MOCK_TASK.description)
    })

    it(`emits save with updated data`, async () => {
      const wrapper = mount(TaskFormModal, { props: { task: MOCK_TASK } })
      await flushPromises()
      await wrapper.find(`input[type="text"]`).setValue(`Updated Title`)
      await wrapper.find(`form`).trigger(`submit`)

      const saveEvent = wrapper.emitted(`save`)

      expect(saveEvent).toHaveLength(1)
      expect(saveEvent?.[0]).toStrictEqual([
        { title: `Updated Title`, description: MOCK_TASK.description }
      ])
    })
  })
})
