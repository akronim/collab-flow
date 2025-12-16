import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createTestingPinia } from '@pinia/testing'

import App from '@/App.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import DefaultLayout from '@/components/layouts/DefaultLayout.vue'

import { useAuthStore } from '@/stores'
import { apiClient } from '@/http/apiClient'
import { routes } from '@/router'
import { RouteNames } from '@/constants/routes'

vi.mock(`@/http/apiClient`, () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

const mockedGet = vi.mocked(apiClient.get)

function makeTestRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })

  router.beforeEach((to, _from, next) => {
    const auth = useAuthStore()

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      next({ name: RouteNames.LOGIN })
    } else {
      next()
    }
  })

  return router
}

describe(`App.vue`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`redirects unauthenticated users to login`, async () => {
    mockedGet.mockRejectedValue(new Error(`Unauthorized`))

    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
    const router = makeTestRouter()
    const pushSpy = vi.spyOn(router, `push`)

    await router.push(`/projects`)

    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()

    expect(pushSpy).toHaveBeenCalledWith(`/projects`)
    expect(router.currentRoute.value.name).toBe(RouteNames.LOGIN)
    expect(wrapper.findComponent(LoginView).exists()).toBe(true)
    expect(wrapper.findComponent(DefaultLayout).exists()).toBe(false)
  })

  it(`allows authenticated users to access protected routes`, async () => {
    const mockUser = { id: `1`, name: `Test User`, email: `test@example.com` }
    mockedGet.mockResolvedValueOnce({ data: mockUser })

    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
    const router = makeTestRouter()

    // Ensure the auth store is initialized in tests by calling fetchUser()
    const authStore = useAuthStore(pinia)
    await authStore.fetchUser()

    await router.push(`/projects`)

    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()

    expect(router.currentRoute.value.name).toBe(RouteNames.PROJECTS)
    
    expect(authStore.user).toStrictEqual(mockUser)
    
    expect(wrapper.findComponent(DefaultLayout).exists()).toBe(true)
    expect(wrapper.findComponent(ProjectsView).exists()).toBe(true)
  })

  it(`shows home page when authenticated at root`, async () => {
    mockedGet.mockResolvedValue({ data: { id: `1`, name: `Test`, email: `test@test.com` } })

    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
    const router = makeTestRouter()

    // Ensure the auth store is initialized in tests by calling fetchUser()
    const authStore = useAuthStore(pinia)
    await authStore.fetchUser()

    await router.push(`/`)

    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe(RouteNames.HOME)
    expect(wrapper.findComponent(DefaultLayout).exists()).toBe(true)
    expect(wrapper.findComponent(HomeView).exists()).toBe(true)
  })

  it(`lets anyone access login page`, async () => {
    mockedGet.mockRejectedValue(new Error(`Unauthorized`))

    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
    const router = makeTestRouter()

    await router.push(`/login`)

    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia]
      }
    })

    await router.isReady()

    expect(router.currentRoute.value.name).toBe(RouteNames.LOGIN)
    expect(wrapper.findComponent(LoginView).exists()).toBe(true)
    expect(wrapper.findComponent(DefaultLayout).exists()).toBe(false)
  })
})
