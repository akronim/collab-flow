import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AuthCallback from '@/views/AuthCallback.vue'
import { useAuthStore } from '@/stores'
import { setActivePinia, createPinia } from 'pinia'
import api from '@/utils/api'
import { routes } from '@/router'

vi.mock('@/utils/api', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn()
    }
}))

describe('AuthCallback', () => {
    let router: ReturnType<typeof createRouter>

    beforeEach(async () => {
        setActivePinia(createPinia())
        localStorage.clear()
        vi.clearAllMocks()

        router = createRouter({
            history: createMemoryHistory(),
            routes
        })

        await router.push('/auth/callback')
        await router.isReady()
    })

    it('exchanges code, fetches profile, logs in and redirects to /', async () => {
        router.currentRoute.value.query = { code: 'auth-code-123' }
        localStorage.setItem('code_verifier', 'verifier-abc')

        vi.mocked(api.post).mockResolvedValueOnce({
            data: {
                access_token: 'new-access',
                refresh_token: 'new-refresh',
                expires_in: 3600
            }
        })

        vi.mocked(api.get).mockResolvedValueOnce({
            data: { id: '123', email: 'test@google.com', name: 'Test User' }
        })

        const authStore = useAuthStore()
        const setSessionSpy = vi.spyOn(authStore, 'setSession')

        mount(AuthCallback, { global: { plugins: [router] } })
        await flushPromises()

        expect(api.post).toHaveBeenCalledWith(
            '/api/auth/token',
            expect.objectContaining({
                code: 'auth-code-123',
                codeVerifier: "verifier-abc"
            })
        )

        expect(api.get).toHaveBeenCalledWith("/api/auth/validate")

        expect(setSessionSpy).toHaveBeenCalledWith({
            user: { id: '123', email: 'test@google.com', name: 'Test User' },
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 3600,
            isGoogleLogin: true
        })

        expect(localStorage.getItem('access_token')).toBe('new-access')
        expect(localStorage.getItem('refresh_token')).toBe('new-refresh')
        expect(localStorage.getItem('code_verifier')).toBeNull()

        expect(router.currentRoute.value.path).toBe('/')
    })


    it('redirects to /login when code or verifier is missing', async () => {
        mount(AuthCallback, { global: { plugins: [router] } })
        await flushPromises()
        expect(router.currentRoute.value.path).toBe('/login')
    })

    it('redirects to /login on token-exchange failure', async () => {
        router.currentRoute.value.query = { code: 'bad-code' }
        localStorage.setItem('code_verifier', 'verifier-abc')

        vi.mocked(api.post).mockRejectedValueOnce(new Error('invalid_grant'))

        mount(AuthCallback, { global: { plugins: [router] } })
        await flushPromises()

        expect(router.currentRoute.value.path).toBe('/login')
        expect(localStorage.getItem('code_verifier')).toBeNull()
    })
})