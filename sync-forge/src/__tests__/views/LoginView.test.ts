import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'
import * as pkce from '@/utils/pkce'

vi.mock('@/utils/pkce', () => ({
  generateCodeVerifier: vi.fn(() => 'mock-verifier-123'),
  generateCodeChallenge: vi.fn(() => Promise.resolve('mock-challenge-456'))
}))

describe('LoginView', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id')
    localStorage.clear()
    
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:5173',
        assign: vi.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('renders login button', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.text()).toContain('Sign in with Google')
  })

  it('generates correct PKCE OAuth URL and calls assign', async () => {
    const wrapper = mount(LoginView)
    await wrapper.find('button').trigger('click')

    const assignSpy = vi.mocked(window.location.assign)
    expect(assignSpy).toHaveBeenCalledTimes(1)

    const url = assignSpy.mock.calls[0]?.[0] as string
    const parsed = new URL(url)

    expect(parsed.origin).toBe('https://accounts.google.com')
    expect(parsed.pathname).toBe('/o/oauth2/v2/auth')
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:5173/auth/callback')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('scope')).toBe('openid email profile')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBe('mock-challenge-456')
    expect(parsed.searchParams.get('access_type')).toBe('offline')
    expect(parsed.searchParams.get('prompt')).toBe('consent')

    expect(localStorage.getItem('code_verifier')).toBe('mock-verifier-123')
    expect(pkce.generateCodeVerifier).toHaveBeenCalledTimes(1)
    expect(pkce.generateCodeChallenge).toHaveBeenCalledWith('mock-verifier-123')
  })

  it('stores code verifier in localStorage', async () => {
    const wrapper = mount(LoginView)
    await wrapper.find('button').trigger('click')

    expect(localStorage.getItem('code_verifier')).toBe('mock-verifier-123')
  })
})