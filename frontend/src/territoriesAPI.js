// territoriesAPI.js — handles all territory sync logic

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`

/**
 * Fetch all territories from backend for map overlay
 * Returns array of zones with owner info
 */
export async function fetchAllTerritories() {
  try {
    const res = await fetch(`${API_BASE}/territories/map`)
    if (!res.ok) return []
    const data = await res.json()
    return data.territories || []
  } catch {
    return []
  }
}

/**
 * Sync all pending local territories to backend
 * Called when run stops and user is logged in
 */
export async function syncPendingTerritories(token) {
  if (!token) return { synced: 0, failed: 0 }

  const stored = JSON.parse(localStorage.getItem('territories') || '[]')
  const pending = stored.filter(t => t.status === 'pending')

  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  const updated = [...stored]

  for (const territory of pending) {
    try {
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
        failed++
      }
    } catch {
      failed++
    }
  }

  localStorage.setItem('territories', JSON.stringify(updated))
  return { synced, failed }
}
