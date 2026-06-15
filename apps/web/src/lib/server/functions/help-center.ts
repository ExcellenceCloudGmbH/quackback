/**
 * Server Functions for Help Center Operations
 */

import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type { HelpCenterCategoryId, HelpCenterArticleId, PrincipalId } from '@quackback/ids'
import { sanitizeTiptapContent } from '@/lib/server/sanitize-tiptap'
import { requireAuth, getOptionalAuth } from './auth-helpers'
import { NotFoundError } from '@/lib/shared/errors'
import {
  listCategories,
  listPublicCategories,
  listPublicCategoryEditors,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  listArticles,
  listPublicArticles,
  listPublicArticlesForCategory,
  getArticleById,
  getPublicArticleBySlug,
  createArticle,
  updateArticle,
  publishArticle,
  unpublishArticle,
  deleteArticle,
  restoreArticle,
  recordArticleFeedback,
} from '@/lib/server/domains/help-center/help-center.service'
import {
  listCategoriesSchema,
  getCategorySchema,
  deleteCategorySchema,
  createCategorySchema,
  updateCategorySchema,
  createArticleSchema,
  updateArticleSchema,
  getArticleSchema,
  deleteArticleSchema,
  listArticlesSchema,
  listPublicArticlesSchema,
  publishArticleSchema,
  unpublishArticleSchema,
  articleFeedbackSchema,
  getCategoryBySlugSchema,
  getArticleBySlugSchema,
  restoreCategorySchema,
  restoreArticleSchema,
} from '@/lib/shared/schemas/help-center'
import { z } from 'zod'
import { toIsoString, toIsoStringOrNull } from '@/lib/shared/utils'
import { getWidgetRequestContext, type WidgetRequestContext } from '@/lib/server/widget/context'

// ============================================================================
// Helper: serialize article dates
// ============================================================================

function serializeArticle<
  T extends { createdAt: Date; updatedAt: Date; publishedAt: Date | null; deletedAt?: Date | null },
>(article: T) {
  return {
    ...article,
    createdAt: toIsoString(article.createdAt),
    updatedAt: toIsoString(article.updatedAt),
    publishedAt: toIsoStringOrNull(article.publishedAt),
    deletedAt: toIsoStringOrNull(article.deletedAt ?? null),
  }
}

function serializeCategory<T extends { createdAt: Date; updatedAt: Date; deletedAt?: Date | null }>(
  cat: T
) {
  return {
    ...cat,
    createdAt: toIsoString(cat.createdAt),
    updatedAt: toIsoString(cat.updatedAt),
    deletedAt: 'deletedAt' in cat ? toIsoStringOrNull(cat.deletedAt ?? null) : undefined,
  }
}

async function getWidgetContextFromServerFnHeaders(): Promise<WidgetRequestContext> {
  const headers = getRequestHeaders()
  const request = new Request('https://widget-context.local/help', { headers })
  return getWidgetRequestContext(request)
}

function categoryAllowedByWidgetContext(
  category: { id: string },
  context: WidgetRequestContext
): boolean {
  if (!context.profileId) return true
  const allowedCategoryIds = new Set(context.contentFilters.help?.categoryIds ?? [])
  if (allowedCategoryIds.size === 0) return true
  return allowedCategoryIds.has(category.id as HelpCenterCategoryId)
}

function articleAllowedByWidgetContext(
  article: { id: string; categoryId?: string; category?: { id: string } },
  context: WidgetRequestContext
): boolean {
  if (!context.profileId) return true
  const helpFilters = context.contentFilters.help
  const allowedCategoryIds = new Set(helpFilters?.categoryIds ?? [])
  const allowedArticleIds = new Set(helpFilters?.articleIds ?? [])
  if (
    allowedCategoryIds.size > 0 &&
    !allowedCategoryIds.has(
      (article.categoryId ?? article.category?.id ?? '') as HelpCenterCategoryId
    )
  ) {
    return false
  }
  if (allowedArticleIds.size > 0 && !allowedArticleIds.has(article.id as HelpCenterArticleId)) {
    return false
  }
  return true
}

// ============================================================================
// Category Server Functions
// ============================================================================

export const listCategoriesFn = createServerFn({ method: 'GET' })
  .inputValidator(listCategoriesSchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin', 'member'] })
    const categories = await listCategories({ showDeleted: data.showDeleted })
    return categories.map(serializeCategory)
  })

export const listPublicCategoriesFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const categories = await listPublicCategories()
    const widgetContext = await getWidgetContextFromServerFnHeaders()
    return categories
      .filter((category) => categoryAllowedByWidgetContext(category, widgetContext))
      .map(serializeCategory)
  })

export const getCategoryFn = createServerFn({ method: 'GET' })
  .inputValidator(getCategorySchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin', 'member'] })
    const category = await getCategoryById(data.id as HelpCenterCategoryId)
    return serializeCategory(category)
  })

export const getPublicCategoryBySlugFn = createServerFn({ method: 'GET' })
  .inputValidator(getCategoryBySlugSchema)
  .handler(async ({ data }) => {
    // Use the public variant so categories an admin marked private aren't
    // reachable by direct-slug lookup. The route serves unauthenticated
    // help-center traffic.
    const { getPublicCategoryBySlug } =
      await import('@/lib/server/domains/help-center/help-center.category.service')
    const category = await getPublicCategoryBySlug(data.slug)
    return serializeCategory(category)
  })

export const createCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator(createCategorySchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin'] })
    const category = await createCategory(data)
    return serializeCategory(category)
  })

export const updateCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator(updateCategorySchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin'] })
    const category = await updateCategory(data.id as HelpCenterCategoryId, data)
    return serializeCategory(category)
  })

