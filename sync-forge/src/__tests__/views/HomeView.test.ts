import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'
import { useAuthStore } from '@/stores'

describe('HomeView', () => {
    let router: ReturnType<typeof createRouter>

    beforeEach(async () => {
        setActivePinia(createPinia())
        router = createRouter({
            history: createMemoryHistory(),
            routes,
        })
        await router.push('/')
        await router.isReady()
    })

    it('renders project and task count', async () => {
        const wrapper = mount(HomeView, {
            global: { plugins: [router] },
        })
        await flushPromises()
        expect(wrapper.text()).toContain('Website Redesign')
        expect(wrapper.text()).toContain('1 tasks')
    })

    it('has logout button', async () => {
        const wrapper = mount(HomeView, {
            global: { plugins: [router] },
        })
        await flushPromises()
        expect(wrapper.text()).toContain('Logout')
    })

    it('calls authStore.logout() and redirects on button click', async () => {
        const authStore = useAuthStore()
        const logoutSpy = vi.spyOn(authStore, 'logout')

        const wrapper = mount(HomeView, {
            global: { plugins: [router] },
        })
        await flushPromises()

        await wrapper.find('button').trigger('click')

        await flushPromises()

        expect(logoutSpy).toHaveBeenCalled()
        expect(router.currentRoute.value.path).toBe('/login')
    })
})