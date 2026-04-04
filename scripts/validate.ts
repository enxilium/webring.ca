import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { detectWidget } from '../src/utils/widget'
import { hasResolvableMemberCoordinates } from '../src/utils/member-coords'

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
  const ref = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : 'main'
  const base = execSync(`git show ${ref}:members.json`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
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

write(`## Webring Validation\n`)

for (const member of newMembers) {
  const results: string[] = []
  let memberFailed = false

  const safeName = sanitizeMarkdown(member.name ?? '')
  const safeUrl = sanitizeMarkdown(member.url ?? '')

  write(`### ${safeName} (${safeUrl})\n`)

  // --- Schema checks ---
  write('**Schema**')

  if (!member.slug || !member.name || !member.url || !member.type) {
    write('- FAIL: Missing required fields. Every entry needs slug, name, url, and type.')
    memberFailed = true
  } else {
    write('- PASS: All required fields present (slug, name, url, type)')
  }

  if (member.slug && !/^[a-z0-9-]+$/.test(member.slug)) {
    write(`- FAIL: slug "${sanitizeMarkdown(member.slug)}" must be lowercase alphanumeric and hyphens only (e.g. "jane-doe")`)
    memberFailed = true
  } else if (member.slug) {
    write(`- PASS: slug "${sanitizeMarkdown(member.slug)}" is valid`)
  }

  if (member.url && !member.url.startsWith('https://')) {
    write(`- FAIL: URL must use HTTPS. Got "${safeUrl}"`)
    memberFailed = true
  } else if (member.url) {
    write('- PASS: URL uses HTTPS')
  }

  if (member.type && !VALID_TYPES.includes(member.type)) {
    write(`- FAIL: type "${sanitizeMarkdown(member.type)}" is not valid. Must be one of: ${VALID_TYPES.join(', ')}`)
    memberFailed = true
  } else if (member.type) {
    write(`- PASS: type "${sanitizeMarkdown(member.type)}" is valid`)
  }

  if (member.slug && allSlugs.has(member.slug)) {
    write(`- FAIL: slug "${sanitizeMarkdown(member.slug)}" is already taken by another member`)
    memberFailed = true
  }

  if (member.url && allUrls.has(member.url)) {
    write(`- FAIL: URL "${safeUrl}" is already registered to another member`)
    memberFailed = true
  }

  if (!appendedCorrectly) {
    write('- FAIL: New entries must be appended to the bottom of the members array, not inserted in the middle')
    memberFailed = true
  }

  if (!hasResolvableMemberCoordinates(member)) {
    write('- FAIL: Coordinates are not resolvable from committed repo data. Add lat/lng or use a supported city before merge.')
    memberFailed = true
  } else {
    write('- PASS: Coordinates are resolvable from committed repo data')
  }

  // --- Site reachability ---
  write('\n**Site check**')

  try {
    const res = await fetch(member.url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'webring.ca validator' },
    })
    if (res.ok) {
      write(`- PASS: ${safeUrl} responded with HTTP ${res.status}`)

      const body = await res.text()
      if (detectWidget(body, member.slug)) {
        write('- PASS: Webring widget detected (marker + prev/next links)')
      } else {
        write('- INFO: Widget not detected yet. Install the widget before or after merge — see https://github.com/stanleypangg/webring.ca#add-the-widget')
      }
    } else {
      write(`- FAIL: ${safeUrl} returned HTTP ${res.status}. The site must return a 2xx status code.`)
      memberFailed = true
    }
  } catch {
    write(`- FAIL: ${safeUrl} is unreachable (timed out after 10s or connection refused). Make sure your site is live and publicly accessible.`)
    memberFailed = true
  }

  // --- Result ---
  if (memberFailed) {
    write('\n**Result: Not ready to merge.** Fix the issues marked FAIL above and push again.')
    hasFailure = true
  } else {
    write('\n**Result: Ready to merge.**')
  }

  allSlugs.add(member.slug)
  allUrls.add(member.url)
}

process.exit(hasFailure ? 1 : 0)
