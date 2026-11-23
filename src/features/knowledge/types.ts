export interface KnowledgeDoc {
  /** 稳定 id：`<合集>~<slug>`，用于日志、埋点与跨页引用 */
  id: string
  /** 合集 key，也是路由参数，例如 threejs */
  collection: string
  /** 合集显示名 */
  collectionTitle: string
  /** 文件名去掉 .md，例如 01-render-loop */
  slug: string
  /** 相对仓库根的路径，例如 src/content/threejs/01-render-loop.md */
  path: string
  title: string
  summary: string
  /** 去掉 frontmatter 与重复 H1 的正文，用于渲染与检索 */
  body: string
  /** 合集内排序号，来自 frontmatter.order 或文件名数字前缀 */
  order: number
  charCount: number
  readMinutes: number
}

export interface KnowledgeCollection {
  /** 目录名，同时作为路由参数 */
  key: string
  title: string
  summary: string
  order: number
  docs: KnowledgeDoc[]
  docCount: number
  readMinutes: number
}

export interface CollectionMeta {
  title?: string
  summary?: string
  order?: number
}
