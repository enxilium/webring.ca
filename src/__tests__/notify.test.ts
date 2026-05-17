import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notifyDiscord, type HealthEvent } from '../cron/notify'
import type { Member } from '../types'

const alice: Member = { slug: 'alice', name: 'Alice', url: 'https://alice.example.com', active: true }

let originalFetch: typeof globalThis.fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('notifyDiscord', () => {
  it('does not call fetch when no webhook URL', async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await notifyDiscord(undefined, [{ member: alice, event: 'deactivated' }])

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not call fetch when events array is empty', async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await notifyDiscord('https://discord.com/api/webhooks/test', [])

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends deactivation embed with red color', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await notifyDiscord('https://discord.com/api/webhooks/test', [
      { member: alice, event: 'deactivated', reason: 'unreachable' },
    ])

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://discord.com/api/webhooks/test')
    const body = JSON.parse(options.body)
    expect(body.embeds).toHaveLength(1)
    expect(body.embeds[0].title).toBe('Alice deactivated')
    expect(body.embeds[0].description).toContain('unreachable')
    expect(body.embeds[0].color).toBe(0xd32f2f)
  })

  it('sends reactivation embed with green color', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await notifyDiscord('https://discord.com/api/webhooks/test', [
      { member: alice, event: 'reactivated' },
    ])

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.embeds[0].title).toBe('Alice reactivated')
    expect(body.embeds[0].color).toBe(0x4caf50)
  })

  it('does not throw when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch

    await expect(
      notifyDiscord('https://discord.com/api/webhooks/test', [
        { member: alice, event: 'deactivated' },
      ])
    ).resolves.toBeUndefined()
  })

  it('uses unknown as reason when none provided', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await notifyDiscord('https://discord.com/api/webhooks/test', [
      { member: alice, event: 'deactivated' },
    ])

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.embeds[0].description).toContain('unknown')
  })
})
