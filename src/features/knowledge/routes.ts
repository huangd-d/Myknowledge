import type { RouteRecordRaw } from 'vue-router'

export const knowledgeRoutes: RouteRecordRaw[] = [
  {
    path: '/kb',
    name: 'knowledge-index',
    component: () => import('./views/KnowledgeIndexView.vue'),
    meta: { title: '知识库' },
  },
  {
    path: '/kb/:collection',
    name: 'knowledge-collection',
    component: () => import('./views/CollectionView.vue'),
    meta: { title: '知识库' },
  },
  {
    path: '/kb/:collection/:slug',
    name: 'knowledge-doc',
    component: () => import('./views/KnowledgeDocView.vue'),
    meta: { title: '知识库' },
  },
]
