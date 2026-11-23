#!/usr/bin/env node
/**
 * Vue 3 + TS + Vite 前端规范检查（零依赖）
 *
 * 用法:
 *   node scripts/check-frontend-rules.mjs [srcDir] [--json] [--allow-barrels]
 *
 * 退出码: 存在 error 时为 1，否则 0。warn / info 不影响退出码。
 *
 * 豁免: 在文件前 20 行内写
 *   // frontend-rules-ignore: size/component, architecture/barrel-file
 * 可用 * 豁免全部；支持 size/* 形式。
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((arg) => arg.startsWith('--')))
const targetArg = argv.find((arg) => !arg.startsWith('--')) ?? 'src'
const SRC = path.resolve(targetArg)
const BASE = path.dirname(SRC)

const LIMITS = {
  view: { warn: 250, error: 400, label: '页面' },
  component: { warn: 300, error: 400, label: '组件' },
  composable: { warn: 200, error: 300, label: 'composable' },
  store: { warn: 200, error: 300, label: 'store' },
  file: { warn: 400, error: 1000, label: '文件' },
}

const DIR_LIMIT = { warn: 15, error: 25 }
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.nuxt', '.output', '.turbo'])
const CODE_FILE = /\.(vue|ts|tsx|js|mjs|cjs)$/i

const LEVEL_ORDER = { error: 0, warn: 1, info: 2 }
const findings = []

function report(level, rule, file, line, message) {
  findings.push({ level, rule, file, line, message })
}

function relPath(abs) {
  return path.relative(BASE, abs).split(path.sep).join('/')
}

async function walk(dir, files = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(full, files)
    } else if (entry.isFile() && CODE_FILE.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function ownerOf(abs) {
  const rel = path.relative(SRC, abs).split(path.sep).join('/')
  if (!rel || rel.startsWith('..')) return null
  const parts = rel.split('/')
  const top = parts[0]
  const second = parts[1]
  if (top === 'features') return { layer: 'feature', name: second ?? '' }
  if (top === 'shared') return { layer: 'shared', name: 'shared' }
  if (top === 'app') return { layer: 'app', name: 'app' }
  return { layer: top ?? 'unknown', name: top ?? '' }
}

function resolveSpecifier(fromFile, specifier) {
  const clean = specifier.split('?')[0].split('#')[0]
  if (clean.startsWith('@/')) return path.join(SRC, clean.slice(2))
  if (clean.startsWith('.')) return path.resolve(path.dirname(fromFile), clean)
  return null
}

function exemptionsOf(content) {
  const head = content.split(/\r?\n/).slice(0, 20).join('\n')
  const match = head.match(/frontend-rules-ignore:\s*([^\n]+)/)
  const set = new Set()
  if (!match) return set
  for (const raw of match[1].split(',')) {
    let token = raw.trim()
    if (token.endsWith('*/')) token = token.slice(0, -2)
    token = token.trim()
    if (token) set.add(token)
  }
  return set
}

function classify(rel, name) {
  if (rel.includes('/views/') || /View\.vue$/.test(name)) return 'view'
  if (rel.includes('/composables/')) return 'composable'
  if (rel.includes('/stores/')) return 'store'
  if (name.endsWith('.vue')) return 'component'
  return 'file'
}

