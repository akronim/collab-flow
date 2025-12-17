import { describe, it, expect, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ToastNotification from '@/components/shared/ToastNotification.vue'
import { useNotificationStore } from '@/stores/notification'

describe(`ToastNotification.vue`, () => {
  let wrapper: VueWrapper
  let store: ReturnType<typeof useNotificationStore>

  const mountComponent = (initialState = {}): void => {
    wrapper = mount(ToastNotification, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              notification: {
                message: ``,
                type: `info`,
                visible: false,
                ...initialState
              }
            }
          })
        ]
      }
    })
    store = useNotificationStore()
  }

  describe(`Visibility`, () => {
    it(`does not render when not visible`, () => {
      mountComponent({ visible: false })

      expect(wrapper.find(`[role="alert"]`).exists()).toBe(false)
    })

    it(`renders when visible`, () => {
      mountComponent({ visible: true, message: `Hello` })

      expect(wrapper.find(`[role="alert"]`).exists()).toBe(true)
      expect(wrapper.text()).toContain(`Hello`)
    })
  })

  describe(`Notification types`, () => {
    it(`shows green border for success`, () => {
      mountComponent({ visible: true, type: `success` })

      expect(wrapper.find(`[role="alert"]`).classes()).toContain(`border-green-500`)
    })

    it(`shows red border for error`, () => {
      mountComponent({ visible: true, type: `error` })

      expect(wrapper.find(`[role="alert"]`).classes()).toContain(`border-red-500`)
    })

    it(`shows blue border for info`, () => {
      mountComponent({ visible: true, type: `info` })

      expect(wrapper.find(`[role="alert"]`).classes()).toContain(`border-blue-500`)
    })
  })

  describe(`Dismiss`, () => {
    it(`calls store.hide when dismiss button is clicked`, async () => {
      mountComponent({ visible: true, message: `Test` })

      await wrapper.find(`button`).trigger(`click`)

      expect(store.hide).toHaveBeenCalledTimes(1)
    })
  })
})
