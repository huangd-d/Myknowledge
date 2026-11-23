import type { KnowledgeCategory, KnowledgeDoc } from '../types'

const SKILL_FILES = import.meta.glob('../../../../skills/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const NOTE_FILES = import.meta.glob('../../../../knowledge/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const ROOT_PREFIX = '../../../../'

const CATEGORY_META: Record<string, { title: string; summary: string; order: number }> = {
  'vue3-ts-vite-frontend': {
    title: 'Vue 3 前端工程',
    summary: '文件拆分、组件审查、内存泄漏与工具链门禁',
    order: 1,
  },
  knowledge: {
    title: '个人笔记',
    summary: '随手记的结论、清单与踩坑记录',
    order: 2,
  },
  skills: {
    title: '技能文档',
    summary: '可复用的 agent 技能说明',
    order: 3,
  },
}

const FALLBACK_META = { summary: '暂无简介', order: 99 }

function stripFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const matched = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!matched) return { data: {}, body: raw }

  const data: Record<string, string> = {}
  for (const line of (matched[1] ?? '').split(/\r?\n/)) {
    const index = line.indexOf(':')
    if (index > 0) {
      const key = line.slice(0, index).trim()
      const value = line.slice(index + 1).trim()
      if (key && value) data[key] = value
    }
  }
  return { data, body: raw.slice(matched[0].length) }
}

function firstHeading(body: string): string {
  const matched = body.match(/^#{1,6}\s+(.+)$/m)
  return matched?.[1]?.trim() ?? ''
}

function firstParagraph(body: string): string {
  const paragraph = body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block &&
        !/^[#`|>]/.test(block) &&
        !/^[-*+]\s/.test(block) &&
        !/^\d+\.\s/.test(block),
    )
  if (!paragraph) return ''
  return paragraph
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[`*_>#-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

/** 正文第一个 H1 与文档标题重复时去掉，避免详情页出现两个标题 */
function stripLeadingHeading(body: string, title: string): string {
  const matched = body.match(/^\s*#\s+(.+?)\s*(?:\r?\n|$)/)
  if (!matched) return body
  if ((matched[1] ?? '').trim() !== title.trim()) return body
  return body.slice(matched[0].length).replace(/^\s*\r?\n/, '')
}

function categoryOf(segments: string[]): string {
  const top = segments[0] ?? 'root'
  if (top === 'skills' && segments.length > 2) return segments[1] ?? 'skills'
  return top
}

function buildDoc(relPath: string, raw: string): KnowledgeDoc {
  const segments = relPath.split('/')
  const { data, body } = stripFrontmatter(raw)
  const category = categoryOf(segments)
  const fallbackTitle = (segments[segments.length - 1] ?? relPath).replace(/\.md$/, '')
  const title = data.title ?? firstHeading(body) ?? data.name ?? fallbackTitle
  const content = stripLeadingHeading(body, title)
  const summary = data.description ?? firstParagraph(content)
  const charCount = content.replace(/\s/g, '').length

  return {
    id: relPath.replace(/\.md$/, '').replace(/\//g, '~'),
    path: relPath,
    category,
    categoryLabel: CATEGORY_META[category]?.title ?? category,
    title: title || fallbackTitle,
    summary: truncate(summary, 110) || '暂无简介',
    body: content,
    charCount,
    readMinutes: Math.max(1, Math.round(charCount / 350)),
  }
}

function collect(files: Record<string, string>): KnowledgeDoc[] {
  return Object.entries(files)
    .map(([key, raw]) => buildDoc(key.replace(ROOT_PREFIX, ''), raw))
    .sort((a, b) => {
      const aEntry = a.path.endsWith('/SKILL.md') ? 0 : 1
      const bEntry = b.path.endsWith('/SKILL.md') ? 0 : 1
      return aEntry - bEntry || a.title.localeCompare(b.title, 'zh-Hans-CN')
    })
}

export const knowledgeDocs: KnowledgeDoc[] = [...collect(SKILL_FILES), ...collect(NOTE_FILES)]

const docIndex = new Map(knowledgeDocs.map((doc) => [doc.id, doc]))

export function findDocById(id: string): KnowledgeDoc | undefined {
  return docIndex.get(id)
}

export const knowledgeCategories: KnowledgeCategory[] = (() => {
  const groups = new Map<string, KnowledgeDoc[]>()
  for (const doc of knowledgeDocs) {
    const list = groups.get(doc.category) ?? []
    list.push(doc)
    groups.set(doc.category, list)
  }

  return [...groups.entries()]
    .map(([key, docs]) => ({
      key,
      title: CATEGORY_META[key]?.title ?? key,
      summary: CATEGORY_META[key]?.summary ?? FALLBACK_META.summary,
      docs,
    }))
    .sort((a, b) => {
      const orderA = CATEGORY_META[a.key]?.order ?? FALLBACK_META.order
      const orderB = CATEGORY_META[b.key]?.order ?? FALLBACK_META.order
      return orderA - orderB || a.title.localeCompare(b.title, 'zh-Hans-CN')
    })
})()

export const knowledgeStats = {
  docCount: knowledgeDocs.length,
  categoryCount: knowledgeCategories.length,
  totalReadMinutes: knowledgeDocs.reduce((sum, doc) => sum + doc.readMinutes, 0),
}
