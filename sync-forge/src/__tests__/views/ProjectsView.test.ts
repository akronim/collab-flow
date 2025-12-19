import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProjectsView from '@/views/ProjectsView.vue'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'
import { mockProjects, mockTasks } from '../mocks'
import { useProjectStore } from '@/stores'

describe(`ProjectsView`, () => {
  let router: ReturnType<typeof createRouter>

  const mountComponent = async (): Promise<ReturnType<typeof mount<typeof ProjectsView>>> => {
    router = createRouter({
      history: createMemoryHistory(),
      routes
    })
    await router.push(`/projects`)
    await router.isReady()

    return mount(ProjectsView, {
      global: {
        plugins: [
          router,
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              projects: {
                projects: mockProjects
              },
              projectTasks: {
                tasks: mockTasks
              }
            }
          })
        ]
      }
    })
  }

  it(`renders project and task count`, async () => {
    const wrapper = await mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain(`Website Redesign`)
    expect(wrapper.text()).toContain(`3 tasks`)
  })

  it(`opens and closes the create project modal`, async () => {
    const wrapper = await mountComponent()
    const projectStore = useProjectStore()

    expect(wrapper.findComponent(ProjectForm).exists()).toBe(false)

    await wrapper.find(`[data-testid="create-project-button"]`).trigger(`click`)
    await flushPromises()

    expect(wrapper.findComponent(ProjectForm).exists()).toBe(true)

    const form = wrapper.findComponent(ProjectForm)
    await form.findComponent({ name: `SfInput` }).find(`input`).setValue(`New Project`)
    await form.findComponent({ name: `SfTextarea` }).find(`textarea`).setValue(`New Description`)
    await form.find(`form`).trigger(`submit`)

    expect(projectStore.addProject).toHaveBeenCalledWith({
      name: `New Project`,
      description: `New Description`
    })
    
    await flushPromises()

    expect(wrapper.findComponent(ProjectForm).exists()).toBe(false)
  })

  it(`opens the edit project modal and submits the form`, async () => {
    const wrapper = await mountComponent()
    const projectStore = useProjectStore()
    const projectToUpdate = mockProjects[0]

    // Find the first "Edit" button and click it
    await wrapper.find(`[data-testid="edit-project-${projectToUpdate?.id}"]`).trigger(`click`)
    await flushPromises()

    expect(wrapper.findComponent(ProjectForm).exists()).toBe(true)

    const form = wrapper.findComponent(ProjectForm)
    await form.findComponent({ name: `SfInput` }).find(`input`).setValue(`Updated Project`)
    await form.find(`form`).trigger(`submit`)

    expect(projectStore.updateProject).toHaveBeenCalledWith(projectToUpdate?.id, {
      name: `Updated Project`,
      description: projectToUpdate?.description
    })
  })

  it(`deletes a project after confirmation`, async () => {
    const wrapper = await mountComponent()
    const projectStore = useProjectStore()
    const projectToDelete = mockProjects[0]

    // Find the first "Delete" button and click it
    await wrapper.find(`[data-testid="delete-confirm-button-${projectToDelete?.id}"]`).trigger(`click`)
    await flushPromises()

    // Find the "Sure?" button and click it
    await wrapper.find(`[data-testid="delete-button-${projectToDelete?.id}"]`).trigger(`click`)

    expect(projectStore.deleteProject).toHaveBeenCalledWith(projectToDelete?.id)
  })
})
