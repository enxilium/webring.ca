import type { Member } from '../types'

export interface HealthEvent {
  member: Member
  event: 'deactivated' | 'reactivated'
  reason?: string
}

export async function notifyDiscord(webhookUrl: string | undefined, events: HealthEvent[]): Promise<void> {
  if (!webhookUrl || events.length === 0) return

  const embeds = events.map((e) => ({
    title: e.event === 'deactivated'
      ? `${e.member.name} deactivated`
      : `${e.member.name} reactivated`,
    description: e.event === 'deactivated'
      ? `${e.member.url} failed 7 consecutive health checks (${e.reason ?? 'unknown'}). Removed from ring.`
      : `${e.member.url} is healthy again. Re-added to ring.`,
    color: e.event === 'deactivated' ? 0xd32f2f : 0x4caf50,
  }))

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds }),
    })
  } catch {
    // Notification failure must never break the health check
  }
}
