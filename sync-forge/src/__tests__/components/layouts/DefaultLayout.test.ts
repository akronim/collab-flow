import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterLink, type Router } from 'vue-router'
import { createTestingPinia } from '@pinia/testing'
import DefaultLayout from '@/components/layouts/DefaultLayout.vue'
import { useAuthStore } from '@/stores'
import { RouteNames } from '@/constants/routes'

const MockChildComponent = { template: `<div data-testid="child-content">Child Content</div>` }

const createTestRouter = (): Router => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: `/`,
        component: DefaultLayout,
        children: [
          { path: ``, component: MockChildComponent }
        ]
      },
      { path: `/login`, name: RouteNames.LOGIN, component: { template: `<div>Login</div>` } },
      { path: `/:pathMatch(.*)*`, component: { template: `<div>404</div>` } }
    ]
  })
}

describe(`DefaultLayout.vue`, () => {
  let wrapper: VueWrapper
  let router: ReturnType<typeof createTestRouter>
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(async () => {
    router = createTestRouter()
    await router.push(`/`)
    await router.isReady()

    wrapper = mount(DefaultLayout, {
      global: {
        plugins: [
          router,
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              auth: {
                user: { id: `1`, email: `john@example.com`, name: `John` }
              }
            }
          })
        ],
        stubs: {
          RouterLink: {
            template: `<a data-testid="router-link" :href="to"><slot /></a>`,
            props: [`to`]
          },
          RouterView: MockChildComponent
        }
      }
    })

    authStore = useAuthStore()
  })

  describe(`Rendering`, () => {
    it(`renders the component with correct structure`, () => {
      expect(wrapper.find(`header`).exists()).toBe(true)
      expect(wrapper.find(`main`).exists()).toBe(true)
      expect(wrapper.find(`nav`).exists()).toBe(true)
    })

    it(`displays the CollabFlow brand name`, () => {
      const brandLink = wrapper.find(`a.text-xl`)

      expect(brandLink.text()).toBe(`CollabFlow`)
    })

    it(`renders the logout button when authenticated`, () => {
      const logoutButton = wrapper.find(`button`)

      expect(logoutButton.text()).toBe(`Logout`)
      expect(logoutButton.classes()).toContain(`bg-red-600`)
    })

    it(`does not show logout button when user is not authenticated`, async () => {
      authStore.$patch({ user: null}) 
      await wrapper.vm.$nextTick() 

      expect(wrapper.find(`button`).exists()).toBe(false)
    })

    it(`renders router-view slot for child routes`, () => {
      expect(wrapper.find(`[data-testid="child-content"]`).exists()).toBe(true)
      expect(wrapper.html()).toContain(`Child Content`)
    })
  })

  describe(`Navigation`, () => {
    it(`brand link points to home route`, () => {
      const brandLink = wrapper.findComponent(RouterLink)

      expect(brandLink.props(`to`)).toBe(`/`)
    })
  })

  describe(`Logout Functionality`, () => {
    it(`calls authStore.logout when logout button is clicked`, async () => {
      await wrapper.find(`button`).trigger(`click`)

      expect(authStore.logout).toHaveBeenCalledTimes(1)
    })

    it(`navigates to /login after successful logout`, async () => {
      const pushSpy = vi.spyOn(router, `push`)
      await wrapper.find(`button`).trigger(`click`)
      await flushPromises()

      expect(pushSpy).toHaveBeenCalledWith({name: RouteNames.LOGIN})
    })

    it(`still navigates to /login even if logout fails`, async () => {
      vi.spyOn(authStore, `logout`).mockRejectedValueOnce(new Error(`Network error`))

      const pushSpy = vi.spyOn(router, `push`)
      await wrapper.find(`button`).trigger(`click`)
      await flushPromises()

      expect(authStore.logout).toHaveBeenCalled()
      expect(pushSpy).toHaveBeenCalledWith({name: RouteNames.LOGIN})
    })
  })
})
