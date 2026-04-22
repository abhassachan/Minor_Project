// territoriesAPI.js — handles all territory sync logic

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Normalize a backend zone into the shape the frontend expects:
 *   ownerId, ownerName, ownerClanId, counts[].userId
 */
function normalizeZone(zone) {
  const owner = zone.owner || {}
  return {
    ...zone,
    ownerId: owner._id || owner || null,
    ownerName: owner.name || null,
    ownerClanId: owner.clanId || null,
    counts: (zone.counts || []).map(c => ({
      userId: c.user?._id || c.user,   // handle both populated & raw ObjectId
      count: c.count,
      lastRunAt: c.lastRunAt,
    })),
  }
}

/**
 * Fetch all territories from backend for map overlay
 * Returns array of zones with owner info
 */
export async function fetchAllTerritories() {
  try {
    const res = await fetch(`${API_BASE}/territories/map`)
    if (!res.ok) return []
    const data = await res.json()
    const zones = Array.isArray(data) ? data : (data.territories || [])
    return zones.map(normalizeZone)
  } catch {
    return []
  }
}

/**
 * Fetch territories for a specific clan (clan compete mode)
 */
export async function fetchClanTerritories(clanId) {
  if (!clanId) return []
  try {
    const res = await fetch(`${API_BASE}/territories/clan/${clanId}`)
    if (!res.ok) return []
    const data = await res.json()
    const zones = Array.isArray(data) ? data : []
    return zones.map(normalizeZone)
  } catch {
    return []
  }
}

/**
 * Sync all pending local territories to backend
 * Called when run stops and user is logged in
 */
export async function syncPendingTerritories(token) {
  if (!token) return { synced: 0, failed: 0, error: 'No token' }

  const stored = JSON.parse(localStorage.getItem('territories') || '[]')
  const pending = stored.filter(t => t.status === 'pending')

  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0
  let lastError = ''

  const updated = [...stored]

  for (const territory of pending) {
    try {
      console.log('[Territory Sync] POSTing to:', `${API_BASE}/territories/record`)
      console.log('[Territory Sync] Payload:', { polygon: territory.points?.length + ' points', area: territory.area })

      const res = await fetch(`${API_BASE}/territories/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          polygon: territory.points,
          area: territory.area,
        })
      })

      if (res.ok) {
        const data = await res.json()
        console.log('[Territory Sync] ✅ Success:', data.message)
        // Mark as synced and store the backend zoneId
        const idx = updated.findIndex(t => t.id === territory.id)
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            status: 'synced',
            zoneId: data.zone?._id || null,
            ownerName: data.zone?.ownerName || null,
            ownerCount: data.zone?.counts?.find(c => c.userId === data.userId)?.count || 1,
          }
        }
        synced++
      } else {
        const errBody = await res.text()
        lastError = `${res.status}: ${errBody}`
        console.error('[Territory Sync] ❌ Failed:', res.status, errBody)
        failed++
      }
    } catch (err) {
      lastError = err.message
      console.error('[Territory Sync] ❌ Network error:', err.message)
      failed++
    }
  }

  localStorage.setItem('territories', JSON.stringify(updated))
  return { synced, failed, lastError }
}
