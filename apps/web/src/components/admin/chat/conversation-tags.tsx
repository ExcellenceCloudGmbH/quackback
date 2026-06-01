import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { PlusIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import type { ConversationId } from '@quackback/ids'
import type { ChatTagDTO } from '@/lib/shared/chat/types'
import { addConversationTagFn, removeConversationTagFn } from '@/lib/server/functions/chat'
import { fetchTags } from '@/lib/server/functions/tags'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TagChip } from '@/components/shared/tag-chip'

/** Tag chips for a conversation with inline add (popover) + remove. */
export function ConversationTags({
  conversationId,
  tags,
  onChanged,
}: {
  conversationId: ConversationId
  tags: ChatTagDTO[]
  onChanged?: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data: allTags } = useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: () => fetchTags(),
    staleTime: 60_000,
  })

  const addMutation = useMutation({
    mutationFn: (tagId: string) => addConversationTagFn({ data: { conversationId, tagId } }),
    onSuccess: () => onChanged?.(),
    onError: () => toast.error('Failed to add tag'),
  })
  const removeMutation = useMutation({
    mutationFn: (tagId: string) => removeConversationTagFn({ data: { conversationId, tagId } }),
    onSuccess: () => onChanged?.(),
    onError: () => toast.error('Failed to remove tag'),
  })

  const appliedIds = new Set(tags.map((t) => t.id))
  const available = (allTags ?? []).filter((t) => !appliedIds.has(t.id))

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          name={tag.name}
          color={tag.color}
          onRemove={() => removeMutation.mutate(tag.id)}
        />
      ))}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <PlusIcon className="h-2.5 w-2.5" /> Tag
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-1">
          {available.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No more tags</p>
          ) : (
            available.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  addMutation.mutate(tag.id)
                  setPickerOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
              >
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="truncate">{tag.name}</span>
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
