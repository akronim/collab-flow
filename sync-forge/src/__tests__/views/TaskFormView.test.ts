import { describe, it, expect, vi, type Mock } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TaskFormView from '@/views/TaskFormView.vue'
import { useTaskForm } from '@/composables/useTaskForm'
import { ref } from 'vue'

vi.mock(import(`@/composables/useTaskForm`))

const mockRoute = {
  params: {
    projectId: `proj-1`,
    taskId: undefined
  },
  query: {
    status: `todo`
  }
}

vi.mock(`vue-router`, () => ({
  useRoute: (): typeof mockRoute => mockRoute,
  useRouter: (): { push: Mock } => ({
    push: vi.fn()
  })
}))

describe(`TaskFormView.vue`, () => {
  const setup = (mockReturnValues: Partial<ReturnType<typeof useTaskForm>>): ReturnType<typeof mount> => {
    vi.mocked(useTaskForm).mockReturnValue({
      form: ref({ title: ``, description: `` }),
      isLoading: ref(false),
      error: ref(null),
      isEditMode: ref(false),
      titleExists: ref(false),
      loadTask: vi.fn(),
      saveTask: vi.fn(),
      cancel: vi.fn(),
      resetForm: vi.fn(),
      ...mockReturnValues
    })

    return mount(TaskFormView)
  }

  it(`renders the correct title for new and edit modes`, () => {
    const newWrapper = setup({ isEditMode: ref(false) })

    expect(newWrapper.text()).toContain(`New Task`)

    const editWrapper = setup({ isEditMode: ref(true) })

    expect(editWrapper.text()).toContain(`Edit Task`)
  })

  it(`shows loading and error states`, () => {
    const loadingWrapper = setup({ isLoading: ref(true) })

    expect(loadingWrapper.text()).toContain(`Loading task...`)

    const errorWrapper = setup({ error: ref(`An error occurred`) })

    expect(errorWrapper.text()).toContain(`An error occurred`)
  })

  it(`calls loadTask on mounted`, async () => {
    const loadTask = vi.fn()
    setup({ loadTask })
    await flushPromises()

    expect(loadTask).toHaveBeenCalled()
  })

  it(`calls saveTask on form submit`, async () => {
    const saveTask = vi.fn()
    const wrapper = setup({ saveTask })
    await wrapper.findComponent({ name: `TaskForm` }).vm.$emit(`submit`)

    expect(saveTask).toHaveBeenCalled()
  })

  it(`calls cancel on form cancel`, async () => {
    const cancel = vi.fn()
    const wrapper = setup({ cancel })
    await wrapper.findComponent({ name: `TaskForm` }).vm.$emit(`cancel`)

    expect(cancel).toHaveBeenCalled()
  })
})
