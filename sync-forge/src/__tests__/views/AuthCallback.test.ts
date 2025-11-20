import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AuthCallback from '@/views/AuthCallback.vue'
import { useAuthStore } from '@/stores'
import { setActivePinia, createPinia } from 'pinia'
import api from '@/utils/api'
import { routes } from '@/router'
import {
  ACCESS_TOKEN_KEY,
  CODE_VERIFIER_KEY,
  REFRESH_TOKEN_KEY
} from '@/constants/localStorageKeys'

vi.mock(`@/utils/api`, () => ({
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

    await router.push(`/auth/callback`)
    await router.isReady()
  })

  /* eslint-disable vitest/max-expects */
  it(`exchanges code, fetches profile, logs in and redirects to /`, async () => {
    router.currentRoute.value.query = { code: `auth-code-123` }
    localStorage.setItem(CODE_VERIFIER_KEY, `verifier-abc`)

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        access_token: `new-access`,
        refresh_token: `new-refresh`,
        expires_in: 3600
      }
    })

    const userProfile = { id: `123`, email: `test@google.com`, name: `Test User` }
    vi.mocked(api.get).mockResolvedValueOnce({
      data: userProfile
    })

    const authStore = useAuthStore()
    const setAuthTokensSpy = vi.spyOn(authStore, `setAuthTokens`)
    const setUserSpy = vi.spyOn(authStore, `setUser`)

    mount(AuthCallback, { global: { plugins: [router] } })
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith(
      `/api/auth/token`,
      expect.objectContaining({
        code: `auth-code-123`,
        codeVerifier: `verifier-abc`
      })
    )

    expect(setAuthTokensSpy).toHaveBeenCalledWith({
      accessToken: `new-access`,
      refreshToken: `new-refresh`,
      expiresIn: 3600,
      isGoogleLogin: true
    })

    expect(api.get).toHaveBeenCalledWith(`/api/auth/validate`)

    expect(setUserSpy).toHaveBeenCalledWith({
      user: userProfile
    })

    const storageData = {
      access_token: localStorage.getItem(ACCESS_TOKEN_KEY),
      refresh_token: localStorage.getItem(REFRESH_TOKEN_KEY),
      code_verifier: localStorage.getItem(CODE_VERIFIER_KEY)
    }

    expect(storageData).toStrictEqual({
      access_token: `new-access`,
      refresh_token: `new-refresh`,
      code_verifier: null
    })

    expect(router.currentRoute.value.path).toBe(`/`)
  })
  /* eslint-enable vitest/max-expects */

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
