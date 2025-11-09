import { createRouter, createMemoryHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

export function setupTestRouter(routes: RouteRecordRaw[]) {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}