/**
 * Built-in user-segment field registry.
 *
 * Single source of truth for the set of built-in attributes that the
 * dynamic-segment evaluator understands. Consumed by both the server
 * evaluator and the rule-builder UI — keep this module free of DB
 * imports and server-only imports.
 */

export interface BuiltinField {
  /** The SegmentCondition.attribute value stored in the rules JSON */
  key: string
  /** Human label for the picker and attributes view */
  label: string
  /** Data type — drives operator choices and input control rendering */
  type: 'string' | 'number' | 'boolean' | 'date'
  /** Short description shown as a tooltip or helper text */
  description?: string
  /** Enum fields: list of accepted values rendered as a select input */
  allowedValues?: readonly string[]
}

/**
 * All built-in fields, in display order.
 *
 * - `plan` and `metadata_key` are NOT included — those are the
 *   custom-attribute mechanism and have dedicated handling.
 */
export const BUILTIN_FIELDS = [
  {
    key: 'name',
    label: 'Name',
    type: 'string',
    description: "The user's display name from their profile.",
  },
  {
    key: 'display_name',
    label: 'Display Name',
    type: 'string',
    description:
      "The principal's display name. May differ from the user name for service principals.",
  },
  {
    key: 'email_domain',
    label: 'Email Domain',
    type: 'string',
    description: 'The domain part of the email address (e.g. "acme.com").',
  },
  {
    key: 'email_verified',
    label: 'Email Verified',
    type: 'boolean',
    description: 'Whether the user has verified their email address.',
  },
  {
    key: 'principal_type',
    label: 'Principal Type',
    type: 'string',
    description: 'Whether the principal is a human user or an anonymous visitor.',
    allowedValues: ['user', 'anonymous'] as const,
  },
  {
    key: 'created_at_days_ago',
    label: 'Account Age (days)',
    type: 'number',
    description: 'How many days ago the principal was created.',
  },
  {
    key: 'post_count',
    label: 'Post Count',
    type: 'number',
    description: 'Number of feedback posts the user has submitted.',
  },
  {
    key: 'vote_count',
    label: 'Vote Count',
    type: 'number',
    description: 'Number of votes the user has cast.',
  },
  {
    key: 'comment_count',
    label: 'Comment Count',
    type: 'number',
    description: 'Number of comments the user has made.',
  },
] as const satisfies readonly BuiltinField[]

/** Map from key to BuiltinField for O(1) lookup */
export const BUILTIN_FIELD_MAP: ReadonlyMap<string, BuiltinField> = new Map(
  BUILTIN_FIELDS.map((f) => [f.key, f])
)

/** Returns true when `key` matches a registered built-in field */
export function isBuiltinField(key: string): boolean {
  return BUILTIN_FIELD_MAP.has(key)
}
