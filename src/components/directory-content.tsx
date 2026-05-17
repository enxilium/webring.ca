import { raw } from 'hono/html'
import type { Member } from '../types'

export function DirectoryContent({ active }: { active: Member[] }) {
  const uniqueCities = new Set(active.map(m => m.city).filter(Boolean)).size

  const ringData = active.map(m => ({
    slug: m.slug,
    name: m.name,
    url: m.url,
    city: m.city,
  }))

  return (
    <div class="directory-inner">
      {raw(`<script id="ring-data" type="application/json">${JSON.stringify(ringData)}</script>`)}

      {/* Left: member directory */}
      <div class="directory-list-wrap">
        <button type="button" class="directory-arrow directory-arrow--prev" id="card-prev" aria-label="Previous member" disabled>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>
        </button>
        <div class="directory-list">
          <div class="directory-header">
            <span class="directory-header-name">Name</span>
            <span class="directory-header-site">Site</span>
            <span class="directory-header-city">City</span>
          </div>
          {active.map((m) => {
            const domain = m.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
            return (
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                class="directory-row"
                data-member={m.slug}
              >
                <span class="directory-row-name">{m.name}</span>
                <span class="directory-row-site">{domain}</span>
                <span class="directory-row-city">{m.city ?? ''}</span>
              </a>
            )
          })}
        </div>
        <button type="button" class="directory-arrow directory-arrow--next" id="card-next" aria-label="Next member">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <div class="directory-pagination">
          <button class="directory-pagination-btn" id="page-prev" disabled aria-label="Previous page">&larr; Prev</button>
          <span id="page-info"></span>
          <button class="directory-pagination-btn" id="page-next" aria-label="Next page">Next &rarr;</button>
        </div>
      </div>

      {/* Right: D3 interactive ring */}
      <div class="directory-ring-wrap" id="directory-ring">
        <div class="directory-search">
          <input
            type="search"
            id="directory-search-input"
            class="directory-search-input"
            placeholder="Search members by name..."
            autocomplete="off"
            spellcheck={false}
            aria-label="Search members"
          />
        </div>
        <div id="ring-viz"></div>
      </div>
    </div>
  )
}
