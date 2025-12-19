import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { SfTextarea } from '@/components/ui'

describe(`SfTextarea.vue`, () => {
  describe(`Rendering`, () => {
    it(`renders a textarea element with default props`, () => {
      const wrapper = mount(SfTextarea)
      const textarea = wrapper.find(`textarea`)

      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes(`rows`)).toBe(`4`)
    })

    it(`renders label when provided`, () => {
      const wrapper = mount(SfTextarea, { props: { label: `Description` } })
      const label = wrapper.find(`label`)

      expect(label.exists()).toBe(true)
      expect(label.text()).toBe(`Description`)
    })

    it(`does not render label when not provided`, () => {
      const wrapper = mount(SfTextarea)

      expect(wrapper.find(`label`).exists()).toBe(false)
    })

    it(`renders required indicator when required is true`, () => {
      const wrapper = mount(SfTextarea, { props: { label: `Description`, required: true } })

      expect(wrapper.find(`label`).text()).toContain(`*`)
      expect(wrapper.find(`textarea`).attributes(`required`)).toBeDefined()
    })

    it(`renders placeholder text`, () => {
      const wrapper = mount(SfTextarea, { props: { placeholder: `Enter description` } })

      expect(wrapper.find(`textarea`).attributes(`placeholder`)).toBe(`Enter description`)
    })

    it(`renders hint text when provided`, () => {
      const wrapper = mount(SfTextarea, { props: { hint: `Provide a detailed description` } })

      expect(wrapper.text()).toContain(`Provide a detailed description`)
    })

    it(`renders error message when error is true and errorMessage is provided`, () => {
      const wrapper = mount(SfTextarea, {
        props: { error: true, errorMessage: `Description is too short` }
      })

      expect(wrapper.text()).toContain(`Description is too short`)
    })

    it(`prioritizes error message over hint when both are present`, () => {
      const wrapper = mount(SfTextarea, {
        props: {
          error: true,
          errorMessage: `Invalid description`,
          hint: `Enter your description`
        }
      })

      expect(wrapper.text()).toContain(`Invalid description`)
      expect(wrapper.text()).not.toContain(`Enter your description`)
    })
  })

  describe(`v-model`, () => {
    it(`updates model value on input`, async () => {
      const wrapper = mount(SfTextarea)
      const textarea = wrapper.find(`textarea`)

      await textarea.setValue(`test value`)

      expect(wrapper.emitted(`update:modelValue`)).toBeDefined()
      expect(wrapper.emitted(`update:modelValue`)?.[0]).toStrictEqual([`test value`])
    })

    it(`displays the initial model value`, () => {
      const wrapper = mount(SfTextarea, {
        props: { modelValue: `initial value` }
      })

      expect((wrapper.find(`textarea`).element as HTMLTextAreaElement).value).toBe(`initial value`)
    })
  })

  describe(`States`, () => {
    it(`applies disabled styling when disabled`, () => {
      const wrapper = mount(SfTextarea, { props: { disabled: true } })
      const textarea = wrapper.find(`textarea`)

      expect(textarea.attributes(`disabled`)).toBeDefined()
      expect(textarea.classes()).toContain(`cursor-not-allowed`)
    })

    it(`applies error styling when error is true`, () => {
      const wrapper = mount(SfTextarea, { props: { error: true } })
      const textarea = wrapper.find(`textarea`)

      expect(textarea.classes()).toContain(`border-red-500`)
    })
  })

  describe(`Events`, () => {
    it(`emits focus event on textarea focus`, async () => {
      const wrapper = mount(SfTextarea)
      await wrapper.find(`textarea`).trigger(`focus`)

      expect(wrapper.emitted(`focus`)).toHaveLength(1)
    })

    it(`emits blur event on textarea blur`, async () => {
      const wrapper = mount(SfTextarea)
      await wrapper.find(`textarea`).trigger(`blur`)

      expect(wrapper.emitted(`blur`)).toHaveLength(1)
    })
  })

  describe(`Exposed Methods`, () => {
    it(`exposes focus method that focuses the textarea`, () => {
      const wrapper = mount(SfTextarea, { attachTo: document.body })
      const focusSpy = vi.spyOn(wrapper.find(`textarea`).element, `focus`)
      wrapper.vm.focus()

      expect(focusSpy).toHaveBeenCalled()

      wrapper.unmount()
    })

    it(`exposes blur method that blurs the textarea`, () => {
      const wrapper = mount(SfTextarea, { attachTo: document.body })
      const blurSpy = vi.spyOn(wrapper.find(`textarea`).element, `blur`)
      wrapper.vm.blur()

      expect(blurSpy).toHaveBeenCalled()

      wrapper.unmount()
    })

    it(`exposes textareaRef`, () => {
      const wrapper = mount(SfTextarea)

      expect(wrapper.vm.textareaRef).toBeInstanceOf(HTMLTextAreaElement)
    })
  })
  
  describe(`Accessibility`, () => {
    it(`associates label with textarea via id`, () => {
      const wrapper = mount(SfTextarea, { props: { label: `Description`, id: `desc-textarea` } })
      const label = wrapper.find(`label`)
      const textarea = wrapper.find(`textarea`)

      expect(label.attributes(`for`)).toBe(`desc-textarea`)
      expect(textarea.attributes(`id`)).toBe(`desc-textarea`)
    })

    it(`generates unique id when not provided`, () => {
      const wrapper = mount(SfTextarea, { props: { label: `Description` } })
      const label = wrapper.find(`label`)
      const textarea = wrapper.find(`textarea`)

      expect(label.attributes(`for`)).toMatch(/^textarea-[a-z0-9]+$/)
      expect(textarea.attributes(`id`)).toBe(label.attributes(`for`))
    })
  })
})
