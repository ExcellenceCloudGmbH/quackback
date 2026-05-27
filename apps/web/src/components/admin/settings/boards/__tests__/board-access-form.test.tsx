// @vitest-environment happy-dom
/**
 * <BoardAccessForm> — per-board access matrix form.
 *
 * Covers:
 *   - Quick-preset detection and selection
 *   - Tier-divergence flips the preset to "Custom"
 *   - Segments picker is conditional on any tier === 'segments'
 *   - Save button gates when segments are required but unselected
 *   - Save submits the BoardAccess payload via the mutation hook
 *
 * The mutation hook, segments query, and portalConfig query are all
 * mocked — this is a pure component-behavior test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardAccessForm } from '../board-access-form'
import { DEFAULT_BOARD_ACCESS, type BoardAccess } from '@/lib/shared/db-types'
import type { BoardId } from '@quackback/ids'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// <Link> renders as a plain <a> so we don't need a real router context.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const mutate = vi.fn()
vi.mock('@/lib/client/mutations', () => ({
  useUpdateBoardAccess: () => ({
    mutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('@/lib/client/hooks/use-segments-queries', () => ({
  useSegments: () => ({
    data: [
      { id: 'seg_alpha', name: 'Alpha', memberCount: 3 },
      { id: 'seg_beta', name: 'Beta', memberCount: 0 },
    ],
    isLoading: false,
    isError: false,
  }),
}))

// The form calls `useQuery(settingsQueries.portalConfig())`. We replace the
// queryOptions builder with a static one whose queryFn returns a stable
// stub — no network, no server-fn boundary, no DATABASE_URL needed.
vi.mock('@/lib/client/queries/settings', () => ({
  settingsQueries: {
    portalConfig: () => ({
      queryKey: ['settings', 'portalConfig'],
      queryFn: async () => ({
        features: {
          anonymousVoting: true,
          anonymousCommenting: true,
          anonymousPosting: true,
        },
      }),
      staleTime: Infinity,
    }),
  },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BOARD_ID = 'brd_test' as BoardId

function renderForm(access: BoardAccess = DEFAULT_BOARD_ACCESS) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <BoardAccessForm board={{ id: BOARD_ID, access }} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mutate.mockReset()
})

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

describe('<BoardAccessForm> presets', () => {
  it('preselects "Public" when access matches the all-anonymous shape with approval off', () => {
    renderForm()
    // The first radio matching /public/i is the Public preset card.
    const publicPreset = screen.getByRole('radio', { name: /public/i })
    expect(publicPreset).toBeChecked()
  })

  it('preselects "Auth-only" when every tier is authenticated and approval is off', () => {
    renderForm({
      view: 'authenticated',
      comment: 'authenticated',
      submit: 'authenticated',
      segmentIds: [],
      approval: { posts: false, comments: false },
    })
    expect(screen.getByRole('radio', { name: /auth-only/i })).toBeChecked()
  })

  it('preselects "Team only" preset when every tier is team', () => {
    renderForm({
      view: 'team',
      comment: 'team',
      submit: 'team',
      segmentIds: [],
      approval: { posts: false, comments: false },
    })
    // "Team only" appears as a preset card AND as a tier radio inside each
    // TierSelect (4 instances total: 1 preset + 3 tier radios). Pick the
    // preset card via its preset-* id.
    const teamPreset = document.getElementById('preset-team') as HTMLElement
    expect(teamPreset).toBeChecked()
  })

  it('flips to "Custom" when a single tier diverges from any preset', () => {
    renderForm()
    // Default = Public. Toggle the Comment tier to Signed-in via the
    // "Comment tier" radiogroup. There are 3 "Signed-in" radios (view,
    // comment, submit) — scope to the comment radiogroup so we hit the
    // right one.
    const commentGroup = screen.getByRole('radiogroup', { name: /comment tier/i })
    fireEvent.click(within(commentGroup).getByRole('radio', { name: /signed-in/i }))
    expect(screen.getByRole('radio', { name: /custom/i })).toBeChecked()
  })

  it('clicking the "Auth-only" preset switches every tier to authenticated', () => {
    renderForm()
    fireEvent.click(screen.getByRole('radio', { name: /auth-only/i }))
    expect(screen.getByRole('radio', { name: /auth-only/i })).toBeChecked()
    // Inside each tier radiogroup, "Signed-in" should now be checked.
    const viewGroup = screen.getByRole('radiogroup', { name: /view tier/i })
    const commentGroup = screen.getByRole('radiogroup', { name: /comment tier/i })
    const submitGroup = screen.getByRole('radiogroup', { name: /submit tier/i })
    expect(within(viewGroup).getByRole('radio', { name: /signed-in/i })).toBeChecked()
    expect(within(commentGroup).getByRole('radio', { name: /signed-in/i })).toBeChecked()
    expect(within(submitGroup).getByRole('radio', { name: /signed-in/i })).toBeChecked()
  })
})

// ---------------------------------------------------------------------------
// Segments picker conditional render
// ---------------------------------------------------------------------------

describe('<BoardAccessForm> segments picker', () => {
  it('does NOT render the segments picker when no tier is "segments"', () => {
    renderForm()
    expect(screen.queryByText(/used wherever .?segments.? is selected/i)).not.toBeInTheDocument()
  })

  it('renders the segments picker when any tier becomes "segments"', () => {
    renderForm()
    const viewGroup = screen.getByRole('radiogroup', { name: /view tier/i })
    fireEvent.click(within(viewGroup).getByRole('radio', { name: /segments/i }))
    expect(screen.getByText(/used wherever .?segments.? is selected/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Save button
// ---------------------------------------------------------------------------

describe('<BoardAccessForm> save', () => {
  it('disables Save when a tier is "segments" but segmentIds is empty', () => {
    renderForm({
      view: 'segments',
      comment: 'segments',
      submit: 'segments',
      segmentIds: [],
      approval: { posts: false, comments: false },
    })
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('enables Save when segments are required and at least one segment is selected', () => {
    renderForm({
      view: 'segments',
      comment: 'segments',
      submit: 'segments',
      segmentIds: ['seg_alpha'],
      approval: { posts: false, comments: false },
    })
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
  })

  it('submits the BoardAccess payload via the mutation hook', async () => {
    const access: BoardAccess = {
      view: 'anonymous',
      comment: 'authenticated',
      submit: 'authenticated',
      segmentIds: [],
      approval: { posts: true, comments: false },
    }
    renderForm(access)
    const button = screen.getByRole('button', { name: /save changes/i })
    fireEvent.submit(button.closest('form')!)
    // react-hook-form's handleSubmit runs an async validation microtask
    // before invoking onSubmit; waitFor flushes it before we assert.
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({
        boardId: BOARD_ID,
        access: expect.objectContaining({
          view: 'anonymous',
          comment: 'authenticated',
          submit: 'authenticated',
          segmentIds: [],
          approval: { posts: true, comments: false },
        }),
      })
    )
  })

  it('does NOT call mutate when Enter-key-style submit fires with segments-required-but-empty (belt-and-braces)', async () => {
    renderForm({
      view: 'segments',
      comment: 'segments',
      submit: 'segments',
      segmentIds: [],
      approval: { posts: false, comments: false },
    })
    const button = screen.getByRole('button', { name: /save changes/i })
    fireEvent.submit(button.closest('form')!)
    // Flush react-hook-form's async handleSubmit microtask.
    await new Promise((r) => setTimeout(r, 10))
    expect(mutate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tier-rank invariant: raising view auto-clamps comment/submit
// ---------------------------------------------------------------------------

describe('BoardAccessForm — tier rank invariant', () => {
  it('raising view tier auto-clamps comment and submit to match', () => {
    // Start with all anonymous
    renderForm({
      view: 'anonymous',
      comment: 'anonymous',
      submit: 'anonymous',
      segmentIds: [],
      approval: { posts: false, comments: false },
    })
    // Click "Team only" in the View tier radio group
    const viewGroup = screen.getByRole('radiogroup', { name: /view tier/i })
    fireEvent.click(within(viewGroup).getByRole('radio', { name: /team only/i }))
    // Both Comment and Submit groups should now show Team only as checked
    const commentGroup = screen.getByRole('radiogroup', { name: /comment tier/i })
    const submitGroup = screen.getByRole('radiogroup', { name: /submit tier/i })
    expect(within(commentGroup).getByRole('radio', { name: /team only/i })).toBeChecked()
    expect(within(submitGroup).getByRole('radio', { name: /team only/i })).toBeChecked()
  })
})

// ---------------------------------------------------------------------------
// Preset segmentIds cleanup
// ---------------------------------------------------------------------------

describe('BoardAccessForm — preset segmentIds cleanup', () => {
  it('clicking Public preset clears stale segmentIds', async () => {
    renderForm({
      view: 'segments',
      comment: 'segments',
      submit: 'segments',
      segmentIds: ['seg_alpha'],
      approval: { posts: false, comments: false },
    })
    const publicPresetRadio = document.getElementById('preset-public') as HTMLElement
    fireEvent.click(publicPresetRadio)
    // Saving now should send empty segmentIds
    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!)
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          access: expect.objectContaining({ segmentIds: [] }),
        })
      )
    })
  })
})
