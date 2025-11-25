import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import App from '@/App.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import LoginView from '@/views/LoginView.vue'
import { useAuthStore } from '@/stores'
import router from '@/router'
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  USER_KEY
} from '@/constants/localStorageKeys'

describe(`App.vue`, () => {
  beforeEach(async () => {
    createTestingPinia({ createSpy: vi.fn })
    localStorage.clear()
    vi.clearAllMocks()
    await router.push(`/login`)
    await router.replace(router.currentRoute.value.fullPath)
  })

  it(`shows LoginView when not authenticated and navigating to a protected route`, async () => {
    await router.push(`/`)
    await flushPromises()

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    expect(router.currentRoute.value.path).toBe(`/login`)
    expect(wrapper.findComponent(LoginView).exists()).toBe(true)
    expect(wrapper.findComponent(ProjectsView).exists()).toBe(false)
  })

  it(`shows ProjectsView when authenticated`, async () => {
    const auth = useAuthStore()
    auth.$patch({
      user: { id: `1`, email: `john@example.com`, name: `John` }
    })

    await router.push(`/projects`)
    await flushPromises()

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    expect(wrapper.findComponent(ProjectsView).exists()).toBe(true)
    expect(wrapper.findComponent(LoginView).exists()).toBe(false)
    expect(wrapper.text()).toContain(`Projects`)
  })

  it(`silently refreshes and allows navigation on expired session`, async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, `expired-access-token`)
    localStorage.setItem(REFRESH_TOKEN_KEY, `valid-refresh-token`)
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() - 10000)) // Expired 10s ago
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ id: `1`, name: `Test User`, email: `test@example.com` })
    )

    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(false)

    const refreshSpy = vi
      .spyOn(auth, `refreshAccessToken`)
      .mockImplementation(() => {
        auth.$patch({
          user: { id: `1`, email: `john@example.com`, name: `John` }
        })
        return Promise.resolve(`new-access-token`)
      })

    await router.push(`/projects`)
    await flushPromises()

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    expect(refreshSpy).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe(`/projects`)
    expect(wrapper.findComponent(ProjectsView).exists()).toBe(true)
  })
})
