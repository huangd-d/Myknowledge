import type { Component } from 'vue'

export type DemoLoader = () => Promise<{ default: Component }>

export interface CaseMeta {
  id: string
  title: string
  summary: string
  tags: string[]
  level: '基础' | '进阶'
  /** 这个实验想验证的结论，逐条列出来 */
  takeaways: string[]
  /** 相关知识文档 id（可选），用于交叉跳转 */
  docId?: string
  loader: DemoLoader
}

export const caseList: CaseMeta[] = [
  {
    id: 'reactivity',
    title: '响应式对照实验',
    summary: 'ref / reactive / shallowRef 分别在什么时候触发更新，computed 又在什么时候失效。',
    tags: ['Vue 3', '响应式'],
    level: '基础',
    takeaways: [
      'ref 与 reactive 的深层修改都会触发更新',
      'shallowRef 只有整体替换才触发，改 .value.nested 不会重渲染',
      '想追踪深层又要省开销，用 shallowRef + 手动 triggerRef',
    ],
    loader: () => import('./demos/reactivity/ReactivityDemo.vue'),
  },
  {
    id: 'dialog',
    title: '原生 dialog 弹窗',
    summary: '用 <dialog> + showModal 拿到焦点陷阱、Esc 关闭、遮罩层，不用自己管焦点。',
    tags: ['组件', '无障碍'],
    level: '基础',
    takeaways: [
      'showModal() 自带焦点陷阱、aria-modal 与 ::backdrop',
      'Esc 触发 cancel 事件，可以被拦截决定是否真的关闭',
      '关闭后焦点自动回到触发元素，不需要手写 restoreFocus',
    ],
    loader: () => import('./demos/dialog/DialogDemo.vue'),
  },
  {
    id: 'race',
    title: '请求竞态',
    summary: '先点慢请求再点快请求，看旧响应如何覆盖新数据，以及 AbortController 怎么修。',
    tags: ['异步', '网络'],
    level: '进阶',
    takeaways: [
      '不取消请求时，后到的旧响应会覆盖新数据（不是内存泄漏，但同样是 bug）',
      'AbortController 要在发新请求前 abort 旧的，并在组件卸载时 abort',
      'loading 状态要判断「当前请求是否还是最新的」再复位',
    ],
    loader: () => import('./demos/race/RaceDemo.vue'),
  },
  {
    id: 'leak',
    title: '内存泄漏实验室',
    summary: '手动创建定时器、观察器、事件监听，观察活动资源计数，再验证离开页面时的清理。',
    tags: ['内存', '审查'],
    level: '进阶',
    takeaways: [
      '任何手动创建的副作用都必须能找到对应的清理语句',
      'onBeforeUnmount / onScopeDispose 是最后一道保险，但不是唯一一道',
      '路由离开守卫可以在资源未清理时拦一次，方便暴露问题',
    ],
    loader: () => import('./demos/leak/LeakDemo.vue'),
  },
]

const caseIndex = new Map(caseList.map((item) => [item.id, item]))

export function findCaseById(id: string): CaseMeta | undefined {
  return caseIndex.get(id)
}

export const caseStats = {
  total: caseList.length,
  tags: [...new Set(caseList.flatMap((item) => item.tags))],
}
