import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import { useAuthStore } from '@/stores'
import { routes } from "@/router"
import { setupTestRouter } from './setupTestRouter'

describe('App.vue', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    router = setupTestRouter(routes);

    router.beforeEach((to, from, next) => {
      const auth = useAuthStore();
      if (to.meta.requiresAuth && !auth.isAuthenticated) {
        next('/login');
      } else {
        next();
      }
    });

    setActivePinia(createPinia());
  });

  it('shows LoginView when not authenticated', async () => {
    const push = vi.spyOn(router, 'push')
    router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    await flushPromises();

    expect(push).toHaveBeenCalledWith("/")
    expect(router.currentRoute.value.path).toEqual("/login")
    expect(wrapper.findComponent(LoginView).exists()).toBe(true);
    expect(wrapper.findComponent(HomeView).exists()).toBe(false);
  });

  it('shows HomeView when authenticated', async () => {
    const auth = useAuthStore();
          auth.setSession({
            user: { id: '1', email: 'john@example.com', name: 'John' },
            accessToken: 'test-token',
            refreshToken: 'test-refresh',
            expiresIn: 3600,
          });
    router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    await flushPromises();

    expect(wrapper.findComponent(HomeView).exists()).toBe(true);
    expect(wrapper.findComponent(LoginView).exists()).toBe(false);
    expect(wrapper.text()).toContain('Projects');
  });
})