import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AuthCallback from '@/views/AuthCallback.vue'
import { useAuthStore } from '@/stores'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '@/http/apiClient'
import { routes } from '@/router'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import { RouteNames } from '@/constants/routes'

vi.mock(`@/http/apiClient`, () => ({
  apiClient: {
    post: vi.fn()
  }
}))

const mockedApiClientPost = vi.mocked(apiClient.post)

describe(`AuthCallback (Session-based)`, () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()

    router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    // Start at a different route to test the navigation
    await router.push(`/`)
    await router.isReady()
  })

  it(`calls the token endpoint and redirects to / on success`, async () => {
    // Set up the conditions for the component's onMounted hook
    await router.push({ name: RouteNames.AUTH_CALLBACK, query: { code: `auth-code-123` } })
    const authStore = useAuthStore()
    const clearPkceSpy = vi.spyOn(authStore, `clearPkceCodeVerifier`)
    authStore.setPkceCodeVerifier(`verifier-abc`)

    mockedApiClientPost.mockResolvedValue({})

    // Mount the component
    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    // Assert API call is correct
    expect(apiClient.post).toHaveBeenCalledWith(
      ApiEndpoints.AUTH_TOKEN,
      { code: `auth-code-123`, codeVerifier: `verifier-abc` }
    )

    // Assert redirection and cleanup
    expect(router.currentRoute.value.path).toBe(`/`)
    expect(clearPkceSpy).toHaveBeenCalled()
  })

  it(`redirects to /login on token exchange failure`, async () => {
    await router.push({ name: RouteNames.AUTH_CALLBACK, query: { code: `bad-code` } })
    const authStore = useAuthStore()
    const clearPkceSpy = vi.spyOn(authStore, `clearPkceCodeVerifier`)
    authStore.setPkceCodeVerifier(`verifier-abc`)
    
    mockedApiClientPost.mockRejectedValueOnce(new Error(`invalid_grant`))

    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe(RouteNames.LOGIN)
    expect(clearPkceSpy).toHaveBeenCalled()
  })

  it(`redirects to /login if code is missing`, async () => {
    await router.push({ name: RouteNames.AUTH_CALLBACK }) // No query params
    const authStore = useAuthStore()
    authStore.setPkceCodeVerifier(`verifier-abc`)
    
    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe(RouteNames.LOGIN)
  })

  it(`redirects to /login if code verifier is missing`, async () => {
    await router.push({ name: RouteNames.AUTH_CALLBACK, query: { code: `some-code` } })
    // No verifier in store
    
    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe(RouteNames.LOGIN)
  })
})
