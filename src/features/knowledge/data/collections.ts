import type { CollectionMeta, KnowledgeCollection, KnowledgeDoc } from '../types'
import { buildDoc } from './parse'

const CONTENT_PREFIX = '../../../content/'

const DOC_FILES = import.meta.glob('../../../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const META_FILES = import.meta.glob('../../../content/*/_meta.json', {
  import: 'default',
  eager: true,
}) as Record<string, CollectionMeta>

function readCollectionMeta(): Map<string, CollectionMeta> {
  const map = new Map<string, CollectionMeta>()
  for (const [key, meta] of Object.entries(META_FILES)) {
    // key: ../../../content/threejs/_meta.json
    const collection = key.slice(CONTENT_PREFIX.length).replace(/\/_meta\.json$/, '')
    if (collection) map.set(collection, meta ?? {})
  }
  return map
}

function readDocs(metaByCollection: Map<string, CollectionMeta>): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = []

  for (const [key, raw] of Object.entries(DOC_FILES)) {
    // key: ../../../content/threejs/01-render-loop.md
    const relative = key.slice(CONTENT_PREFIX.length)
    const segments = relative.split('/')
    const collection = segments[0]
    if (!collection || segments.length < 2) continue

    const slug = segments.slice(1).join('/').replace(/\.md$/, '')
    docs.push(
      buildDoc({
        collection,
        collectionTitle: metaByCollection.get(collection)?.title ?? collection,
        slug,
        path: `src/content/${relative}`,
        raw,
      }),
    )
  }

  return docs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-Hans-CN'))
}

function groupCollections(
  docs: KnowledgeDoc[],
  metaByCollection: Map<string, CollectionMeta>,
): KnowledgeCollection[] {
  const groups = new Map<string, KnowledgeDoc[]>()
  for (const doc of docs) {
    const list = groups.get(doc.collection) ?? []
    list.push(doc)
    groups.set(doc.collection, list)
  }

  return [...groups.entries()]
    .map(([key, items]) => {
      const meta = metaByCollection.get(key) ?? {}
      return {
        key,
        title: meta.title ?? key,
        summary: meta.summary ?? '暂无简介',
        order: meta.order ?? 99,
        docs: items,
        docCount: items.length,
        readMinutes: items.reduce((sum, doc) => sum + doc.readMinutes, 0),
      }
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-Hans-CN'))
}

export const knowledgeDocs: KnowledgeDoc[] = readDocs(readCollectionMeta())
export const knowledgeCollections: KnowledgeCollection[] = groupCollections(
  knowledgeDocs,
  readCollectionMeta(),
)

const docIndex = new Map(knowledgeDocs.map((doc) => [`${doc.collection}/${doc.slug}`, doc]))
const collectionIndex = new Map(knowledgeCollections.map((item) => [item.key, item]))

export function findDoc(collection: string, slug: string): KnowledgeDoc | undefined {
  return docIndex.get(`${collection}/${slug}`)
}

export function findCollection(key: string): KnowledgeCollection | undefined {
  return collectionIndex.get(key)
}

export function documentPath(doc: KnowledgeDoc): string {
  return `/kb/${doc.collection}/${doc.slug}`
}

export const knowledgeStats = {
  docCount: knowledgeDocs.length,
  collectionCount: knowledgeCollections.length,
  totalReadMinutes: knowledgeDocs.reduce((sum, doc) => sum + doc.readMinutes, 0),
}
