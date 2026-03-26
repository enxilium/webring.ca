import type { HealthStatus } from '../types'
import { getMembers, setMembers, getHealthStatus, setHealthStatus } from '../data'

export async function runHealthCheck(kv: KVNamespace): Promise<void> {
  const members = await getMembers(kv)

  const prevStatuses = await Promise.all(
    members.map((m) => getHealthStatus(kv, m.slug))
  )

  const checkResults = await Promise.allSettled(
    members.map(async (member, i) => {
      const prev = prevStatuses[i]
      try {
        const res = await fetch(member.url, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'webring.ca health check' },
        })
        const body = await res.text()
        const hasWidget = body.toLowerCase().includes('webring.ca')

        if (res.ok && hasWidget) {
          return {
            status: 'ok' as const,
            httpStatus: res.status,
            lastChecked: new Date().toISOString(),
            consecutiveFails: 0,
          }
        }
        return {
          status: 'widget_missing' as const,
          httpStatus: res.status,
          lastChecked: new Date().toISOString(),
          consecutiveFails: (prev?.consecutiveFails ?? 0) + 1,
        }
      } catch {
        return {
          status: 'unreachable' as const,
          lastChecked: new Date().toISOString(),
          consecutiveFails: (prev?.consecutiveFails ?? 0) + 1,
        }
      }
    })
  )

  const statusMap = new Map<string, HealthStatus>()
  for (let i = 0; i < members.length; i++) {
    const result = checkResults[i]
    if (result.status === 'fulfilled') {
      statusMap.set(members[i].slug, result.value)
    }
  }

  await Promise.all(
    Array.from(statusMap.entries()).map(([slug, status]) =>
      setHealthStatus(kv, slug, status)
    )
  )

  const updatedMembers = members.map((member) => {
    const status = statusMap.get(member.slug)
    if (!status) return member
    if (member.active && status.consecutiveFails >= 7) {
      return { ...member, active: false }
    }
    if (!member.active && status.status === 'ok') {
      return { ...member, active: true }
    }
    return member
  })

  const membersChanged = updatedMembers.some(
    (m, i) => m.active !== members[i].active
  )

  if (membersChanged) {
    await setMembers(kv, updatedMembers)
  }
}
