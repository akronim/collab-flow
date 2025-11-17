import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import JoditEditor from '@/components/shared/editors/jodit/JoditEditor.vue'

const mockJodit = {
  setEditorValue: vi.fn(),
  value: ``,
  destruct: vi.fn(),
  isReady: false,
  isFocused: true,
  s: {
    insertImage: vi.fn()
  },
  createInside: {
    element: vi.fn(() => ({
      setAttribute: vi.fn()
    }))
  },
  o: { imageDefaultWidth: 150, controls: {} },
  events: {
    on: vi.fn(),
    off: vi.fn()
  }
}

const mockJoditConstructor = {
  make: vi.fn((_element, config) => {
    mockJodit.o.controls = config.controls
    return mockJodit
  })
}

vi.mock(`@/components/shared/editors/jodit/joditLoader`, () => ({
  loadJodit: vi.fn(() => Promise.resolve({
    Jodit: mockJoditConstructor,
    pluginsLoaded: true
  }))
}))

describe(`JoditEditor.vue`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountEditor = async (): Promise<ReturnType<typeof mount<typeof JoditEditor>>> => {
    const wrapper = mount(JoditEditor, {
      props: {
        editorModel: `<p>Initial content</p>`,
        readonly: false,
        config: { placeholder: `Type here...` },
        name: `editor`
      }
    })

    await flushPromises()

    return wrapper
  }

  it(`should render correctly and call Jodit.make on mount`, async () => {
    const wrapper = await mountEditor()

    expect(wrapper.exists()).toBe(true)
    expect(mockJoditConstructor.make).toHaveBeenCalledTimes(1)
  })

  it(`initializes the editor on mount`, async () => {
    const wrapper = await mountEditor()

    expect(wrapper.vm.joditInstance).toBeDefined()
    expect(wrapper.vm.joditInstance).toStrictEqual(mockJodit)
  })

  it(`sets initial content correctly`, async () => {
    await mountEditor()

    expect(mockJodit.setEditorValue).toHaveBeenCalledWith(`<p>Initial content</p>`)
  })

  it(`registers change event listener`, async () => {
    await mountEditor()

    expect(mockJodit.events.on).toHaveBeenCalledWith(`change`, expect.any(Function))
  })

  it(`should update editor model when content changes`, async () => {
    const wrapper = await mountEditor()
    const newContent = `<p>New content</p>`
    wrapper.vm.updateEditorModel(newContent)

    expect(wrapper.vm.editorModel).toBe(newContent)
    expect(wrapper.emitted(`update:editorModel`)).toBeDefined()
    expect(wrapper.emitted(`update:editorModel`)?.[0]).toStrictEqual([newContent])
  })

  it(`destroys the editor and removes listeners on unmount`, async () => {
    const wrapper = await mountEditor()
    wrapper.unmount()

    expect(mockJodit.events.off).toHaveBeenCalledWith(`change`, expect.any(Function))
    expect(mockJodit.destruct).toHaveBeenCalled()
    expect(wrapper.vm.joditInstance).toBeNull()
  })
})
