import { Hono } from 'hono'
import { raw } from 'hono/html'
import type { Bindings, Member } from '../types'
import { getActiveMembers, getEffectiveRingOrder } from '../data'
import { CANADA_VIEWBOX, CANADA_OUTLINE_PATH, CANADA_REGION_PATHS, projectToSvg } from '../lib/canada-map'
import { getMemberCoordinates } from '../utils/member-coords'

const PANEL_NAMES = ['Splash', 'About', 'Directory', 'Explore', 'Join']

function SplashContent({ active, ringEntrySlug }: { active: Member[]; ringEntrySlug: string }) {
  return (
    <div class="splash-inner">
      <header>
        <h1 class="poster-text hero-top">
          <span class="stretch-wide">WEBRING</span>
          <span class="stretch-wide">FOR</span>
        </h1>
        <img src="/canada-flag.svg" alt="Flag of Canada" class="canada-flag" />
      </header>

      <div class="splash-map-wrap">
        <svg
          class="splash-map"
          viewBox={CANADA_VIEWBOX}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`Map of Canada showing ${active.length} members`}
        >
          {CANADA_REGION_PATHS.map((region) => (
            <path d={region.d} class="splash-region" />
          ))}
          <path d={CANADA_OUTLINE_PATH} class="splash-outline" />
          {active.map((m) => {
            const coords = getMemberCoordinates(m)
            if (!coords) return null
            const { x, y } = projectToSvg(coords.lat, coords.lng)
            return (
              <circle cx={x} cy={y} r="4" class="splash-dot">
                <title>{m.name}{m.city ? ` — ${m.city}` : ''}</title>
              </circle>
            )
          })}
        </svg>
      </div>

      <footer>
        <div class="hero-bottom">
          <div class="hero-bottom-inner">
            <h2 class="poster-text hero-bottom-text">
              {raw('CA<span class="flag-white-outline">NA</span>DA')}
            </h2>
            <nav class="ring-widget" aria-label="Webring navigation">
              <a href={`/prev/${ringEntrySlug}`} class="ring-widget-arrow" aria-label="Previous site in ring">{raw('&larr;')}</a>
              <a href="/random" class="ring-widget-leaf" aria-label="Random site in ring">
                <img src="/maple-leaf.svg" alt="" aria-hidden="true" />
              </a>
              <a href={`/next/${ringEntrySlug}`} class="ring-widget-arrow" aria-label="Next site in ring">{raw('&rarr;')}</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}

