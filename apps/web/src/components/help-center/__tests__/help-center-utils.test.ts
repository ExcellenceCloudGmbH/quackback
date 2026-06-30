import { describe, it, expect } from 'vitest'
import {
  getTopLevelCategories,
  getActiveCategory,
  getSubcategories,
  buildCategoryBreadcrumbs,
  buildCategoryTree,
} from '../help-center-utils'

interface TestCategory {
  id: string
  parentId?: string | null
  slug: string
  name: string
}

describe('buildCategoryTree', () => {
  const flatten = (
    nodes: ReturnType<typeof buildCategoryTree<TestCategory>>
  ): Array<{ id: string; childIds: string[] }> =>
    nodes.map((n) => ({ id: n.category.id, childIds: n.children.map((c) => c.category.id) }))

  it('nests children under their parent (real tree)', () => {
    const cats: TestCategory[] = [
      { id: 'p', parentId: null, slug: 'p', name: 'Parent' },
      { id: 'c1', parentId: 'p', slug: 'c1', name: 'Child 1' },
      { id: 'c2', parentId: 'p', slug: 'c2', name: 'Child 2' },
      { id: 'root2', parentId: null, slug: 'r2', name: 'Root 2' },
    ]
    expect(flatten(buildCategoryTree(cats))).toEqual([
      { id: 'p', childIds: ['c1', 'c2'] },
      { id: 'root2', childIds: [] },
    ])
  })

  it('promotes an orphaned child (parent not in the set) to a root', () => {
    // Curated widget: only a sub-category was selected; its parent is absent.
    const cats: TestCategory[] = [{ id: 'c', parentId: 'missing', slug: 'c', name: 'Child' }]
    expect(flatten(buildCategoryTree(cats))).toEqual([{ id: 'c', childIds: [] }])
  })

  it('keeps a selected parent AND its selected child (the reported case)', () => {
    const cats: TestCategory[] = [
      { id: 'p', parentId: null, slug: 'p', name: 'Parent' },
      { id: 'c', parentId: 'p', slug: 'c', name: 'Child' },
    ]
    expect(flatten(buildCategoryTree(cats))).toEqual([{ id: 'p', childIds: ['c'] }])
  })

  it('handles arbitrary depth', () => {
    const cats: TestCategory[] = [
      { id: 'a', parentId: null, slug: 'a', name: 'A' },
      { id: 'b', parentId: 'a', slug: 'b', name: 'B' },
      { id: 'c', parentId: 'b', slug: 'c', name: 'C' },
    ]
    const tree = buildCategoryTree(cats)
    expect(tree[0].category.id).toBe('a')
    expect(tree[0].children[0].category.id).toBe('b')
    expect(tree[0].children[0].children[0].category.id).toBe('c')
  })

  it('terminates on cyclic data (no root) instead of looping forever', () => {
    const cats: TestCategory[] = [
      { id: 'x', parentId: 'y', slug: 'x', name: 'X' },
      { id: 'y', parentId: 'x', slug: 'y', name: 'Y' },
    ]
    // Both reference each other and neither is a root (each parent is present),
    // so there is no entry point — the result is empty but, crucially, the call
    // returns (no infinite recursion). Cycles are DB-impossible; this is just a
    // defensive guarantee.
    expect(buildCategoryTree(cats)).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(buildCategoryTree([])).toEqual([])
  })
})

describe('getTopLevelCategories', () => {
  it('filters out categories with a parentId', () => {
    const categories: TestCategory[] = [
      { id: '1', parentId: null, slug: 'getting-started', name: 'Getting Started' },
      { id: '2', parentId: '1', slug: 'install', name: 'Install' },
      { id: '3', parentId: null, slug: 'faq', name: 'FAQ' },
    ]

    const result = getTopLevelCategories(categories)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.slug)).toEqual(['getting-started', 'faq'])
  })

  it('treats undefined parentId as top-level', () => {
    const categories: TestCategory[] = [
      { id: '1', slug: 'top', name: 'Top' },
      { id: '2', parentId: '1', slug: 'child', name: 'Child' },
    ]

    const result = getTopLevelCategories(categories)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('top')
  })

  it('returns empty array for empty input', () => {
    expect(getTopLevelCategories([])).toEqual([])
  })
})

