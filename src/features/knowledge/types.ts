export interface KnowledgeDoc {
  /** 路由使用的稳定 id，由相对路径推导 */
  id: string
  /** 相对仓库根的路径，例如 skills/vue3-ts-vite-frontend/SKILL.md */
  path: string
  category: string
  categoryLabel: string
  title: string
  summary: string
  /** 去掉 frontmatter 的正文，用于渲染与检索 */
  body: string
  charCount: number
  readMinutes: number
}

export interface KnowledgeCategory {
  key: string
  title: string
  summary: string
  docs: KnowledgeDoc[]
}