function AboutContent() {
  // 5 nodes on an ellipse: rx=120, ry=100, center=(200,180)
  const rx = 120
  const ry = 100
  const cx = 200
  const cy = 180
  const nodeCount = 5
  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry, isActive: i === 0 }
  })

  // Build ellipse path string for the dashed ring + animateMotion
  const ellipsePath = `M${cx - rx},${cy} A${rx},${ry} 0 1,1 ${cx + rx},${cy} A${rx},${ry} 0 1,1 ${cx - rx},${cy}`

  return (
    <div class="about-inner">
      <div class="about-layout">
        <div class="about-visual">
          <svg
            class="about-svg"
            viewBox="0 0 400 360"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Diagram showing how a webring connects member sites in a loop"
          >
            {/* Faint Canada outline background */}
            <g transform="translate(-200 -80) scale(0.5)">
              <path d={CANADA_OUTLINE_PATH} class="about-ring-bg" />
            </g>

            {/* Dashed ring path */}
            <path d={ellipsePath} class="about-ring-path" />

            {/* Traversal dot */}
            <circle r="5" class="about-ring-dot">
              <animateMotion dur="6s" repeatCount="indefinite" path={ellipsePath} />
            </circle>

            {/* Site nodes */}
            {nodes.map((n, i) => (
              <g
                class={`about-ring-node${n.isActive ? ' about-ring-node--active' : ''}`}
                style={`animation-delay: ${i * 0.1}s`}
              >
                <rect x={n.x - 22} y={n.y - 16} width="44" height="32" rx="4" class="about-node-rect" />
                <line x1={n.x - 22} y1={n.y - 8} x2={n.x + 22} y2={n.y - 8} class="about-node-bar" />
                {n.isActive && (
                  <text x={n.x} y={n.y + 30} class="about-ring-label">You</text>
                )}
              </g>
            ))}
          </svg>
        </div>

        <div class="about-text">
          <h2 class="about-title">About</h2>
          <div class="about-body">
            <p>
              webring.ca is a webring for Canadian builders — developers, designers, and founders
              with personal sites. Each member's site links to the next, forming a ring that connects
              creators across the country.
            </p>
            <p>
              Webrings were one of the earliest ways people discovered new corners of the web.
              We're bringing that idea back for a community that still values owning your own space online.
            </p>
            <p>
              This project is open source and community-run. No algorithms, no feeds, no ads —
              just people linking to people.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SitePreviewContent() {
  return (
    <div class="preview-inner" id="preview-panel">
      {/* Skeleton loading state */}
      <div class="preview-skeleton" id="preview-skeleton">
        <span class="preview-skeleton-label" id="preview-skeleton-name">Loading...</span>
        <div class="preview-skeleton-shimmer"></div>
      </div>

      {/* Iframe container — iframe injected by client-side JS */}
      <div class="preview-iframe-wrap" id="preview-iframe-wrap"></div>

      {/* Fallback card — shown when iframe is blocked */}
      <div class="preview-fallback" id="preview-fallback" style="display: none;">
        <div class="preview-fallback-card">
          <span class="preview-fallback-name" id="preview-fallback-name"></span>
          <span class="preview-fallback-meta" id="preview-fallback-meta"></span>
          <a class="preview-fallback-link" id="preview-fallback-link" href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
            Visit site {raw('&rarr;')}
          </a>
        </div>
      </div>

      {/* Controls overlay */}
      <div class="preview-controls" id="preview-controls">
        <button type="button" class="preview-nav preview-nav-prev" id="preview-prev" aria-label="Previous member">{raw('&#8592;')}</button>
        <div class="preview-info">
          <span class="preview-member-name" id="preview-name"></span>
          <span class="preview-member-sep">{raw('&middot;')}</span>
          <span class="preview-member-city" id="preview-city"></span>
        </div>
        <button type="button" class="preview-nav preview-nav-next" id="preview-next" aria-label="Next member">{raw('&#8594;')}</button>
        <a class="preview-open" id="preview-open" href="javascript:void(0)" target="_blank" rel="noopener noreferrer" aria-label="Open site in new tab">{raw('&#8599;')}</a>
      </div>
    </div>
  )
}

function JoinContent({ memberCount }: { memberCount: number }) {
  return (
    <div class="join-inner">
      <div class="join-content">
        <span class="join-eyebrow">Join the ring</span>
        <h2 class="join-headline">Want in?</h2>
        <p class="join-body">
          {memberCount} Canadian builders and counting.
          Add your site to the ring and be part of a community
          sharing their work on the open web.
        </p>
        <a href="/join" class="join-button">
          Learn how to join {raw('&rarr;')}
        </a>
      </div>
    </div>
  )
}

// Assign a unique accent color per member type
const TYPE_COLORS: Record<string, string> = {
  developer: '#2563EB',
  designer: '#9333EA',
  founder: '#059669',
  other: '#D97706',
}

function DirectoryContent({ active }: { active: Member[] }) {
  const uniqueCities = new Set(active.map(m => m.city).filter(Boolean)).size
  const uniqueTypes = new Set(active.map(m => m.type)).size

  const ringData = active.map(m => ({
    slug: m.slug,
    name: m.name,
    url: m.url,
    city: m.city,
    type: m.type,
  }))

  return (
    <div class="directory-inner">
      {raw(`<script id="ring-data" type="application/json">${JSON.stringify(ringData)}</script>`)}

      {/* Left: member directory */}
      <div class="directory-list-wrap">
        <h2 class="directory-title">Directory</h2>
        <div class="directory-list">
          {active.map((m) => {
            const color = TYPE_COLORS[m.type] ?? TYPE_COLORS.other
            return (
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                class="directory-row"
                data-member={m.slug}
              >
                <span class="directory-row-indicator" style={`background: ${color}`}></span>
                <span class="directory-row-name">{m.name}</span>
                <span class="directory-row-city">{m.city ?? ''}</span>
                <span class="directory-row-type" style={`color: ${color}`}>{m.type}</span>
              </a>
            )
          })}
        </div>
      </div>

      {/* Right: D3 interactive ring + stats */}
      <div class="directory-ring-wrap" id="directory-ring">
        <div id="ring-viz"></div>

        <div class="directory-stats">
          <span class="directory-stat">{active.length} members</span>
          <span class="directory-stat-sep">/</span>
          <span class="directory-stat">{uniqueCities} cities</span>
          <span class="directory-stat-sep">/</span>
          <span class="directory-stat">{uniqueTypes} disciplines</span>
        </div>
      </div>
    </div>
  )
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  c.header('Cache-Control', 'public, max-age=300')
  const [active, ringOrder] = await Promise.all([
    getActiveMembers(c.env.WEBRING),
    getEffectiveRingOrder(c.env.WEBRING),
  ])
  const ringEntrySlug = ringOrder[0] ?? active[0]?.slug ?? ''

  const dots = PANEL_NAMES.map((name, i) =>
    `<button class="ring-dot${i === 0 ? ' is-active' : ''}" data-dot="${i}" aria-label="Go to ${name}"></button>`
  ).join('')

  const previewMembers = JSON.stringify(active.map(m => ({
    name: m.name, url: m.url, city: m.city || '', type: m.type, slug: m.slug
  })))

  return c.html(
    <>
      {raw('<!DOCTYPE html>')}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>webring.ca</title>
          <meta name="description" content="A webring for Canadian builders — developers, designers, and founders." />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&amp;family=Space+Mono:wght@400;700&amp;display=swap" rel="stylesheet" />
          {raw(`<script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);window.__toggleTheme=function(){var d=document.documentElement,c=d.getAttribute('data-theme'),isDark=c?c==='dark':matchMedia('(prefers-color-scheme:dark)').matches,n=isDark?'light':'dark';d.setAttribute('data-theme',n);localStorage.setItem('theme',n)}})()</script>`)}
          <style>{raw(`
            :root {
              color-scheme: light;
              --bg: #f5f3f0;
              --fg: #1a1a1a;
              --fg-muted: #888;
              --fg-faint: #bbb;
              --border: #e0ddd8;
              --border-strong: #1a1a1a;
              --accent: #AF272F;
              --accent-light: #c22;
              --panel-alt: #f5f3f0;
            }
            @media (prefers-color-scheme: dark) {
              :root:not([data-theme="light"]) {
                color-scheme: dark;
                --bg: #111110;
                --fg: #e0ddd8;
                --fg-muted: #666;
                --fg-faint: #444;
                --border: #2a2927;
                --border-strong: #e0ddd8;
                --accent: #AF272F;
                --accent-light: #f55;
                --panel-alt: #1a1918;
              }
            }
            [data-theme="dark"] {
              color-scheme: dark;
              --bg: #111110;
              --fg: #e0ddd8;
              --fg-muted: #666;
              --fg-faint: #444;
              --border: #2a2927;
              --border-strong: #e0ddd8;
              --accent: #AF272F;
              --accent-light: #f55;
              --panel-alt: #1a1918;
            }

            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

            body {
              font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
              -webkit-font-smoothing: antialiased;
              color: var(--fg);
              background: var(--bg);
              overflow: hidden;
              height: 100vh;
              width: 100vw;
              margin: 0;
            }

            /* ── Ring container ── */
            .ring {
              position: fixed;
              inset: 0;
              overflow: hidden;
              width: 100vw;
              height: 100vh;
            }

            .ring-track {
              display: flex;
              flex-direction: row;
              flex-wrap: nowrap;
              height: 100%;
            }

            /* ── Panels ── */
            .panel {
              flex: 0 0 100vw;
              width: 100vw;
              height: 100vh;
              overflow: hidden;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--bg);
            }

            .panel--alt { background: var(--panel-alt); }

            /* ── Panel 1: Splash ── */
            .splash-inner {
              width: calc(100% - 5rem);
              height: calc(100% - 5rem);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              user-select: none;
            }

            .poster-text {
              line-height: 0.72;
              letter-spacing: -0.05em;
              text-transform: uppercase;
              font-weight: 900;
            }

            .stretch-wide { display: block; }

            .splash-inner > header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }

            .hero-top {
              font-size: 11vw;
              color: var(--fg);
              display: flex;
              flex-direction: column;
              align-items: flex-start;
            }

            .hero-bottom { width: 100%; container-type: inline-size; }

            .hero-bottom-inner {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 2cqw;
            }

            .hero-bottom-text {
              font-size: 14cqw;
              line-height: 0.75;
              white-space: nowrap;
              color: var(--accent);
              -webkit-text-stroke: 4px var(--accent);
            }

            .canada-flag {
              height: 15.84vw;
              width: auto;
              flex-shrink: 0;
            }

            .flag-white-outline {
              color: transparent;
              margin-right: 0.02em;
            }
            @media (prefers-color-scheme: dark) {
              :root:not([data-theme="light"]) .flag-white-outline {
                color: var(--fg);
                -webkit-text-stroke-color: transparent;
              }
            }
            [data-theme="dark"] .flag-white-outline {
              color: var(--fg);
              -webkit-text-stroke-color: transparent;
            }
            @media (prefers-color-scheme: dark) {
              :root:not([data-theme="light"]) .ring-widget-leaf img {
                filter: invert(1);
              }
            }
            [data-theme="dark"] .ring-widget-leaf img {
              filter: invert(1);
            }

            .ring-widget {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 1cqw;
              flex-shrink: 0;
              width: 31.68vw;
            }

            .ring-widget-arrow {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 4cqw;
              font-weight: 700;
              color: var(--fg);
              text-decoration: none;
              line-height: 1;
            }

            .ring-widget-leaf {
              display: flex;
              align-items: center;
            }

            .ring-widget-leaf img {
              height: 6cqw;
              width: auto;
            }

            .splash-map-wrap {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }

            .splash-map {
              width: 80vw;
              max-width: 1100px;
              height: auto;
            }

            .splash-region {
              fill: none;
              stroke: var(--border);
              stroke-width: 0.5;
              stroke-linejoin: round;
            }

            .splash-outline {
              fill: none;
              stroke: var(--fg-muted);
              stroke-width: 1;
              stroke-linejoin: round;
            }

            .splash-dot {
              fill: var(--accent);
              opacity: 0.7;
            }


            /* ── Panel 2: About ── */
            .about-inner {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 3rem;
            }

            .about-layout {
              display: grid;
              grid-template-columns: 45% 55%;
              align-items: center;
              gap: 3rem;
              max-width: 960px;
              width: 100%;
            }

            .about-visual {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .about-svg {
              width: 100%;
              max-width: 360px;
              height: auto;
            }

            .about-text {
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
            }

            .about-title {
              font-size: 1rem;
              font-family: 'Space Mono', monospace;
              font-weight: 400;
              letter-spacing: 0.15em;
              text-transform: uppercase;
              color: var(--fg-muted);
            }

            .about-body {
              display: flex;
              flex-direction: column;
              gap: 1.25rem;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1.05rem;
              line-height: 1.7;
              color: var(--fg);
            }

            .about-body p {
              margin: 0;
            }

            /* Ring diagram */
            .about-ring-bg {
              fill: none;
              stroke: var(--border);
              stroke-width: 1;
              stroke-linejoin: round;
              opacity: 0.06;

            }

            .about-ring-path {
              fill: none;
              stroke: var(--accent);
              stroke-width: 1.5;
              stroke-dasharray: 6 4;
              opacity: 0;
              animation: about-path-draw 1.5s ease-out 0.5s forwards;
            }

            @keyframes about-path-draw {
              from { stroke-dashoffset: 800; opacity: 0; }
              to { stroke-dashoffset: 0; opacity: 0.35; }
            }

            .about-ring-dot {
              fill: var(--accent);
              opacity: 0;
              filter: drop-shadow(0 0 4px var(--accent));
              animation: about-dot-appear 0.3s ease-out 2s forwards;
            }

            @keyframes about-dot-appear {
              from { opacity: 0; }
              to { opacity: 0.85; }
            }

            .about-ring-node {
              opacity: 0;
              animation: about-node-in 0.4s ease-out forwards;
              transform-box: fill-box;
              transform-origin: center;
            }

            @keyframes about-node-in {
              from { opacity: 0; transform: scale(0.7); }
              to { opacity: 1; transform: scale(1); }
            }

            .about-node-rect {
              fill: var(--bg);
              stroke: var(--border);
              stroke-width: 1.5;
              transition: transform 0.25s ease, stroke 0.25s ease;
              transform-box: fill-box;
              transform-origin: center;
            }

            .about-ring-node:not(.about-ring-node--active):hover .about-node-rect {
              transform: scale(1.1);
              stroke: var(--fg-muted);
            }

            .about-node-bar {
              stroke: var(--border);
              stroke-width: 1;
            }

            .about-ring-node--active .about-node-rect {
              stroke: var(--accent);
              stroke-width: 2;
              animation: about-you-pulse 3s ease-in-out infinite;
            }

            @keyframes about-you-pulse {
              0%, 100% { filter: drop-shadow(0 0 0px transparent); }
              50% { filter: drop-shadow(0 0 6px var(--accent)); }
            }

            .about-ring-node--active .about-node-bar {
              stroke: var(--accent);
              opacity: 0.5;
            }

            .about-ring-label {
              font-family: 'Space Mono', monospace;
              font-size: 11px;
              fill: var(--accent);
              text-anchor: middle;
              font-weight: 700;
            }

            .about-body p {
              opacity: 0;
              animation: about-text-in 0.5s ease-out forwards;
            }
            .about-body p:nth-child(1) { animation-delay: 0.8s; }
            .about-body p:nth-child(2) { animation-delay: 1.1s; }
            .about-body p:nth-child(3) { animation-delay: 1.4s; }

            @keyframes about-text-in {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }

            @media (prefers-reduced-motion: reduce) {
              .about-ring-path,
              .about-ring-dot,
              .about-ring-node,
              .about-body p {
                animation: none;
                opacity: 1;
              }
              .about-ring-path { opacity: 0.35; }
              .about-ring-dot { opacity: 0.85; }
              .about-ring-node--active .about-node-rect {
                animation: none;
                filter: drop-shadow(0 0 4px var(--accent));
              }
            }

            /* ── Panel 3: Directory (split layout) ── */
            .directory-inner {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: stretch;
              padding: 3rem;
              gap: 3rem;
              max-width: 1200px;
              margin: 0 auto;
            }

            /* Left: directory list */
            .directory-list-wrap {
              flex: 0 0 45%;
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
              min-width: 0;
              overflow: hidden;
            }

            .directory-title {
              font-size: 0.85rem;
              font-family: 'Space Mono', monospace;
              font-weight: 400;
              letter-spacing: 0.15em;
              text-transform: uppercase;
              color: var(--fg-muted);
              flex-shrink: 0;
            }

            .directory-list {
              display: flex;
              flex-direction: column;
              overflow-y: auto;
              flex: 1;
              scrollbar-width: thin;
              scrollbar-color: var(--border) transparent;
            }

            .directory-row {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              padding: 0.6rem 0;
              border-bottom: 1px solid var(--border);
              text-decoration: none;
              color: var(--fg);
              transition: background 0.15s, padding-left 0.15s;
            }

            .directory-row:first-child {
              border-top: 1px solid var(--border);
            }

            .directory-row:hover {
              background: color-mix(in srgb, var(--fg) 4%, transparent);
              padding-left: 0.25rem;
            }

            .directory-row-indicator {
              width: 3px;
              height: 1.2rem;
              border-radius: 1px;
              flex-shrink: 0;
            }

            .directory-row-name {
              font-size: 0.95rem;
              font-weight: 600;
              letter-spacing: -0.01em;
              flex: 1;
              min-width: 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .directory-row-city {
              font-size: 0.8rem;
              color: var(--fg-muted);
              flex-shrink: 0;
            }

            .directory-row-type {
              font-family: 'Space Mono', monospace;
              font-size: 0.65rem;
              font-weight: 700;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              flex-shrink: 0;
              width: 5.5rem;
              text-align: right;
            }

            /* Right: ring + stats */
            .directory-ring-wrap {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1.5rem;
              min-width: 0;
            }

            .directory-ring-svg {
              width: 100%;
              max-width: 340px;
              height: auto;
            }

            .ring-node {
              transition: opacity 0.2s;
            }

            .ring-node-arc {
              fill: none;
              stroke-width: 2.5;
              opacity: 0.5;
              transition: opacity 0.2s, stroke-width 0.2s;
            }

            .ring-node-bg {
              opacity: 0.85;
              transition: transform 0.2s, opacity 0.2s;
              transform-origin: center;
              transform-box: fill-box;
            }

            .ring-node-initial {
              fill: #fff;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 12px;
              font-weight: 700;
              text-anchor: middle;
              dominant-baseline: central;
              pointer-events: none;
            }

            .ring-node-label {
              fill: var(--fg);
              font-family: 'Space Mono', monospace;
              font-size: 8px;
              text-anchor: middle;
              pointer-events: none;
              opacity: 0.6;
              transition: opacity 0.2s;
            }

            /* Hover highlight states */
            .directory-ring-wrap.has-highlight .ring-node {
              opacity: 0.25;
            }

            .directory-ring-wrap.has-highlight .ring-node.is-highlighted {
              opacity: 1;
            }

            .ring-node.is-highlighted .ring-node-bg {
              transform: scale(1.25);
              opacity: 1;
            }

            .ring-node.is-highlighted .ring-node-label {
              opacity: 1;
            }

            .ring-node.is-highlighted .ring-node-arc {
              opacity: 0.9;
              stroke-width: 3.5;
            }

            /* D3 ring background circle */
            .ring-bg-circle {
              fill: none;
              stroke: var(--border);
              stroke-width: 1;
            }

            /* List row highlight when hovering ring node */
            .directory-row.is-hovered {
              background: color-mix(in srgb, var(--fg) 4%, transparent);
              padding-left: 0.25rem;
            }

            /* Compact stats */
            .directory-stats {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              font-family: 'Space Mono', monospace;
              font-size: 0.7rem;
              letter-spacing: 0.05em;
              color: var(--fg-muted);
              text-transform: uppercase;
            }

            .directory-stat-sep {
              color: var(--fg-faint);
            }

            /* Mobile: directory stacks vertically */
            @media (max-width: 767px) {
              .about-inner {
                padding: 2rem 1.5rem;
              }

              .about-layout {
                grid-template-columns: 1fr;
                gap: 2rem;
                text-align: center;
              }

              .about-svg {
                max-width: 240px;
                margin: 0 auto;
              }

              .directory-inner {
                flex-direction: column;
                padding: 2rem 1.5rem;
                gap: 1.5rem;
              }

              .directory-list-wrap {
                flex: none;
                order: 2;
              }

              .directory-ring-wrap {
                flex: none;
                order: 1;
              }

              .directory-ring-svg {
                max-width: 220px;
              }

              .directory-list {
                max-height: calc(100vh - 360px);
              }

              .directory-row-city {
                display: none;
              }

              .directory-row-type {
                width: auto;
              }
            }

            /* ── Panel 4: Explore (live site preview) ── */
            .preview-inner {
              width: 100%;
              height: 100%;
              position: relative;
              overflow: hidden;
            }

            .preview-iframe-wrap {
              position: absolute;
              inset: 0;
              z-index: 1;
            }

            .preview-iframe-wrap iframe {
              width: 100%;
              height: 100%;
              border: none;
              opacity: 0;
              transition: opacity 0.4s ease;
            }

            .preview-iframe-wrap iframe.is-loaded {
              opacity: 1;
            }

            .preview-skeleton {
              position: absolute;
              inset: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1.5rem;
              z-index: 0;
            }

            .preview-skeleton-label {
              font-family: 'Space Mono', monospace;
              font-size: 0.8rem;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              color: var(--fg-muted);
            }

            .preview-skeleton-shimmer {
              width: 60%;
              max-width: 400px;
              height: 4px;
              border-radius: 2px;
              background: linear-gradient(90deg, var(--border) 25%, var(--fg-faint) 50%, var(--border) 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s ease-in-out infinite;
            }

            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }

            .preview-fallback {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2;
            }

            .preview-fallback-card {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
              padding: 3rem;
              border: 1px solid var(--border);
              border-radius: 12px;
              max-width: 360px;
              text-align: center;
            }

            .preview-fallback-name {
              font-size: 1.5rem;
              font-weight: 700;
              letter-spacing: -0.02em;
              color: var(--fg);
            }

            .preview-fallback-meta {
              font-family: 'Space Mono', monospace;
              font-size: 0.75rem;
              color: var(--fg-muted);
              letter-spacing: 0.05em;
              text-transform: uppercase;
            }

            .preview-fallback-link {
              display: inline-block;
              padding: 0.65rem 1.5rem;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 0.9rem;
              font-weight: 600;
              color: #fff;
              background: var(--accent);
              border-radius: 6px;
              text-decoration: none;
              transition: opacity 0.2s, transform 0.2s;
            }

            .preview-fallback-link:hover {
              opacity: 0.85;
              transform: translateY(-2px);
            }

            .preview-fallback-link:visited { color: #fff; }

            .preview-controls {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              z-index: 10;
              display: flex;
              align-items: center;
              gap: 1rem;
              padding: 0.75rem 1.5rem;
              background: color-mix(in srgb, var(--bg) 80%, transparent);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border-top: 1px solid var(--border);
            }

            .preview-nav {
              background: none;
              border: 1.5px solid var(--border-strong);
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              color: var(--fg);
              font-size: 0.9rem;
              transition: opacity 0.2s;
              flex-shrink: 0;
            }

            .preview-nav:hover { opacity: 0.6; }

            .preview-info {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              flex: 1;
              min-width: 0;
            }

            .preview-member-name {
              font-size: 0.9rem;
              font-weight: 600;
              letter-spacing: -0.01em;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .preview-member-sep { color: var(--fg-faint); }

            .preview-member-city {
              font-size: 0.8rem;
              color: var(--fg-muted);
              white-space: nowrap;
            }

            .preview-open {
              font-size: 1.1rem;
              color: var(--fg);
              text-decoration: none;
              flex-shrink: 0;
              transition: opacity 0.2s;
            }

            .preview-open:hover { opacity: 0.6; }

            @media (max-width: 767px) {
              .preview-inner {
                min-height: 80vh;
              }
              .preview-controls {
                padding: 0.6rem 1rem;
              }
            }

            /* ── Panel 5: Join CTA ── */
            .join-inner {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 3rem;
            }

            .join-content {
              max-width: 480px;
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
              text-align: center;
              align-items: center;
            }

            .join-eyebrow {
              font-family: 'Space Mono', monospace;
              font-size: 0.75rem;
              letter-spacing: 0.15em;
              text-transform: uppercase;
              color: var(--fg-muted);
            }

            .join-headline {
              font-size: 5rem;
              font-weight: 800;
              letter-spacing: -0.04em;
              line-height: 1;
              color: var(--fg);
            }

            .join-body {
              font-size: 1.15rem;
              line-height: 1.6;
              color: var(--fg-muted);
              max-width: 36ch;
            }

            .join-button {
              display: inline-block;
              padding: 0.85rem 2rem;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              font-weight: 600;
              color: #fff;
              background: var(--accent);
              border: none;
              border-radius: 6px;
              text-decoration: none;
              transition: opacity 0.2s, transform 0.2s;
            }

            .join-button:hover {
              opacity: 0.85;
              transform: translateY(-2px);
            }

            .join-button:visited { color: #fff; }

            /* ── Dot indicators ── */
            .ring-dots {
              position: fixed;
              bottom: 2rem;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              gap: 0.75rem;
              z-index: 100;
            }

            .ring-dot {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              border: 1.5px solid var(--fg-muted);
              background: transparent;
              cursor: pointer;
              padding: 0;
              transition: background 0.2s, border-color 0.2s, transform 0.2s;
            }

            .ring-dot:hover {
              border-color: var(--fg);
              transform: scale(1.3);
            }

            .ring-dot.is-active {
              background: var(--fg);
              border-color: var(--fg);
            }

            /* ── Theme toggle ── */
            .theme-toggle {
              position: fixed;
              top: 1.5rem;
              right: 1.5rem;
              z-index: 100;
              background: none;
              border: 1.5px solid var(--border-strong);
              border-radius: 50%;
              width: 36px;
              height: 36px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--fg);
              transition: opacity 0.2s;
            }
            .theme-toggle:hover { opacity: 0.6; }

            .theme-icon-sun, .theme-icon-moon { width: 16px; height: 16px; }
            .theme-icon-sun { display: none; }
            @media (prefers-color-scheme: dark) {
              :root:not([data-theme="light"]) .theme-icon-sun { display: block; }
              :root:not([data-theme="light"]) .theme-icon-moon { display: none; }
            }
            [data-theme="dark"] .theme-icon-sun { display: block !important; }
            [data-theme="dark"] .theme-icon-moon { display: none !important; }
            [data-theme="light"] .theme-icon-sun { display: none !important; }
            [data-theme="light"] .theme-icon-moon { display: block !important; }

            /* ── Scroll hint ── */
            .scroll-hint {
              position: fixed;
              bottom: 4.5rem;
              left: 50%;
              transform: translateX(-50%);
              font-family: 'Space Mono', monospace;
              font-size: 0.7rem;
              color: var(--fg-faint);
              letter-spacing: 0.08em;
              text-transform: uppercase;
              z-index: 100;
              opacity: 1;
              transition: opacity 0.6s;
            }
            .scroll-hint.is-hidden { opacity: 0; pointer-events: none; }

            /* ── Mobile: vertical stack ── */
            @media (max-width: 767px) {
              body { overflow: auto; height: auto; }

              .ring {
                position: static;
                overflow: visible;
                width: 100%;
                height: auto;
              }

              .ring-track { flex-direction: column; }

              .panel {
                flex: 0 0 auto;
                width: 100%;
                height: auto;
                min-height: 100vh;
              }

              .panel--clone { display: none; }
              .ring-dots { display: none; }
              .scroll-hint { display: none; }

              .splash-inner {
                width: calc(100% - 2.5rem);
                height: calc(100% - 2.5rem);
                min-height: calc(100vh - 2.5rem);
              }

              .hero-top { font-size: 16vw; }
              .canada-flag { height: 23.04vw; }
              .ring-widget { width: 46.08vw; }
              .hero-bottom-text { -webkit-text-stroke: 2px var(--accent); }
            }
          `)}</style>
        </head>
        <body>
          <div id="ring" class="ring">
            <div class="ring-track">
              {/* Clone of last panel (Join) for backward cycling */}
              <section class="panel panel--clone" aria-hidden="true">
                <JoinContent memberCount={active.length} />
              </section>

              {/* Panel 1: Splash */}
              <section class="panel" data-index="0" aria-label="Splash section">
                <SplashContent active={active} ringEntrySlug={ringEntrySlug} />
              </section>

              {/* Panel 2: About */}
              <section class="panel panel--alt" data-index="1" aria-label="About section">
                <AboutContent />
              </section>

              {/* Panel 3: Directory */}
              <section class="panel" data-index="2" aria-label="Directory section">
                <DirectoryContent active={active} />
              </section>

              {/* Panel 4: Explore */}
              <section class="panel panel--alt" data-index="3" aria-label="Explore section">
                <SitePreviewContent />
              </section>

              {/* Panel 5: Join CTA */}
              <section class="panel" data-index="4" aria-label="Join section">
                <JoinContent memberCount={active.length} />
              </section>

              {/* Clone of first panel (Splash) for forward cycling */}
              <section class="panel panel--clone" aria-hidden="true">
                <SplashContent active={active} ringEntrySlug={ringEntrySlug} />
              </section>
            </div>
            <nav class="ring-dots" aria-label="Panel navigation">
              {raw(dots)}
            </nav>
          </div>

          <div class="scroll-hint" id="scroll-hint">Scroll to explore</div>

          {raw(`<button class="theme-toggle" onclick="__toggleTheme()" aria-label="Toggle theme"><svg class="theme-icon-moon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><svg class="theme-icon-sun" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></button>`)}

          {raw(`<script>
(function() {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  if (isMobile) return;

  const ring = document.getElementById('ring');
  const dots = document.querySelectorAll('.ring-dot');
  const hint = document.getElementById('scroll-hint');
  const PANEL_COUNT = ${PANEL_NAMES.length};
  const CLONE_BEFORE = 1;
  let panelW = window.innerWidth;

  // Scroll state — target-based smooth scrolling
  let targetPos = CLONE_BEFORE * panelW;
  let currentPos = targetPos;
  let hasScrolled = false;

  // Tuning
  const SCROLL_EASE = 0.12;
  const STEPS_PER_PANEL = 100;
  let scrollAccum = 0;
  let prevActiveIdx = -1;

  ring.scrollLeft = currentPos;

  // ── Wheel handler ──
  ring.addEventListener('wheel', (e) => {
    e.preventDefault();
    scrollAccum += e.deltaY;
    const stepSize = panelW / STEPS_PER_PANEL;
    const steps = Math.trunc(scrollAccum / stepSize);
    if (steps !== 0) {
      targetPos += steps * stepSize;
      scrollAccum -= steps * stepSize;
    }

    if (!hasScrolled) {
      hasScrolled = true;
      hint.classList.add('is-hidden');
    }
  }, { passive: false });

  // ── Dot click handler ──
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-dot'), 10);
      targetPos = (CLONE_BEFORE + idx) * panelW;
    });
  });

  // ── Keyboard navigation ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetPos += panelW;
      if (!hasScrolled) { hasScrolled = true; hint.classList.add('is-hidden'); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetPos -= panelW;
      if (!hasScrolled) { hasScrolled = true; hint.classList.add('is-hidden'); }
    }
  });

  // ── Animation loop ──
  let rafId = 0;

  function tick() {
    // Cycle: wrap target and current together
    const realStart = CLONE_BEFORE * panelW;
    const realEnd = realStart + PANEL_COUNT * panelW;

    if (targetPos >= realEnd) {
      const shift = PANEL_COUNT * panelW;
      targetPos -= shift;
      currentPos -= shift;
    } else if (targetPos < realStart) {
      const shift = PANEL_COUNT * panelW;
      targetPos += shift;
      currentPos += shift;
    }

    // Smooth interpolation — currentPos eases toward targetPos
    const diff = targetPos - currentPos;
    if (Math.abs(diff) > 0.5) {
      currentPos += diff * SCROLL_EASE;
    } else {
      currentPos = targetPos;
    }

    ring.scrollLeft = currentPos;

    // Update dots
    const rawIdx = Math.round((currentPos - realStart) / panelW);
    const activeIdx = ((rawIdx % PANEL_COUNT) + PANEL_COUNT) % PANEL_COUNT;
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeIdx);
    });

    // Notify panel change
    if (activeIdx !== prevActiveIdx) {
      prevActiveIdx = activeIdx;
      ring.dispatchEvent(new CustomEvent('panelchange', { detail: { index: activeIdx } }));
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  // ── Pause when tab hidden ──
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(tick);
    }
  });

  // ── Resize handler ──
  window.addEventListener('resize', () => {
    if (window.matchMedia('(max-width: 767px)').matches) return;

    const idx = Math.round((currentPos - CLONE_BEFORE * panelW) / panelW);
    panelW = window.innerWidth;
    currentPos = (CLONE_BEFORE + idx) * panelW;
    targetPos = currentPos;
    ring.scrollLeft = currentPos;
  });
})();
</script>`)}

          {raw(`<script>
// ── Site preview (Explore panel) ──
(function() {
  var MEMBERS = ${previewMembers};
  var panel = document.getElementById('preview-panel');
  if (!panel || !MEMBERS.length) return;

  var iframeWrap = document.getElementById('preview-iframe-wrap');
  var skeleton = document.getElementById('preview-skeleton');
  var skeletonName = document.getElementById('preview-skeleton-name');
  var fallbackEl = document.getElementById('preview-fallback');
  var fallbackName = document.getElementById('preview-fallback-name');
  var fallbackMeta = document.getElementById('preview-fallback-meta');
  var fallbackLink = document.getElementById('preview-fallback-link');
  var nameEl = document.getElementById('preview-name');
  var cityEl = document.getElementById('preview-city');
  var openEl = document.getElementById('preview-open');
  var prevBtn = document.getElementById('preview-prev');
  var nextBtn = document.getElementById('preview-next');

  var currentIdx = Math.floor(Math.random() * MEMBERS.length);
  var currentIframe = null;
  var loadTimer = null;
  var isActive = false;

  function updateControls(idx) {
    var m = MEMBERS[idx];
    nameEl.textContent = m.name;
    cityEl.textContent = m.city;
    openEl.href = m.url;
  }

  function destroyPreview() {
    if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
    if (currentIframe) { currentIframe.remove(); currentIframe = null; }
    fallbackEl.style.display = 'none';
    skeleton.style.display = 'flex';
  }

  function showFallback(idx) {
    var m = MEMBERS[idx];
    skeleton.style.display = 'none';
    if (currentIframe) { currentIframe.remove(); currentIframe = null; }
    fallbackName.textContent = m.name;
    fallbackMeta.textContent = (m.city ? m.city + ' \u00b7 ' : '') + m.type;
    fallbackLink.href = m.url;
    fallbackEl.style.display = 'flex';
  }

  function loadPreview(idx) {
    destroyPreview();
    var m = MEMBERS[idx];
    updateControls(idx);
    skeletonName.textContent = m.name;

    var iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('title', m.name + ' website');
    currentIframe = iframe;

    loadTimer = setTimeout(function() {
      if (currentIframe === iframe) showFallback(idx);
    }, 5000);

    iframe.addEventListener('load', function() {
      if (currentIframe !== iframe) return;
      clearTimeout(loadTimer);
      loadTimer = null;

      try {
        iframe.contentWindow.location.href;
        showFallback(idx);
      } catch(e) {
        skeleton.style.display = 'none';
        iframe.classList.add('is-loaded');
      }
    });

    iframe.addEventListener('error', function() {
      if (currentIframe === iframe) {
        clearTimeout(loadTimer);
        showFallback(idx);
      }
    });

    iframe.src = m.url;
    iframeWrap.appendChild(iframe);
  }

  prevBtn.addEventListener('click', function() {
    currentIdx = (currentIdx - 1 + MEMBERS.length) % MEMBERS.length;
    if (isActive) loadPreview(currentIdx);
  });

  nextBtn.addEventListener('click', function() {
    currentIdx = (currentIdx + 1) % MEMBERS.length;
    if (isActive) loadPreview(currentIdx);
  });

  // Desktop: listen for panelchange events from scroll handler
  var EXPLORE_INDEX = 3;
  var ringEl = document.getElementById('ring');

  ringEl.addEventListener('panelchange', function(e) {
    var idx = e.detail.index;
    if (idx === EXPLORE_INDEX && !isActive) {
      isActive = true;
      loadPreview(currentIdx);
    } else if (idx !== EXPLORE_INDEX && isActive) {
      isActive = false;
      destroyPreview();
    }
  });

  // Mobile: use IntersectionObserver (scroll handler doesn't run on mobile)
  if (window.matchMedia('(max-width: 767px)').matches) {
    var panelEl = panel.closest('.panel');
    if (panelEl && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting && !isActive) {
            isActive = true;
            loadPreview(currentIdx);
          } else if (!entry.isIntersecting && isActive) {
            isActive = false;
            destroyPreview();
          }
        });
      }, { threshold: 0.5 });
      observer.observe(panelEl);
    }
  }
})();
</script>`)}

          <script src="/d3-ring.js"></script>
        </body>
      </html>
    </>
  )
})

export default app
