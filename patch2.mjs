import fs from 'fs';
let content = fs.readFileSync('apps/web/src/routes/admin/settings.widget.tsx', 'utf-8');

// 1. Add types
content = content.replace(
  "const fieldCls =",
  `type HelpCenterCategoryRow = {
  id: string
  parentId: string | null
  name: string
  isPublic: boolean
  recursivePublishedArticleCount?: number
}

type HelpCenterCategoryOption = HelpCenterCategoryRow & {
  depth: number
}

const fieldCls =`
);

// 2. Add buildHelpCategoryOptions function
content = content.replace(
  "function WidgetApplicationsSection({",
  `function buildHelpCategoryOptions(categories: HelpCenterCategoryRow[]): HelpCenterCategoryOption[] {
  const childrenByParent = new Map<string | null, HelpCenterCategoryRow[]>()
  for (const category of categories) {
    const key = category.parentId ?? null
    const existing = childrenByParent.get(key)
    if (existing) existing.push(category)
    else childrenByParent.set(key, [category])
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name))
  }

  const options: HelpCenterCategoryOption[] = []
  const visited = new Set<string>()

  function visit(category: HelpCenterCategoryRow, depth: number) {
    if (visited.has(category.id)) return
    visited.add(category.id)
    options.push({ ...category, depth })
    for (const child of childrenByParent.get(category.id) ?? []) {
      visit(child, depth + 1)
    }
  }

  for (const category of childrenByParent.get(null) ?? []) {
    visit(category, 0)
  }
  for (const category of categories) {
    visit(category, 0)
  }

  return options
}

function WidgetApplicationsSection({
  baseUrl,
  applications,
  boards,
  changelogCategories,
  changelogProducts,
  inboxes,
`
-);

// 3. Update WidgetApplicationsSection signature
content = content.replace(
  `baseUrl: string
  applications: WidgetApplicationRow[]
  boards: { id: string; name: string; slug: string }[]
  changelogCategories: ChangelogCategoryRow[]
  changelogProducts: ChangelogProductRow[]
  inboxes: { id: string; name: string }[]
}), `{\nbaseUrl: string\napplications: WidgetApplicationRow[]\nboards: { id: string; name: string; slug: string }[]\nhelpCategories: HelpCenterCategoryRow[]\nchangelogCategories: ChangelogCategoryRow[]\nchangelogProducts: ChangelogProductRow[]\ninboxes: { id: string; name: string }[]\n}`);

fs.writeFileSync('apps/web/src/routes/admin/settings.widget.tsx', content);
