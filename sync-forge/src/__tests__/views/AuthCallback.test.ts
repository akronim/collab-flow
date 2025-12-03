import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AuthCallback from '@/views/AuthCallback.vue'
import { useAuthStore } from '@/stores'
import { setActivePinia, createPinia } from 'pinia'
import api from '@/utils/api.gateway'
import { routes } from '@/router'
import {
  CODE_VERIFIER_KEY
} from '@/constants/localStorageKeys'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import { AppRoutes } from '@/constants/routes'

vi.mock(`@/utils/api.gateway`, () => ({
  default: {
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

   
  it(`exchanges code for an internal token, stores it and redirects to /`, async () => {
    router.currentRoute.value.query = { code: `auth-code-123` }
    localStorage.setItem(CODE_VERIFIER_KEY, `verifier-abc`)

    const internalTokenResponse = {
      internal_access_token: `internal.jwt`,
      expires_in: 900
    }
    vi.mocked(api.post).mockResolvedValueOnce({
      data: internalTokenResponse
    })

    const authStore = useAuthStore()
    const setAuthTokensSpy = vi.spyOn(authStore, `setAuthTokens`)

    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith(
      ApiEndpoints.AUTH_TOKEN,
      expect.objectContaining({
        code: `auth-code-123`,
        codeVerifier: `verifier-abc`
      })
    )

    expect(setAuthTokensSpy).toHaveBeenCalledWith({
      internalAccessToken: `internal.jwt`,
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

    vi.mocked(api.post).mockRejectedValueOnce(new Error(`invalid_grant`))

    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe(`/login`)
    expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBeNull()
  })
})
