import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { caseRoutes } from '@/features/cases/routes'
import { knowledgeRoutes } from '@/features/knowledge/routes'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/app/views/HomeView.vue'),
    meta: { title: '工作台' },
  },
  ...knowledgeRoutes,
  ...caseRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/app/views/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 88, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'My Knowledge'
  document.title = `${title} · My Knowledge`
})