const SIDE_EFFECT = /\b(addEventListener|setInterval|requestAnimationFrame|new\s+(?:ResizeObserver|IntersectionObserver|MutationObserver|WebSocket|EventSource|Worker|BroadcastChannel))\b/g
const CLEANUP = /onScopeDispose|onBeforeUnmount|onUnmounted|onDeactivated|removeEventListener|clearInterval|cancelAnimationFrame|\.disconnect\(|\.dispose\(|\.destroy\(|\.close\(|\.terminate\(/

async function checkFile(file) {
  let content
  try {
    content = await readFile(file, 'utf8')
  } catch {
    return
  }

  const rel = relPath(file)
  const name = path.basename(file)
  const exempt = exemptionsOf(content)
  const isVue = name.endsWith('.vue')
  const ignore = (rule) => {
    if (exempt.has('*') || exempt.has(rule)) return true
    const [prefix] = rule.split('/')
    return exempt.has(`${prefix}/*`)
  }

  // ---- 体积 ----
  const lineCount = content.split(/\r?\n/).length
  const kind = classify(rel, name)
  const limit = LIMITS[kind]
  if (!ignore(`size/${kind}`)) {
    if (lineCount > limit.error) {
      report('error', `size/${kind}`, rel, 1, `${lineCount} 行，超过${limit.label}红线 ${limit.error} 行，必须拆分`)
    } else if (lineCount > limit.warn) {
      report('warn', `size/${kind}`, rel, 1, `${lineCount} 行，超过${limit.label}建议 ${limit.warn} 行，考虑拆分`)
    }
  }

  // ---- 命名 ----
  if (isVue && !/^[A-Z][A-Za-z0-9]*\.vue$/.test(name) && !ignore('naming/component-file')) {
    report('warn', 'naming/component-file', rel, 1, `组件文件应为 PascalCase：${name}`)
  }
  if (rel.includes('/composables/') && name.endsWith('.ts')) {
    if (!/^use[A-Z][A-Za-z0-9]*\.ts$/.test(name) && !ignore('naming/composable-file')) {
      report('warn', 'naming/composable-file', rel, 1, `composable 应命名 useXxx.ts：${name}`)
    } else if (!/export\s+(?:async\s+)?(?:function|const)\s+use[A-Z]/.test(content) && !ignore('naming/composable-export')) {
      report('warn', 'naming/composable-export', rel, 1, '未找到 useXxx 导出')
    }
  }
  if (!isVue && /^[A-Z]/.test(name) && !ignore('naming/file-case')) {
    report('warn', 'naming/file-case', rel, 1, `非组件文件建议小写/kebab-case：${name}`)
  }

  // ---- 单文件单组件 ----
  const templateTags = content.match(/<template\b[^>]*>/g) ?? []
  const rootTemplates = templateTags.filter(
    (tag) => !/#|v-slot|slot-scope|v-if|v-else|v-for/.test(tag),
  )
  if (isVue && rootTemplates.length > 1 && !ignore('component/single-component')) {
    report('warn', 'component/single-component', rel, 1, `出现 ${rootTemplates.length} 个顶层 <template>，一个文件只放一个组件`)
  }

  // ---- 依赖方向 / 跨功能引用 / barrel ----
  const mine = ownerOf(file)
  const specs = []
  const fromRe = /\bfrom\s*['"]([^'"]+)['"]/g
  const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  const bareRe = /\bimport\s+['"]([^'"]+)['"]/g
  for (const re of [fromRe, dynamicRe, bareRe]) {
    let match
    while ((match = re.exec(content)) !== null) {
      specs.push({ spec: match[1], line: content.slice(0, match.index).split(/\r?\n/).length })
    }
  }

  for (const { spec, line } of specs) {
    const resolved = resolveSpecifier(file, spec)
    if (!resolved) continue
    const target = ownerOf(resolved)
    if (!mine || !target) continue

    if (mine.layer === 'feature' && target.layer === 'feature' && mine.name && target.name && mine.name !== target.name) {
      if (!ignore('architecture/feature-cross-import')) {
        report('error', 'architecture/feature-cross-import', rel, line, `功能模块之间禁止互相引用：${spec}（应下沉到 shared 或由 app 层组合）`)
      }
    }
    if (mine.layer === 'shared' && (target.layer === 'feature' || target.layer === 'app')) {
      if (!ignore('architecture/layer-violation')) {
        report('error', 'architecture/layer-violation', rel, line, `shared 不得引用 ${target.layer}：${spec}`)
      }
    }
    if (mine.layer === 'feature' && target.layer === 'app') {
      if (!ignore('architecture/layer-violation')) {
        report('error', 'architecture/layer-violation', rel, line, `features 不得引用 app：${spec}`)
      }
    }
  }

  const srcParts = path.relative(SRC, file).split(path.sep).join('/').split('/')
  if (
    srcParts[0] === 'features' &&
    srcParts.length === 3 &&
    srcParts[2] === 'index.ts' &&
    !flags.has('--allow-barrels') &&
    !ignore('architecture/barrel-file')
  ) {
    report('error', 'architecture/barrel-file', rel, 1, 'features 下不使用 index.ts 统一导出（循环依赖 / tree-shaking / 跳转困难）')
  }

  // ---- 样式 ----
  if (isVue) {
    if (/<style(?![^>]*\bscoped\b)(?![^>]*\bsrc\b)/.test(content) && !ignore('style/not-scoped')) {
      report('warn', 'style/not-scoped', rel, 1, '<style> 缺少 scoped，组件样式会泄漏到全局')
    }
    const styleBlocks = content.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []
    const styleText = styleBlocks.join('\n')
    const hardcoded = styleText.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    if (hardcoded.length > 0 && !ignore('style/hardcoded-color')) {
      report('info', 'style/hardcoded-color', rel, 1, `style 中有 ${hardcoded.length} 处硬编码颜色，改用 var(--token)`)
    }
    if (/:deep\(/.test(content) && !ignore('style/deep-selector')) {
      report('info', 'style/deep-selector', rel, 1, ':deep() 仅用于覆盖第三方组件，确认已注释说明')
    }
    if (content.includes('v-html') && !ignore('security/v-html')) {
      report('info', 'security/v-html', rel, 1, 'v-html 存在 XSS 风险，确认内容可信或已净化')
    }
  }

  // ---- 副作用清理启发式 ----
  if (!ignore('leak/missing-cleanup')) {
    const effects = new Set()
    let match
    SIDE_EFFECT.lastIndex = 0
    while ((match = SIDE_EFFECT.exec(content)) !== null) {
      effects.add(match[1].replace(/\s+/g, ' '))
    }
    if (effects.size > 0 && !CLEANUP.test(content)) {
      report('warn', 'leak/missing-cleanup', rel, 1, `存在副作用但全文件无任何清理调用：${[...effects].join(' / ')}（定时器轮询、观察器、WebSocket、事件监听都必须成对清理）`)
    }
  }
}

function printHuman(result) {
  const groups = new Map()
  for (const item of result.findings) {
    if (!groups.has(item.file)) groups.set(item.file, [])
    groups.get(item.file).push(item)
  }
  const sortedFiles = [...groups.keys()].sort((a, b) => a.localeCompare(b))
  for (const file of sortedFiles) {
    const items = groups
      .get(file)
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.line - b.line)
    console.log(`\n  ${file}`)
    for (const item of items) {
      const suffix = item.line > 1 ? ` @${item.line}` : ''
      console.log(`    ${item.level.padEnd(5)} ${item.rule.padEnd(32)} ${item.message}${suffix}`)
    }
  }
  console.log('')
  console.log(`  ${result.summary}`)
  console.log('')
}

async function main() {
  const files = await walk(SRC)
  if (files.length === 0) {
    console.error(`未在 ${SRC} 找到可检查文件（.vue/.ts/.tsx/.js/.mjs/.cjs）`)
    process.exit(2)
  }

  for (const file of files) {
    await checkFile(file)
  }

  // ---- 目录文件数 ----
  const byDir = new Map()
  for (const file of files) {
    const dir = path.dirname(file)
    byDir.set(dir, (byDir.get(dir) ?? 0) + 1)
  }
  for (const [dir, count] of byDir) {
    if (count < DIR_LIMIT.warn) continue
    const rel = relPath(dir)
    const level = count >= DIR_LIMIT.error ? 'error' : 'warn'
    report(level, 'size/directory', rel, 1, `目录下 ${count} 个文件，说明职责可能过杂，按功能域再拆一层`)
  }

  const summary = {
    error: findings.filter((f) => f.level === 'error').length,
    warn: findings.filter((f) => f.level === 'warn').length,
    info: findings.filter((f) => f.level === 'info').length,
    files: files.length,
  }

  if (flags.has('--json')) {
    console.log(JSON.stringify({ summary, findings }, null, 2))
  } else {
    printHuman({ findings, summary: `${summary.files} 个文件：${summary.error} error / ${summary.warn} warn / ${summary.info} info` })
  }

  process.exit(summary.error > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(2)
})
