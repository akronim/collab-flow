import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'

describe(`HomeView`, () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes
    })
    await router.push(`/`)
    await router.isReady()
  })

  it(`renders project and task count`, async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [router] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain(`Website Redesign`)
    expect(wrapper.text()).toContain(`3 tasks`)
  })


})