export const deleteCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator(deleteCategorySchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin'] })
    await deleteCategory(data.id as HelpCenterCategoryId)
    return { success: true }
  })

// ============================================================================
// Article Server Functions
// ============================================================================

export const listArticlesFn = createServerFn({ method: 'GET' })
  .inputValidator(listArticlesSchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin', 'member'] })
    const result = await listArticles(data)
    return {
      ...result,
      items: result.items.map(serializeArticle),
    }
  })

export const restoreCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator(restoreCategorySchema)
  .handler(async ({ data }) => {
    console.log(`[fn:help-center] restoreCategoryFn: id=${data.id}`)
    try {
      await requireAuth({ roles: ['admin', 'member'] })
      const category = await restoreCategory(data.id as HelpCenterCategoryId)
      console.log(`[fn:help-center] restoreCategoryFn: restored id=${category.id}`)
      return serializeCategory(category)
    } catch (error) {
      console.error(`[fn:help-center] restoreCategoryFn failed:`, error)
      throw error
    }
  })

export const restoreArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(restoreArticleSchema)
  .handler(async ({ data }) => {
    console.log(`[fn:help-center] restoreArticleFn: id=${data.id}`)
    try {
      await requireAuth({ roles: ['admin', 'member'] })
      const article = await restoreArticle(data.id as HelpCenterArticleId)
      console.log(`[fn:help-center] restoreArticleFn: restored id=${article.id}`)
      return serializeArticle(article)
    } catch (error) {
      console.error(`[fn:help-center] restoreArticleFn failed:`, error)
      throw error
    }
  })

export const listPublicArticlesFn = createServerFn({ method: 'GET' })
  .inputValidator(listPublicArticlesSchema)
  .handler(async ({ data }) => {
    const result = await listPublicArticles(data)
    const widgetContext = await getWidgetContextFromServerFnHeaders()
    const filteredItems = result.items.filter((article) =>
      articleAllowedByWidgetContext(article, widgetContext)
    )
    return {
      ...result,
      items: filteredItems.map(serializeArticle),
    }
  })

export const listPublicArticlesForCategoryFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ categoryId: z.string() }))
  .handler(async ({ data }) => {
    const widgetContext = await getWidgetContextFromServerFnHeaders()
    if (!categoryAllowedByWidgetContext({ id: data.categoryId }, widgetContext)) {
      return []
    }
    const articles = await listPublicArticlesForCategory(data.categoryId)
    return articles
      .filter((article) =>
        articleAllowedByWidgetContext({ ...article, categoryId: data.categoryId }, widgetContext)
      )
      .map((a) => ({
        ...a,
        publishedAt: toIsoStringOrNull(a.publishedAt),
      }))
  })

export const listPublicCategoryEditorsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    return listPublicCategoryEditors()
  })

export const getArticleFn = createServerFn({ method: 'GET' })
  .inputValidator(getArticleSchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin', 'member'] })
    const article = await getArticleById(data.id as HelpCenterArticleId)
    return serializeArticle(article)
  })

export const getPublicArticleBySlugFn = createServerFn({ method: 'GET' })
  .inputValidator(getArticleBySlugSchema)
  .handler(async ({ data }) => {
    const article = await getPublicArticleBySlug(data.slug)
    const widgetContext = await getWidgetContextFromServerFnHeaders()
    if (!articleAllowedByWidgetContext(article, widgetContext)) {
      throw new NotFoundError('ARTICLE_NOT_FOUND', `Article not found`)
    }
    const { helpfulCount: _h, notHelpfulCount: _n, ...publicArticle } = serializeArticle(article)
    return publicArticle
  })

export const createArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(createArticleSchema)
  .handler(async ({ data }) => {
    const auth = await requireAuth({ roles: ['admin', 'member'] })
    const article = await createArticle(
      {
        ...data,
        contentJson: data.contentJson ? sanitizeTiptapContent(data.contentJson) : null,
      },
      auth.principal.id as PrincipalId
    )
    return serializeArticle(article)
  })

export const updateArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(updateArticleSchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin', 'member'] })
    const article = await updateArticle(data.id as HelpCenterArticleId, {
      ...data,
      contentJson: data.contentJson ? sanitizeTiptapContent(data.contentJson) : data.contentJson,
    })
    return serializeArticle(article)
  })

export const publishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(publishArticleSchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin', 'member'] })
    const article = await publishArticle(data.id as HelpCenterArticleId)
    return serializeArticle(article)
  })

export const unpublishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(unpublishArticleSchema)
  .handler(async ({ data }) => {
    await requireAuth({ roles: ['admin', 'member'] })
    const article = await unpublishArticle(data.id as HelpCenterArticleId)
    return serializeArticle(article)
  })

export const deleteArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(deleteArticleSchema)
  .handler(async ({ data }) => {
    // Soft delete (deleteArticle sets deletedAt) — team OK.
    await requireAuth({ roles: ['admin', 'member'] })
    await deleteArticle(data.id as HelpCenterArticleId)
    return { success: true }
  })

export const recordArticleFeedbackFn = createServerFn({ method: 'POST' })
  .inputValidator(articleFeedbackSchema)
  .handler(async ({ data }) => {
    const auth = await getOptionalAuth()
    await recordArticleFeedback(
      data.articleId as HelpCenterArticleId,
      data.helpful,
      (auth?.principal?.id as PrincipalId) ?? null
    )
    return { success: true }
  })

// ============================================================================
// Public Hybrid Search
// ============================================================================

export const searchPublicArticlesFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(20).optional() })
  )
  .handler(async ({ data }) => {
    const { hybridSearch } =
      await import('@/lib/server/domains/help-center/help-center-search.service')
    return hybridSearch(data.query, data.limit ?? 10)
  })
