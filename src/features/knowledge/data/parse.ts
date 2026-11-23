import type { KnowledgeDoc } from '../types'

export interface ParsedFrontmatter {
  data: Record<string, string>
  body: string
}

const FRONTMATTER = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function stripFrontmatter(raw: string): ParsedFrontmatter {
  const matched = raw.match(FRONTMATTER)
  if (!matched) return { data: {}, body: raw }

  const data: Record<string, string> = {}
  for (const line of (matched[1] ?? '').split(/\r?\n/)) {
    const index = line.indexOf(':')
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (key && value) data[key] = value
  }

  return { data, body: raw.slice(matched[0].length) }
}

export function firstHeading(body: string): string {
  const matched = body.match(/^#{1,6}\s+(.+)$/m)
  return matched?.[1]?.trim() ?? ''
}

export function firstParagraph(body: string): string {
  const paragraph = body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block && !/^[#`|>]/.test(block) && !/^[-*+]\s/.test(block) && !/^\d+\.\s/.test(block),
    )
  if (!paragraph) return ''
  return paragraph
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[`*_>#-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

/** 正文第一个 H1 与文档标题重复时去掉，避免详情页出现两个标题 */
export function stripLeadingHeading(body: string, title: string): string {
  const matched = body.match(/^\s*#\s+(.+?)\s*(?:\r?\n|$)/)
  if (!matched) return body
  if ((matched[1] ?? '').trim() !== title.trim()) return body
  return body.slice(matched[0].length).replace(/^\s*\r?\n/, '')
}

/** 排序号：优先 frontmatter.order，其次文件名数字前缀，最后落到 99 */
export function orderOf(fileName: string, data: Record<string, string>): number {
  const declared = Number(data.order)
  if (Number.isFinite(declared)) return declared
  const matched = fileName.match(/^(\d+)/)
  return matched ? Number(matched[1]) : 99
}

export interface DocSource {
  collection: string
  collectionTitle: string
  slug: string
  path: string
  raw: string
}

export function buildDoc(source: DocSource): KnowledgeDoc {
  const { data, body } = stripFrontmatter(source.raw)
  const title = data.title ?? firstHeading(body) ?? data.name ?? source.slug
  const content = stripLeadingHeading(body, title)
  const summary = data.description ?? firstParagraph(content)
  const charCount = content.replace(/\s/g, '').length

  return {
    id: `${source.collection}~${source.slug}`,
    collection: source.collection,
    collectionTitle: source.collectionTitle,
    slug: source.slug,
    path: source.path,
    title: title || source.slug,
    summary: truncate(summary, 110) || '暂无简介',
    body: content,
    order: orderOf(source.slug, data),
    charCount,
    readMinutes: Math.max(1, Math.round(charCount / 350)),
  }
}