describe('getActiveCategory', () => {
  it('returns null for the help center root', () => {
    expect(getActiveCategory('/hc')).toBeNull()
    expect(getActiveCategory('/hc/')).toBeNull()
  })

  it('returns the slug for a category path', () => {
    expect(getActiveCategory('/hc/categories/getting-started')).toBe('getting-started')
  })

  it('returns the category slug for an article path', () => {
    expect(getActiveCategory('/hc/articles/getting-started/first-steps')).toBe('getting-started')
  })

  it('returns null for non-hc portal paths', () => {
    expect(getActiveCategory('/')).toBeNull()
    expect(getActiveCategory('/roadmap')).toBeNull()
  })
})

describe('getSubcategories', () => {
  const categories: TestCategory[] = [
    { id: '1', parentId: null, slug: 'getting-started', name: 'Getting Started' },
    { id: '2', parentId: '1', slug: 'first-steps', name: 'First Steps' },
    { id: '3', parentId: '1', slug: 'advanced', name: 'Advanced' },
    { id: '4', parentId: null, slug: 'faq', name: 'FAQ' },
    { id: '5', parentId: '4', slug: 'billing', name: 'Billing' },
  ]

  it('returns children of a given parent', () => {
    const result = getSubcategories(categories, '1')
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.slug)).toEqual(['first-steps', 'advanced'])
  })

  it('returns empty array when no children exist', () => {
    const result = getSubcategories(categories, '2')
    expect(result).toHaveLength(0)
  })

  it('returns empty array for empty categories list', () => {
    expect(getSubcategories([], '1')).toEqual([])
  })

  it('returns children for a different parent', () => {
    const result = getSubcategories(categories, '4')
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('billing')
  })
})

describe('buildCategoryBreadcrumbs (hierarchical)', () => {
  const tree = [
    { id: 'root', parentId: null, slug: 'root', name: 'Root' },
    { id: 'mid', parentId: 'root', slug: 'mid', name: 'Middle' },
    { id: 'leaf', parentId: 'mid', slug: 'leaf', name: 'Leaf' },
  ]

  it('returns Help Center > Category for a top-level category', () => {
    const items = buildCategoryBreadcrumbs({
      allCategories: tree,
      categoryId: 'root',
    })
    expect(items.map((i) => i.label)).toEqual(['Help Center', 'Root'])
    expect(items[0].href).toBe('/hc')
    expect(items[1].href).toBeUndefined()
  })

  it('walks the full chain for a nested category', () => {
    const items = buildCategoryBreadcrumbs({
      allCategories: tree,
      categoryId: 'leaf',
    })
    expect(items.map((i) => i.label)).toEqual(['Help Center', 'Root', 'Middle', 'Leaf'])
    expect(items[1].href).toBe('/hc/categories/root')
    expect(items[2].href).toBe('/hc/categories/mid')
    expect(items[3].href).toBeUndefined()
  })

  it('appends the article title as a final non-linked crumb', () => {
    const items = buildCategoryBreadcrumbs({
      allCategories: tree,
      categoryId: 'leaf',
      articleTitle: 'Installing the CLI',
    })
    expect(items.map((i) => i.label)).toEqual([
      'Help Center',
      'Root',
      'Middle',
      'Leaf',
      'Installing the CLI',
    ])
    expect(items[3].href).toBe('/hc/categories/leaf')
    expect(items[4].href).toBeUndefined()
  })

  it('falls back to just Help Center when the id is unknown', () => {
    const items = buildCategoryBreadcrumbs({
      allCategories: tree,
      categoryId: 'ghost',
    })
    expect(items.map((i) => i.label)).toEqual(['Help Center'])
  })

  it('bails out of a cycle without looping forever', () => {
    // Broken data: a -> b -> a
    const cyclic = [
      { id: 'a', parentId: 'b', slug: 'a', name: 'A' },
      { id: 'b', parentId: 'a', slug: 'b', name: 'B' },
    ]
    const items = buildCategoryBreadcrumbs({
      allCategories: cyclic,
      categoryId: 'a',
    })
    // Must terminate; exact shape depends on which direction we walk first,
    // but should include Help Center + at most both nodes
    expect(items.length).toBeLessThanOrEqual(3)
    expect(items[0].label).toBe('Help Center')
  })
})
