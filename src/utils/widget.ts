function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extract same-origin `<script src="...">` URLs from raw HTML.
 *
 * Returns up to 10 resolved absolute URLs. Cross-origin scripts are excluded
 * because the widget markup will be compiled into the site's own bundles, not
 * third-party libraries.
 */
export function extractScriptUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = []
  const regex = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
  const base = new URL(baseUrl)
  let match
  while ((match = regex.exec(html)) !== null && urls.length < 10) {
    try {
      const resolved = new URL(match[1], base)
      if (resolved.origin === base.origin) {
        urls.push(resolved.href)
      }
    } catch {
      // Invalid URL, skip
    }
  }
  return urls
}

/**
 * Detect webring widget markers inside compiled JS content (e.g. bundled JSX).
 *
 * This is intentionally more lenient than `detectWidget()` because bundlers
 * destroy the HTML structure. We are answering: "Did the developer include the
 * webring widget in their source code?" rather than verifying rendered HTML.
 */
export function detectWidgetInBundle(js: string, slug?: string): boolean {
  const lower = js.toLowerCase()

  // Primary: embed.js script reference (strong, unique signal)
  if (lower.includes('webring.ca/embed.js')) {
    if (!slug) return true
    const slugLower = escapeRegex(slug.toLowerCase())
    return lower.includes('data-member') && new RegExp(`["']${slugLower}["']`).test(lower)
  }

  // Secondary: both prev and next webring.ca links (data-webring marker optional)
  if (lower.includes('webring.ca/prev/') && lower.includes('webring.ca/next/')) {
    if (!slug) return true
    const slugPattern = escapeRegex(slug.toLowerCase())
    const hasPrev = new RegExp(`webring\\.ca/prev/${slugPattern}`).test(lower)
    const hasNext = new RegExp(`webring\\.ca/next/${slugPattern}`).test(lower)
    return hasPrev && hasNext
  }

  return false
}

/**
 * Detect whether an HTML page contains a valid webring widget.
 *
 * Two detection paths:
 * 1. **embed.js**: `webring.ca/embed.js` script + matching `data-member` slug
 * 2. **Manual widget**: both a prev link (`webring.ca/prev/{slug}`) and a next
 *    link (`webring.ca/next/{slug}`). No marker attribute required.
 *
 * When `slug` is provided, links must match that member exactly.
 * HTML comments are stripped before detection so hidden scripts don't pass.
 *
 * NOTE: Detection runs against raw HTML returned by fetch(). Sites that render
 * the widget entirely via client-side JavaScript (SPAs with no SSR) will not
 * pass -- use `detectWidgetInBundle()` as a fallback for those.
 */
export function detectWidget(html: string, slug?: string): boolean {
  const stripped = html.toLowerCase().replace(/<!--[\s\S]*?-->/g, '')

  // embed.js path: script tag + matching data-member is sufficient
  // because embed.js renders prev/next links client-side in a Shadow DOM
  const hasEmbedScript = stripped.includes('webring.ca/embed.js')
  if (hasEmbedScript) {
    if (!slug) return true
    return new RegExp(`data-member=["']${escapeRegex(slug.toLowerCase())}["']`).test(stripped)
  }

  // Manual widget path: prev + next links are sufficient (the slug match
  // already prevents false positives, so the data-webring marker is optional)
  const slugPattern = slug ? escapeRegex(slug.toLowerCase()) : '[a-z0-9-]+'
  const hasPrev = new RegExp(`href=["'][^"']*webring\\.ca/prev/${slugPattern}(?:[?#/][^"']*)?["']`).test(stripped)
  const hasNext = new RegExp(`href=["'][^"']*webring\\.ca/next/${slugPattern}(?:[?#/][^"']*)?["']`).test(stripped)
  return hasPrev && hasNext
}
