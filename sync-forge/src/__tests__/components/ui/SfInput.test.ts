import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { SfInput } from '@/components/ui'

describe(`SfInput.vue`, () => {
  describe(`Rendering`, () => {
    it(`renders an input element with default props`, () => {
      const wrapper = mount(SfInput)
      const input = wrapper.find(`input`)

      expect(input.exists()).toBe(true)
      expect(input.attributes(`type`)).toBe(`text`)
      expect(input.attributes(`autocomplete`)).toBe(`off`)
    })

    it(`renders label when provided`, () => {
      const wrapper = mount(SfInput, { props: { label: `Email` } })
      const label = wrapper.find(`label`)

      expect(label.exists()).toBe(true)
      expect(label.text()).toBe(`Email`)
    })

    it(`does not render label when not provided`, () => {
      const wrapper = mount(SfInput)

      expect(wrapper.find(`label`).exists()).toBe(false)
    })

    it(`renders required indicator when required is true`, () => {
      const wrapper = mount(SfInput, { props: { label: `Email`, required: true } })

      expect(wrapper.find(`label`).text()).toContain(`*`)
      expect(wrapper.find(`input`).attributes(`required`)).toBeDefined()
    })

    it(`renders placeholder text`, () => {
      const wrapper = mount(SfInput, { props: { placeholder: `Enter email` } })

      expect(wrapper.find(`input`).attributes(`placeholder`)).toBe(`Enter email`)
    })

    it(`renders hint text when provided`, () => {
      const wrapper = mount(SfInput, { props: { hint: `We will never share your email` } })

      expect(wrapper.text()).toContain(`We will never share your email`)
    })

    it(`renders error message when error is true and errorMessage is provided`, () => {
      const wrapper = mount(SfInput, {
        props: { error: true, errorMessage: `Invalid email format` }
      })

      expect(wrapper.text()).toContain(`Invalid email format`)
    })

    it(`does not render error message when error is false`, () => {
      const wrapper = mount(SfInput, {
        props: { error: false, errorMessage: `Invalid email format` }
      })

      expect(wrapper.text()).not.toContain(`Invalid email format`)
    })

    it(`prioritizes error message over hint when both are present`, () => {
      const wrapper = mount(SfInput, {
        props: {
          error: true,
          errorMessage: `Invalid email`,
          hint: `Enter your email`
        }
      })

      expect(wrapper.text()).toContain(`Invalid email`)
      expect(wrapper.text()).not.toContain(`Enter your email`)
    })
  })

  describe(`Input Types`, () => {
    it.each([`text`, `password`, `email`, `number`, `search`, `tel`, `url`] as const)(
      `renders input with type="%s"`,
      (type) => {
        const wrapper = mount(SfInput, { props: { type } })

        expect(wrapper.find(`input`).attributes(`type`)).toBe(type)
      }
    )
  })

  describe(`v-model`, () => {
    it(`updates model value on input`, async () => {
      const wrapper = mount(SfInput)
      const input = wrapper.find(`input`)

      await input.setValue(`test value`)

      expect(wrapper.emitted(`update:modelValue`)).toBeDefined()
      expect(wrapper.emitted(`update:modelValue`)?.[0]).toStrictEqual([`test value`])
    })

    it(`displays the initial model value`, () => {
      const wrapper = mount(SfInput, {
        props: { modelValue: `initial value` }
      })

      expect((wrapper.find(`input`).element as HTMLInputElement).value).toBe(`initial value`)
    })
  })

  describe(`States`, () => {
    it(`applies disabled styling when disabled`, () => {
      const wrapper = mount(SfInput, { props: { disabled: true } })
      const input = wrapper.find(`input`)

      expect(input.attributes(`disabled`)).toBeDefined()
      expect(input.classes()).toContain(`cursor-not-allowed`)
    })

    it(`applies error styling when error is true`, () => {
      const wrapper = mount(SfInput, { props: { error: true } })
      const input = wrapper.find(`input`)

      expect(input.classes()).toContain(`border-red-500`)
    })

    it(`applies normal styling when no error or disabled`, () => {
      const wrapper = mount(SfInput)
      const input = wrapper.find(`input`)

      expect(input.classes()).toContain(`border-gray-300`)
    })
  })

  describe(`Events`, () => {
    it(`emits focus event on input focus`, async () => {
      const wrapper = mount(SfInput)

      await wrapper.find(`input`).trigger(`focus`)

      expect(wrapper.emitted(`focus`)).toBeDefined()
      expect(wrapper.emitted(`focus`)).toHaveLength(1)
    })

    it(`emits blur event on input blur`, async () => {
      const wrapper = mount(SfInput)

      await wrapper.find(`input`).trigger(`blur`)

      expect(wrapper.emitted(`blur`)).toBeDefined()
      expect(wrapper.emitted(`blur`)).toHaveLength(1)
    })
  })

  describe(`Exposed Methods`, () => {
    it(`exposes focus method that focuses the input`, () => {
      const wrapper = mount(SfInput, { attachTo: document.body })
      const focusSpy = vi.spyOn(wrapper.find(`input`).element, `focus`)

      wrapper.vm.focus()

      expect(focusSpy).toHaveBeenCalled()

      wrapper.unmount()
    })

    it(`exposes blur method that blurs the input`, () => {
      const wrapper = mount(SfInput, { attachTo: document.body })
      const blurSpy = vi.spyOn(wrapper.find(`input`).element, `blur`)

      wrapper.vm.blur()

      expect(blurSpy).toHaveBeenCalled()

      wrapper.unmount()
    })

    it(`exposes inputRef`, () => {
      const wrapper = mount(SfInput)

      expect(wrapper.vm.inputRef).toBeInstanceOf(HTMLInputElement)
    })
  })

  describe(`Accessibility`, () => {
    it(`associates label with input via id`, () => {
      const wrapper = mount(SfInput, { props: { label: `Username`, id: `username-input` } })
      const label = wrapper.find(`label`)
      const input = wrapper.find(`input`)

      expect(label.attributes(`for`)).toBe(`username-input`)
      expect(input.attributes(`id`)).toBe(`username-input`)
    })

    it(`generates unique id when not provided`, () => {
      const wrapper = mount(SfInput, { props: { label: `Email` } })
      const label = wrapper.find(`label`)
      const input = wrapper.find(`input`)

      expect(label.attributes(`for`)).toMatch(/^input-[a-z0-9]+$/)
      expect(input.attributes(`id`)).toBe(label.attributes(`for`))
    })
  })
})
