import { useCallback, useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  createWidgetTicket,
  WidgetTicketError,
  type WidgetTicketCreateResponse,
  type WidgetSupportCategory,
  type WidgetSupportPriority,
} from '@/lib/client/widget/tickets-api'
import { useWidgetAuth } from './widget-auth-provider'

interface WidgetSupportNewProps {
  onCreated: (ticket: WidgetTicketCreateResponse) => void
  categories?: WidgetSupportCategory[]
}

const inputCls =
  'w-full bg-background rounded-md border border-border/50 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors'

export function WidgetSupportNew({ onCreated, categories = [] }: WidgetSupportNewProps) {
  const intl = useIntl()
  const { isIdentified, hmacRequired, identifyWithEmail, ensureSessionThen, emitEvent } =
    useWidgetAuth()

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<WidgetSupportPriority>('normal')
  const [categoryKey, setCategoryKey] = useState<string>(
    categories.length === 1 ? categories[0].categoryKey : ''
  )
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const needsEmail = !isIdentified && !hmacRequired
  const cantIdentify = !isIdentified && hmacRequired
  const selectedCategory = categories.find((category) => category.categoryKey === categoryKey)
  const priorityOptions: WidgetSupportPriority[] = selectedCategory?.allowedPriorities?.length
    ? selectedCategory.allowedPriorities
    : selectedCategory
      ? ['low', 'normal', 'high', 'urgent']
      : ['low', 'normal', 'high']
  const showPrioritySelector = selectedCategory?.display?.showPrioritySelector !== false

  useEffect(() => {
    if (categories.length === 1 && categoryKey !== categories[0].categoryKey) {
      setCategoryKey(categories[0].categoryKey)
    }
    if (categories.length !== 1 && selectedCategory && !priorityOptions.includes(priority)) {
      setPriority(selectedCategory.defaultPriority ?? priorityOptions[0] ?? 'normal')
    }
    if (selectedCategory?.defaultPriority && priority === 'normal') {
      setPriority(selectedCategory.defaultPriority)
    }
  }, [categories, categoryKey, selectedCategory, priorityOptions, priority])

  const canSubmit =
    !cantIdentify &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (categories.length <= 1 || categoryKey.length > 0) &&
    (!needsEmail || email.trim().length > 0)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit || submitting) return
      setSubmitting(true)
      setError(null)

      try {
        if (needsEmail) {
          const ok = await identifyWithEmail(email.trim(), name.trim() || undefined)
          if (!ok) {
            setError(
              intl.formatMessage({
                id: 'widget.support.composer.errorEmail',
                defaultMessage: 'Could not verify your email. Please try again.',
              })
            )
            return
          }
        }

        let created: WidgetTicketCreateResponse | null = null
        await ensureSessionThen(async () => {
          created = await createWidgetTicket({
            subject: subject.trim(),
            bodyText: body.trim(),
            priority: showPrioritySelector ? priority : undefined,
            categoryKey: selectedCategory?.categoryKey,
          })
        })
        const finalCreated = created as WidgetTicketCreateResponse | null
        if (!finalCreated) {
          setError(
            intl.formatMessage({
              id: 'widget.support.composer.errorCreate',
              defaultMessage: 'Could not create the ticket. Please try again.',
            })
          )
          return
        }
        emitEvent('ticket:created', {
          id: finalCreated.id,
          subject: finalCreated.subject,
          statusId: finalCreated.statusId,
          statusCategory: finalCreated.statusCategory,
        })
        onCreated(finalCreated)
      } catch (err) {
        setError(
          err instanceof WidgetTicketError
            ? err.message
            : intl.formatMessage({
                id: 'widget.support.composer.errorCreate',
                defaultMessage: 'Could not create the ticket. Please try again.',
              })
        )
      } finally {
        setSubmitting(false)
      }
    },
    [
      canSubmit,
      submitting,
      needsEmail,
      identifyWithEmail,
      email,
      name,
      ensureSessionThen,
      subject,
      body,
      priority,
      showPrioritySelector,
      selectedCategory?.categoryKey,
      emitEvent,
      onCreated,
      intl,
    ]
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pt-2 pb-3 space-y-2">
          {categories.length > 1 && (
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">
                <FormattedMessage
                  id="widget.support.composer.category.label"
                  defaultMessage="Category"
                />
              </label>
              <select
                value={categoryKey}
                onChange={(e) => setCategoryKey(e.target.value)}
                disabled={submitting}
                className={inputCls}
              >
                <option value="">
                  {intl.formatMessage({
                    id: 'widget.support.composer.category.placeholder',
                    defaultMessage: 'Select a category',
                  })}
                </option>
                {categories.map((category) => (
                  <option key={category.categoryKey} value={category.categoryKey}>
                    {category.label}
                  </option>
                ))}
              </select>
              {selectedCategory?.description && (
                <p className="text-[11px] text-muted-foreground/70">
                  {selectedCategory.description}
                </p>
              )}
            </div>
          )}

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            disabled={submitting}
            placeholder={intl.formatMessage({
              id: 'widget.support.composer.subjectPlaceholder',
              defaultMessage: 'Subject',
            })}
            className={inputCls}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            rows={6}
            disabled={submitting}
            placeholder={intl.formatMessage({
              id: 'widget.support.composer.bodyPlaceholder',
              defaultMessage: 'Describe your issue...',
            })}
            className={`${inputCls} min-h-[120px] resize-y`}
          />

          {showPrioritySelector && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground shrink-0">
                <FormattedMessage
                  id="widget.support.composer.priority.label"
                  defaultMessage="Priority"
                />
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WidgetSupportPriority)}
                disabled={submitting}
                className={inputCls}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {intl.formatMessage({
                      id: `widget.support.composer.priority.${option}`,
                      defaultMessage:
                        option === 'low'
                          ? 'Low'
                          : option === 'normal'
                            ? 'Normal'
                            : option === 'high'
                              ? 'High'
                              : 'Urgent',
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {needsEmail && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                placeholder={intl.formatMessage({
                  id: 'widget.support.composer.emailPlaceholder',
                  defaultMessage: 'Your email',
                })}
                className={inputCls}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                placeholder={intl.formatMessage({
                  id: 'widget.support.composer.namePlaceholder',
                  defaultMessage: 'Your name (optional)',
                })}
                className={inputCls}
              />
            </div>
          )}

          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border/40 shrink-0 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <FormattedMessage id="widget.support.composer.submitting" defaultMessage="Sending..." />
          ) : (
            <FormattedMessage id="widget.support.composer.submit" defaultMessage="Send" />
          )}
        </button>
      </div>
    </form>
  )
}
