/**
 * 极简 Markdown 渲染器：只覆盖知识库文档实际用到的语法。
 * 支持：frontmatter 剔除、标题（含锚点）、段落、有序/无序列表（一层嵌套）、
 * 引用块、分割线、围栏代码块、GFM 表格、行内代码/粗体/斜体/删除线/链接。
 *
 * 安全：所有文本先 escapeHtml，再拼接受控标签，不使用 v-html 渲染未转义内容。
 */

export interface MarkdownHeading {
  id: string
  text: string
  level: number
}

export interface RenderedMarkdown {
  html: string
  headings: MarkdownHeading[]
}

interface ListItem {
  indent: number
  text: string
  ordered: boolean
}

const FRONTMATTER = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/
const BLOCK_START = /^(?:#{1,6}\s|```|>|\||[-*+]\s|\d+\.\s)/
const LIST_ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function slugify(text: string): string {
  return text
    .replace(/`/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function renderInline(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_all, label: string, href: string) => {
    const safe = /^(?:https?:|mailto:|\/|#)/.test(href) ? href : '#'
    return `<a href="${safe}" target="_blank" rel="noreferrer noopener">${label}</a>`
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return out
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function renderList(items: ListItem[]): string {
  const base = Math.min(...items.map((item) => item.indent))
  const rootTag = items.some((item) => item.indent === base && item.ordered) ? 'ol' : 'ul'
  let out = `<${rootTag}>`
  let open = false
  let nested: string[] = []

  const flushNested = () => {
    if (nested.length === 0) return
    out += `<ul class="nested">${nested.map((text) => `<li>${text}</li>`).join('')}</ul>`
    nested = []
  }

  for (const item of items) {
    if (item.indent > base) {
      nested.push(renderInline(item.text))
      continue
    }
    if (open) {
      flushNested()
      out += '</li>'
    }
    out += `<li>${renderInline(item.text)}`
    open = true
  }

  if (open) {
    flushNested()
    out += '</li>'
  }

  return `${out}</${rootTag}>`
}

export function renderMarkdown(source: string): RenderedMarkdown {
  const body = source.replace(FRONTMATTER, '')
  const lines = body.split(/\r?\n/)
  const headings: MarkdownHeading[] = []
  const usedIds = new Map<string, number>()
  const html: string[] = []
  let index = 0

  const pushHeading = (level: number, text: string) => {
    const base = slugify(text) || `section-${headings.length + 1}`
    const seen = usedIds.get(base) ?? 0
    usedIds.set(base, seen + 1)
    const id = seen === 0 ? base : `${base}-${seen}`
    headings.push({ id, text, level })
    html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`)
  }

  while (index < lines.length) {
    const raw = lines[index] ?? ''
    const line = raw.trim()

    if (!line) {
      index += 1
      continue
    }

    const fence = line.match(/^```(\S*)\s*$/)
    if (fence) {
      const lang = fence[1] ?? ''
      const buffer: string[] = []
      index += 1
      while (index < lines.length && !/^\s*```/.test(lines[index] ?? '')) {
        buffer.push(lines[index] ?? '')
        index += 1
      }
      index += 1
      const attr = lang ? ` data-lang="${escapeHtml(lang)}"` : ''
      html.push(`<pre class="code"${attr}><code>${escapeHtml(buffer.join('\n'))}</code></pre>`)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      pushHeading((heading[1] ?? '#').length, (heading[2] ?? '').trim())
      index += 1
      continue
    }

    if (/^-{3,}$|^\*{3,}$|^_{3,}$/.test(line)) {
      html.push('<hr />')
      index += 1
      continue
    }

    if (line.startsWith('|') && /^\|[\s:|-]+\|$/.test((lines[index + 1] ?? '').trim())) {
      const header = splitRow(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
        rows.push(splitRow(lines[index] ?? ''))
        index += 1
      }
      const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')
      const bodyRows = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
        .join('')
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table></div>`,
      )
      continue
    }

    if (line.startsWith('>')) {
      const quoted: string[] = []
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('>')) {
        quoted.push((lines[index] ?? '').trim().replace(/^>\s?/, ''))
        index += 1
      }
      html.push(`<blockquote>${quoted.map((text) => renderInline(text)).join('<br />')}</blockquote>`)
      continue
    }

    if (LIST_ITEM.test(raw)) {
      const items: ListItem[] = []
      while (index < lines.length) {
        const current = lines[index] ?? ''
        const match = current.match(LIST_ITEM)
        if (!match) break
        items.push({
          indent: (match[1] ?? '').length,
          text: match[3] ?? '',
          ordered: /\d/.test(match[2] ?? ''),
        })
        index += 1
      }
      html.push(renderList(items))
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      const current = (lines[index] ?? '').trim()
      if (!current) break
      if (paragraph.length > 0 && BLOCK_START.test(current)) break
      paragraph.push(current)
      index += 1
    }
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
  }

  return { html: html.join('\n'), headings }
}
