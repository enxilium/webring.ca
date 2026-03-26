import { getActiveMembers, setRingOrder } from '../data'
import { fisherYatesShuffle } from '../utils/shuffle'

export async function runShuffle(kv: KVNamespace): Promise<void> {
  const members = await getActiveMembers(kv)
  const slugs = fisherYatesShuffle(members.map((m) => m.slug))
  await setRingOrder(kv, slugs)
}
