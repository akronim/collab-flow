import { googleOAuthConfig, appRoutes } from '@/constants'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'
import * as pkce from '@/utils/pkce'
import { CODE_VERIFIER_KEY } from '@/constants/localStorageKeys'
import { createTestingPinia } from '@pinia/testing'

vi.mock(`@/utils/pkce`, () => ({
  generateCodeVerifier: vi.fn(() => `mock-verifier-123`),
  generateCodeChallenge: vi.fn(() => Promise.resolve(`mock-challenge-456`))
}))

describe(`LoginView`, () => {
  const origin = `http://localhost:5173`

  const mountComponent = (): VueWrapper<InstanceType<typeof LoginView>> => {
    return mount(LoginView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })]
      }
    })
  }

  beforeEach(() => {
    vi.stubEnv(`VITE_GOOGLE_CLIENT_ID`, `test-client-id`)
    localStorage.clear()

    Object.defineProperty(window, `location`, {
      value: {
        origin,
        assign: vi.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it(`renders login button`, () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain(`Sign in with Google`)
  })

  it(`generates correct PKCE OAuth URL and calls assign`, async () => {
    const wrapper = mountComponent()
    await wrapper.find(`button`).trigger(`click`)

    const assignSpy = vi.mocked(window.location.assign)

    expect(assignSpy).toHaveBeenCalledTimes(1)

    const url = assignSpy.mock.calls[0]?.[0] as string
    const parsed = new URL(url)
    const authUrl = new URL(googleOAuthConfig.AUTH_URL)

    expect(parsed).toMatchObject({
      origin: authUrl.origin,
      pathname: authUrl.pathname
    })

    expect(Object.fromEntries(parsed.searchParams)).toStrictEqual({
      client_id: `test-client-id`,
      redirect_uri: `${origin}${appRoutes.AUTH_CALLBACK}`,
      response_type: `code`,
      scope: `openid email profile`,
      code_challenge_method: `S256`,
      code_challenge: `mock-challenge-456`,
      access_type: `offline`,
      prompt: `consent`
    })
  })

  it(`stores code verifier in localStorage and calls PKCE functions`, async () => {
    const wrapper = mountComponent()
    await wrapper.find(`button`).trigger(`click`)

    expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBe(`mock-verifier-123`)
    expect(pkce.generateCodeVerifier).toHaveBeenCalledTimes(1)
    expect(pkce.generateCodeChallenge).toHaveBeenCalledWith(`mock-verifier-123`)
  })
})

