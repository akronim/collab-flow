import { createRouter, createMemoryHistory, type RouteRecordRaw, type Router } from 'vue-router'

export function setupTestRouter(routes: RouteRecordRaw[]): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes
  })
}
