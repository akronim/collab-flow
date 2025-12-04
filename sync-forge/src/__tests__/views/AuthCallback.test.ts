import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AuthCallback from '@/views/AuthCallback.vue'
import { useAuthStore } from '@/stores'
import { setActivePinia, createPinia } from 'pinia'
import { simpleApiClient } from '@/services/simpleApiClient'
import { routes } from '@/router'
import {
  CODE_VERIFIER_KEY
} from '@/constants/localStorageKeys'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import { AppRoutes } from '@/constants/routes'

vi.mock(`@/services/simpleApiClient`, () => ({
  simpleApiClient: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

describe(`AuthCallback`, () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()

    router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    await router.push(AppRoutes.AUTH_CALLBACK)
    await router.isReady()
  })

   
  it(`exchanges code for tokens, sets user, and redirects to /`, async () => {
    router.currentRoute.value.query = { code: `auth-code-123` }
    localStorage.setItem(CODE_VERIFIER_KEY, `verifier-abc`)

    const mockUser = { id: `user-123`, email: `test@example.com`, name: `Test User` }
    // A mock JWT has two dots. The payload is the base64 encoded JSON of the user.
    const mockAccessToken = `header.${Buffer.from(JSON.stringify(mockUser)).toString(`base64`)}.signature`

    const internalTokenResponse = {
      internal_access_token: mockAccessToken,
      internal_refresh_token: `new.refresh.token`,
      expires_in: 900
    }
    vi.mocked(simpleApiClient.post).mockResolvedValueOnce({
      data: internalTokenResponse
    })

    const authStore = useAuthStore()
    const setAuthTokensSpy = vi.spyOn(authStore, `setAuthTokens`)
    const setUserSpy = vi.spyOn(authStore, `setUser`)

    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(simpleApiClient.post).toHaveBeenCalledWith(
      ApiEndpoints.AUTH_TOKEN,
      expect.objectContaining({
        code: `auth-code-123`,
        codeVerifier: `verifier-abc`
      })
    )

    // Verify setUser was called with the decoded user payload
    expect(setUserSpy).toHaveBeenCalledWith({ user: expect.objectContaining(mockUser) })

    // Verify setAuthTokens was called with the full payload
    expect(setAuthTokensSpy).toHaveBeenCalledWith({
      internalAccessToken: mockAccessToken,
      internalRefreshToken: `new.refresh.token`,
      expiresIn: 900
    })

    expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBeNull()
    expect(router.currentRoute.value.path).toBe(`/`)
  })
   

  it(`redirects to /login when code or verifier is missing`, async () => {
    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe(`/login`)
  })

  it(`redirects to /login on token-exchange failure`, async () => {
    router.currentRoute.value.query = { code: `bad-code` }
    localStorage.setItem(CODE_VERIFIER_KEY, `verifier-abc`)

    vi.mocked(simpleApiClient.post).mockRejectedValueOnce(new Error(`invalid_grant`))

    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe(`/login`)
    expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBeNull()
  })
})
