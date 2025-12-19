import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskForm from '@/components/tasks/TaskForm.vue'
import { SfInput } from '@/components/ui'

describe(`TaskForm.vue`, () => {
  it(`renders the form with title and description`, () => {
    const wrapper = mount(TaskForm, {
      props: {
        isEditMode: false,
        isLoading: false,
        titleExists: true,
        modelValue: { title: ``, description: `` }
      }
    })

    expect(wrapper.findComponent(SfInput).exists()).toBe(true)

    const labels = wrapper.findAll(`label`)
    const descriptionLabel = labels.find(label => label.text() === `Description`)

    expect(descriptionLabel?.exists()).toBe(true)
  })

  it(`emits submit and cancel events`, async () => {
    const wrapper = mount(TaskForm, {
      props: {
        isEditMode: false,
        isLoading: false,
        titleExists: true,
        modelValue: { title: `Test`, description: `` }
      }
    })

    await wrapper.find(`form`).trigger(`submit`)

    expect(wrapper.emitted(`submit`)).toHaveLength(1)

    await wrapper.find(`button[type="button"]`).trigger(`click`)

    expect(wrapper.emitted(`cancel`)).toHaveLength(1)
  })

  it(`displays correct button text for new and edit modes`, () => {
    const createWrapper = mount(TaskForm, {
      props: {
        isEditMode: false,
        isLoading: false,
        titleExists: true,
        modelValue: { title: ``, description: `` }
      }
    })

    expect(createWrapper.find(`button[type="submit"]`).text()).toContain(`Create Task`)

    const editWrapper = mount(TaskForm, {
      props: {
        isEditMode: true,
        isLoading: false,
        titleExists: true,
        modelValue: { title: `Test`, description: `` }
      }
    })

    expect(editWrapper.find(`button[type="submit"]`).text()).toContain(`Update Task`)
  })

  it(`disables submit button when loading or title does not exist`, () => {
    const loadingWrapper = mount(TaskForm, {
      props: {
        isEditMode: false,
        isLoading: true,
        titleExists: true,
        modelValue: { title: `Test`, description: `` }
      }
    })

    expect(loadingWrapper.find(`button[type="submit"]`).attributes(`disabled`)).toBeDefined()

    const noTitleWrapper = mount(TaskForm, {
      props: {
        isEditMode: false,
        isLoading: false,
        titleExists: false,
        modelValue: { title: ``, description: `` }
      }
    })

    expect(noTitleWrapper.find(`button[type="submit"]`).attributes(`disabled`)).toBeDefined()
  })

  it(`updates the model value`, async () => {
    const wrapper = mount(TaskForm, {
      props: {
        isEditMode: false,
        isLoading: false,
        titleExists: false,
        modelValue: { title: ``, description: `` },
        'onUpdate:modelValue': (e) => wrapper.setProps({ modelValue: e })
      }
    })

    await wrapper.findComponent(SfInput).setValue(`New Title`)

    expect(wrapper.props(`modelValue`).title).toBe(`New Title`)
  })
})
