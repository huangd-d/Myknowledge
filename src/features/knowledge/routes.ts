import type { RouteRecordRaw } from 'vue-router'

export const knowledgeRoutes: RouteRecordRaw[] = [
  {
    path: '/kb',
    name: 'knowledge-index',
    component: () => import('./views/KnowledgeIndexView.vue'),
    meta: { title: '知识库' },
  },
  {
    path: '/kb/:id',
    name: 'knowledge-doc',
    component: () => import('./views/KnowledgeDocView.vue'),
    meta: { title: '知识库' },
  },
]
