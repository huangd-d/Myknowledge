import type { RouteRecordRaw } from 'vue-router'

export const caseRoutes: RouteRecordRaw[] = [
  {
    path: '/cases',
    name: 'case-index',
    component: () => import('./views/CaseIndexView.vue'),
    meta: { title: '实验案例' },
  },
  {
    path: '/cases/:id',
    name: 'case-detail',
    component: () => import('./views/CaseView.vue'),
    meta: { title: '实验案例' },
  },
]
