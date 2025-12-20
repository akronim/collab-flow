import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import { SfInput, SfTextarea, SfButton } from '@/components/ui'

describe(`ProjectForm.vue`, () => {
  it(`renders the form with name and description fields`, () => {
    const wrapper = mount(ProjectForm)

    expect(wrapper.findComponent(SfInput).exists()).toBe(true)
    expect(wrapper.findComponent(SfTextarea).exists()).toBe(true)

    const submitButton = wrapper.findAllComponents(SfButton).find(btn => btn.props(`type`) === `submit`)

    expect(submitButton?.exists()).toBe(true)
  })

  it(`requires the project name`, () => {
    const wrapper = mount(ProjectForm)
    const nameInput = wrapper.findComponent(SfInput)

    expect(nameInput.props(`required`)).toBe(true)
  })

  it(`emits a submit event with the form data`, async () => {
    const wrapper = mount(ProjectForm)

    await wrapper.findComponent(SfInput).setValue(`Test Project`)
    await wrapper.findComponent(SfTextarea).setValue(`This is a test project.`)
    await wrapper.find(`form`).trigger(`submit`)

    expect(wrapper.emitted(`submit`)).toHaveLength(1)
    expect(wrapper.emitted(`submit`)?.[0]).toStrictEqual([{
      name: `Test Project`,
      description: `This is a test project.`
    }])
  })

  it(`emits a cancel event when the cancel button is clicked`, async () => {
    const wrapper = mount(ProjectForm)
    const cancelButton = wrapper.findAllComponents(SfButton).find(btn => btn.text() === `Cancel`)
    
    await cancelButton?.trigger(`click`)

    expect(wrapper.emitted(`cancel`)).toHaveLength(1)
  })

  it(`pre-fills the form with project data`, async () => {
    const project = {
      id: `1`,
      name: `Existing Project`,
      description: `An existing project description.`,
      createdAt: ``,
      updatedAt: ``,
      taskCount: 0
    }
    const wrapper = mount(ProjectForm, {
      props: { project }
    })
    await flushPromises()

    expect(wrapper.findComponent(SfInput).props(`modelValue`)).toBe(`Existing Project`)
    expect(wrapper.findComponent(SfTextarea).props(`modelValue`)).toBe(`An existing project description.`)
  })
})
