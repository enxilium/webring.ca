import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

/**
 * Input schema for new member submissions.
 * Derived from Member in src/types.ts — active defaults to true when omitted.
 */
interface NewMemberInput {
  slug: string
  name: string
  url: string
  city?: string
  type: string
  active?: boolean
}

const VALID_TYPES = ['developer', 'designer', 'founder', 'other']

function sanitizeMarkdown(text: string): string {
  return text.replace(/[[\](){}*_~`#>!|\\]/g, '\\$&')
}

function write(text: string): void {
  process.stdout.write(text + '\n')
}

const membersPath = resolve(import.meta.dirname!, '..', 'members.json')

let members: NewMemberInput[]
try {
  members = JSON.parse(readFileSync(membersPath, 'utf-8'))
} catch {
  write('## Webring Validation\n')
  write('members.json is not valid JSON')
  process.exit(1)
}

let baseMembers: NewMemberInput[] = []
try {
  const base = execSync('git show main:members.json', { encoding: 'utf-8' })
  baseMembers = JSON.parse(base)
} catch {
  // No base — first time, all members are new
}

const baseSlugs = new Set(baseMembers.map((m) => m.slug))
const newMembers = members.filter((m) => !baseSlugs.has(m.slug))

if (newMembers.length === 0) {
  write('## Webring Validation\n')
  write('No new members found in this change.')
  process.exit(0)
}

const existingCount = baseMembers.length
const appendedCorrectly = newMembers.every((nm) => {
  const idx = members.findIndex((m) => m.slug === nm.slug)
  return idx >= existingCount
})

let hasFailure = false
const allSlugs = new Set<string>()
const allUrls = new Set<string>()
for (const m of baseMembers) {
  allSlugs.add(m.slug)
  allUrls.add(m.url)
}

for (const member of newMembers) {
  const results: string[] = []
  let memberFailed = false

  const safeName = sanitizeMarkdown(member.name ?? '')
  const safeUrl = sanitizeMarkdown(member.url ?? '')

  write(`## Webring Validation\n`)
  write(`**New member:** ${safeName} (${safeUrl})\n`)

  if (!member.slug || !member.name || !member.url || !member.type) {
    results.push('Missing required fields (slug, name, url, type)')
    memberFailed = true
  }

  if (member.slug && !/^[a-z0-9-]+$/.test(member.slug)) {
    results.push('Slug must be lowercase alphanumeric + hyphens only')
    memberFailed = true
  }

  if (member.url && !member.url.startsWith('https://')) {
    results.push('URL must use HTTPS')
    memberFailed = true
  }

  if (member.type && !VALID_TYPES.includes(member.type)) {
    results.push(`Type must be one of: ${VALID_TYPES.join(', ')}`)
    memberFailed = true
  }

  if (member.slug && allSlugs.has(member.slug)) {
    results.push('Duplicate slug')
    memberFailed = true
  }

  if (member.url && allUrls.has(member.url)) {
    results.push('Duplicate URL')
    memberFailed = true
  }

  if (!appendedCorrectly) {
    results.push('New entries must be appended to the bottom of the array')
    memberFailed = true
  }

  if (!memberFailed) {
    results.push('Schema valid')
  }

  try {
    const res = await fetch(member.url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'webring.ca validator' },
    })
    if (res.ok) {
      results.push(`Site reachable (HTTP ${res.status})`)

      const body = await res.text()
      if (!body.toLowerCase().includes('webring.ca')) {
        results.push('Widget not detected yet — add the widget after merge')
      }
    } else {
      results.push(`Site returned HTTP ${res.status}`)
      memberFailed = true
    }
  } catch {
    results.push('Site unreachable (timed out or connection failed)')
    memberFailed = true
  }

  for (const r of results) write(r)

  if (memberFailed) {
    write('\n**Result: Please fix the issues above**')
    hasFailure = true
  } else {
    write('\n**Result: Ready to merge** (pending widget installation)')
  }

  allSlugs.add(member.slug)
  allUrls.add(member.url)
}

process.exit(hasFailure ? 1 : 0)
