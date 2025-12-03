import { createRouter, createWebHistory } from 'vue-router'
import ProjectsView from '@/views/ProjectsView.vue'
import LoginView from '@/views/LoginView.vue'
import AuthCallback from '@/views/AuthCallback.vue'
import { useAuthStore } from '@/stores'
import ProjectBoardView from '@/views/ProjectBoardView.vue'
import DefaultLayout from '@/components/layouts/DefaultLayout.vue'
import HomeView from '@/views/HomeView.vue'
import TaskFormView from '@/views/TaskFormView.vue'
import { RouteNames } from '@/constants/routes'

export const routes = [
  { path: `/login`, name: RouteNames.LOGIN, component: LoginView },
  { path: `/auth/callback`, name: RouteNames.AUTH_CALLBACK, component: AuthCallback },
  {
    path: `/`,
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: ``,
        name: RouteNames.HOME,
        component: HomeView
      },
      { path: `projects`, name: RouteNames.PROJECTS, component: ProjectsView },
      {
        path: `project/:projectId/board`,
        name: RouteNames.PROJECT_BOARD,
        component: ProjectBoardView
      },
      {
        path: `project/:projectId/task/new`,
        name: RouteNames.CREATE_TASK,
        component: TaskFormView
      },
      {
        path: `project/:projectId/task/:taskId/edit`,
        name: RouteNames.EDIT_TASK,
        component: TaskFormView
      }
    ]
  },
  { path: `/:pathMatch(.*)*`, redirect: `/` }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    try {
      await auth.refreshAccessToken()
    } catch {
      // no valid session
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next(`/login`)
  } else {
    next()
  }
})

export default router
