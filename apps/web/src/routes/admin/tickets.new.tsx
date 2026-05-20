/**
 * Create-ticket page.
 *
 * Wraps `createTicketFn` in a richer form than the v1 placeholder: subject,
 * RichTextEditor description, channel/priority/visibility, plus inbox /
 * requester / organization / assignee / primary-team pickers. Inbox is a
 * normal optional field — when empty, the routing engine resolves it.
 */
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createRouteErrorComponent } from '@/components/admin/shared'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { JSONContent } from '@tiptap/react'
import type {
  TicketId,
  PrincipalId,
  InboxId,
  OrganizationId,
  ContactId,
  TeamId,
} from '@quackback/ids'
import { createTicketFn } from '@/lib/server/functions/tickets'
import { useMyPermissions } from '@/lib/client/hooks/use-authz-queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { InboxPicker } from '@/components/admin/shared/inbox-picker'
import { OrgPicker } from '@/components/admin/shared/org-picker'
import { ContactPicker } from '@/components/admin/shared/contact-picker'
import { PrincipalPicker } from '@/components/admin/shared/principal-picker'
import { TeamPicker } from '@/components/admin/shared/team-picker'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/tickets/new')({
  errorComponent: createRouteErrorComponent('Failed to load form'),
  component: NewTicketPage,
})

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
const CHANNELS = ['portal', 'email', 'api', 'widget'] as const
const VISIBILITY = ['team', 'org', 'shared', 'private'] as const

function plainTextFromJson(json: JSONContent | null): string {
  if (!json) return ''
  let out = ''
  const walk = (n: JSONContent) => {
    if (n.type === 'text' && typeof n.text === 'string') out += n.text
    if (n.content) n.content.forEach(walk)
    if (n.type === 'paragraph' || n.type === 'heading') out += '\n'
  }
  walk(json)
  return out.trim()
}

function NewTicketPage() {
  const router = useRouter()
  const perms = useMyPermissions()

  const [subject, setSubject] = useState('')
  const [descJson, setDescJson] = useState<JSONContent | null>(null)
  const [descText, setDescText] = useState('')
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('normal')
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>('portal')
  const [visibilityScope, setVisibilityScope] = useState<(typeof VISIBILITY)[number]>('team')

  const [inboxId, setInboxId] = useState<InboxId | null>(null)
  const [organizationId, setOrganizationId] = useState<OrganizationId | null>(null)
  const [contactId, setContactId] = useState<ContactId | null>(null)
  const [primaryTeamId, setPrimaryTeamId] = useState<TeamId | null>(null)
  const [assigneeId, setAssigneeId] = useState<PrincipalId | null>(perms.data?.principalId ?? null)

  const createMutation = useMutation({
    mutationFn: () =>
      createTicketFn({
        data: {
          subject: subject.trim(),
          descriptionJson: descJson as unknown as { type: 'doc'; content?: unknown[] } | null,
          descriptionText: descText.trim() || plainTextFromJson(descJson) || null,
          priority,
          channel,
          visibilityScope,
          inboxId: inboxId ?? null,
          organizationId: organizationId ?? null,
          requesterContactId: contactId ?? null,
          primaryTeamId: primaryTeamId ?? null,
          assigneePrincipalId: assigneeId ?? null,
        },
      }),
    onSuccess: (ticket) => {
      toast.success('Ticket created')
      router.navigate({
        to: '/admin/tickets/$ticketId',
        params: { ticketId: ticket.id as TicketId },
      })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/tickets">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-sm font-semibold">New ticket</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!subject.trim()) {
            toast.error('Subject is required')
            return
          }
          createMutation.mutate()
        }}
        className="max-w-3xl mx-auto w-full p-6 space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={500}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <RichTextEditor
            value={descJson ?? undefined}
            onChange={(json, _html, markdown) => {
              setDescJson(json)
              setDescText(markdown)
            }}
            placeholder="Describe the issue…"
            minHeight="160px"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={visibilityScope}
              onValueChange={(v) => setVisibilityScope(v as typeof visibilityScope)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Inbox</Label>
            <InboxPicker
              value={inboxId}
              onValueChange={setInboxId}
              placeholder="Auto (route by rules)…"
              allowClear
            />
          </div>

          <div className="space-y-2">
            <Label>Primary team</Label>
            <TeamPicker
              value={primaryTeamId}
              onValueChange={setPrimaryTeamId}
              allowClear
              placeholder="Pick team…"
            />
          </div>

          <div className="space-y-2">
            <Label>Assignee</Label>
            <PrincipalPicker value={assigneeId} onValueChange={setAssigneeId} allowUnassigned />
          </div>

          <div className="space-y-2">
            <Label>Organization</Label>
            <OrgPicker
              value={organizationId}
              onValueChange={setOrganizationId}
              allowClear
              placeholder="Pick org…"
            />
          </div>

          <div className="space-y-2">
            <Label>Requester contact</Label>
            <ContactPicker
              value={contactId}
              onValueChange={setContactId}
              allowClear
              placeholder="Pick contact…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button asChild variant="outline" type="button">
            <Link to="/admin/tickets">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create ticket'}
          </Button>
        </div>
      </form>
    </div>
  )
}
