import { Link } from '@tanstack/react-router'
import { ChevronUpIcon, Squares2X2Icon } from '@heroicons/react/24/solid'
import { Badge } from '@/components/ui/badge'

interface RoadmapCardProps {
  id: string
  title: string
  voteCount: number
  board: {
    slug: string
    name: string
  }
}

export function RoadmapCard({ id, title, voteCount, board }: RoadmapCardProps): React.ReactElement {
  return (
    <Link
      to="/b/$slug/posts/$postId"
      params={{ slug: board.slug, postId: id }}
      className="roadmap-card flex w-full min-w-0 max-w-full overflow-hidden bg-[var(--post-card-background)] [border-radius:var(--radius)] border border-[var(--post-card-border)]/50 shadow-sm hover:bg-[var(--post-card-background)]/80 transition-colors"
    >
      <div className="roadmap-card__vote flex flex-col items-center justify-center w-12 shrink-0 border-e border-[var(--post-card-border)]/30 text-muted-foreground">
        <ChevronUpIcon className="h-5 w-5" />
        <span className="text-sm font-semibold text-foreground">{voteCount}</span>
      </div>
      <div className="roadmap-card__content flex-1 min-w-0 p-3">
        {/* break-words so a long, space-less title wraps within the fixed-width
            column instead of overflowing horizontally (no inner scroll exists);
            line-clamp keeps the card compact — the full title opens on click. */}
        <p className="text-sm font-medium text-foreground line-clamp-2 break-words [overflow-wrap:anywhere]">
          {title}
        </p>
        <Badge
          variant="secondary"
          className="mt-2 max-w-full text-[11px] inline-flex items-center gap-0.5"
        >
          <Squares2X2Icon className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <span className="truncate">{board.name}</span>
        </Badge>
      </div>
    </Link>
  )
}
