import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import AuthCallback from '@/views/AuthCallback.vue'
import { useAuthStore } from '@/stores'
import ProjectBoardView from '@/views/ProjectBoardView.vue'
import { REFRESH_TOKEN_KEY } from '@/constants/localStorageKeys'
import DefaultLayout from '@/components/layouts/DefaultLayout.vue' 

export const routes = [
  { path: `/login`, component: LoginView },
  { path: `/auth/callback`, component: AuthCallback },
  {
    path: `/`,
    component: DefaultLayout, 
    meta: { requiresAuth: true },
    children: [
      { path: ``, component: HomeView, name: `Home` }, 
      {
        path: `project/:id/board`,
        name: `ProjectBoard`,
        component: ProjectBoardView
      }
    ]
  },
  { path: `/:pathMatch(.*)*`, redirect: `/` }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  const hasRefreshToken = !!localStorage.getItem(REFRESH_TOKEN_KEY)

  // a silent refresh
  if (!auth.isAuthenticated && hasRefreshToken) {
    try {
      await auth.refreshAccessToken()
    } catch {

    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next(`/login`)
  } else {
    next()
  }
})

export default router
