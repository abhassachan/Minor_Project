import { useEffect, useState, useRef, useMemo } from 'react'
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, Polygon, useMap,
} from 'react-leaflet'

const METERS_PER_DEG_LAT = 111320
const MIN_DISTANCE_FOR_METRICS = 0.01
const LOOP_CLOSE_THRESHOLD = 35
const LOOP_MIN_POINTS = 20
const LOOP_MIN_DISTANCE = 100

const TILES = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
}

function calculateDistance(coord1, coord2) {
  const R = 6371000
  const toRad = (v) => (v * Math.PI) / 180
  const dLat = toRad(coord2[0] - coord1[0])
  const dLon = toRad(coord2[1] - coord1[1])
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(coord1[0])) * Math.cos(toRad(coord2[0])) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function polygonArea(points) {
  if (points.length < 3) return 0
  const refLat = points[0][0], refLng = points[0][1]
  const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((refLat * Math.PI) / 180)
  const pts = points.map(([lat, lng]) => [(lat - refLat) * METERS_PER_DEG_LAT, (lng - refLng) * mPerDegLng])
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
  }
  return Math.abs(area) / 2
}

function RecenterMap({ position, isRunning }) {
  const map = useMap()
  useEffect(() => { if (position && isRunning) map.setView(position) }, [position, isRunning, map])
  return null
}

function formatPace(s) {
  if (!s || !isFinite(s) || s <= 0) return '--:--'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}
function formatDuration(s) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` }
function formatArea(m) {
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(2)} km²`
  if (m >= 10_000) return `${(m / 10_000).toFixed(1)} ha`
  return `${Math.round(m)} m²`
}

export default function MapView() {
  const [position, setPosition] = useState(null)
  const [path, setPath] = useState([])
  const [distance, setDistance] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [duration, setDuration] = useState(0)
  const [steps, setSteps] = useState(0)
  const [runs, setRuns] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [error, setError] = useState(null)
  const [isAutoPaused, setIsAutoPaused] = useState(false)
  const [liveSpeed, setLiveSpeed] = useState(0)
  const [splits, setSplits] = useState([])
  const [territories, setTerritories] = useState([])
  const [loopFlash, setLoopFlash] = useState(false)
  const [currentLoopStart, setCurrentLoopStart] = useState(null)
  const [loopSegmentLen, setLoopSegmentLen] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [showIOSBanner, setShowIOSBanner] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false)
  const [isDarkMap, setIsDarkMap] = useState(true)   // ← theme state

  const timerRef = useRef(null)
  const lastAccelRef = useRef(0)
  const lastStepTimeRef = useRef(0)
  const lastMovementTimeRef = useRef(Date.now())
  const lastGpsTimeRef = useRef(null)
  const lastGpsPosRef = useRef(null)
  const isRunningRef = useRef(false)
  const isAutoPausedRef = useRef(false)
  const currentSegmentRef = useRef([])
  const segmentDistRef = useRef(0)
  const nextSplitKmRef = useRef(1)
  const lastSplitTimeRef = useRef(0)
  const durationRef = useRef(0)

  useEffect(() => { isRunningRef.current = isRunning }, [isRunning])
  useEffect(() => { isAutoPausedRef.current = isAutoPaused }, [isAutoPaused])
  useEffect(() => { durationRef.current = duration }, [duration])

  // PWA
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setIsInstallable(true) }
    window.addEventListener('beforeinstallprompt', handler)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (isIOS && !isStandalone) setShowIOSBanner(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt(); await deferredPrompt.userChoice
    setDeferredPrompt(null); setIsInstallable(false)
  }

  // Load storage
  useEffect(() => {
    const r = localStorage.getItem('runs'); if (r) setRuns(JSON.parse(r))
    const t = localStorage.getItem('territories'); if (t) setTerritories(JSON.parse(t))
    const theme = localStorage.getItem('darkMap')
    if (theme !== null) setIsDarkMap(theme === 'true')
  }, [])

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem('darkMap', isDarkMap)
  }, [isDarkMap])

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }

    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      const newPos = [lat, lng]
      const now = Date.now()
      setPosition(newPos)

      if (isRunningRef.current && !isAutoPausedRef.current) {
        currentSegmentRef.current.push(newPos)

        const seg = currentSegmentRef.current
        if (seg.length >= LOOP_MIN_POINTS && segmentDistRef.current >= LOOP_MIN_DISTANCE) {
          const distToStart = calculateDistance(newPos, seg[0])
          if (distToStart <= LOOP_CLOSE_THRESHOLD) {
            const polygon = [...seg, newPos]
            const area = polygonArea(polygon)
            if (area > 100) {
              const newT = { id: Date.now(), points: polygon, area }
              setTerritories((prev) => {
                const updated = [...prev, newT]
                localStorage.setItem('territories', JSON.stringify(updated))
                return updated
              })
              setLoopFlash(true)
              setTimeout(() => setLoopFlash(false), 800)
            }
            currentSegmentRef.current = [newPos]
            segmentDistRef.current = 0
            setCurrentLoopStart(newPos)
            setLoopSegmentLen(0)
          }
        }

        if (lastGpsPosRef.current !== null) {
          const segment = calculateDistance(lastGpsPosRef.current, newPos)
          const dt = (now - lastGpsTimeRef.current) / 1000
          if (dt > 0 && segment > 0.8) {
            const spd = (segment / dt) * 3.6
            if (spd <= 30) setLiveSpeed(spd)
          } else if (dt > 3) setLiveSpeed(0)

          if (segment >= 0.5 && segment <= 50) {
            segmentDistRef.current += segment
            setLoopSegmentLen((v) => v + segment)
            setDistance((d) => {
              const nd = d + segment
              const ndk = nd / 1000
              if (ndk >= nextSplitKmRef.current) {
                const sk = nextSplitKmRef.current
                const dur = durationRef.current
                const sd = dur - lastSplitTimeRef.current
                setSplits((p) => [...p, { km: sk, pace: formatPace(sd) }])
                lastSplitTimeRef.current = dur
                nextSplitKmRef.current = sk + 1
              }
              return nd
            })
          }
        }

        lastGpsTimeRef.current = now
        lastGpsPosRef.current = newPos
        setPath((prev) => [...prev, newPos])

      } else if (!isRunningRef.current) {
        lastGpsPosRef.current = newPos
        lastGpsTimeRef.current = now
      }
    },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 })

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Timer
  useEffect(() => {
    if (isRunning && !isAutoPaused) timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [isRunning, isAutoPaused])

  // Motion
  useEffect(() => {
    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity; if (!acc) return
      const mag = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2)
      const diff = Math.abs(mag - lastAccelRef.current)
      lastAccelRef.current = mag
      const now = Date.now()
      if (mag > 12) { lastMovementTimeRef.current = now; if (isAutoPausedRef.current) setIsAutoPaused(false) }
      if (isRunningRef.current && now - lastMovementTimeRef.current > 3000 && !isAutoPausedRef.current) setIsAutoPaused(true)
      if (diff > 2.5 && now - lastStepTimeRef.current > 450) {
        if (isRunningRef.current && !isAutoPausedRef.current) setSteps((s) => s + 1)
        lastStepTimeRef.current = now
      }
    }
    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [])

  const handleStart = () => {
    setSelectedRun(null); setPath([]); setDistance(0); setDuration(0)
    setSteps(0); setLiveSpeed(0); setSplits([]); setSaveMessage('')
    currentSegmentRef.current = []; segmentDistRef.current = 0
    lastGpsTimeRef.current = null; lastGpsPosRef.current = null
    lastMovementTimeRef.current = Date.now()
    nextSplitKmRef.current = 1; lastSplitTimeRef.current = 0; durationRef.current = 0
    setCurrentLoopStart(null); setLoopSegmentLen(0)
    setIsAutoPaused(false); setIsRunning(true)
  }

  const handleStop = async () => {
    setIsRunning(false); setIsAutoPaused(false); setLiveSpeed(0)
    setCurrentLoopStart(null); currentSegmentRef.current = []; segmentDistRef.current = 0
    if (distance < 5) { setSaveMessage('Run too short to save (< 5m)'); return }
    const distKm = distance / 1000
    const cal = Number((steps * 0.04).toFixed(1))
    const pace = distKm > 0 && duration > 0 ? duration / distKm : 0
    const newRun = { id: Date.now(), date: new Date().toLocaleString(), distance: distKm, duration, steps, calories: cal, path, splits }

    // Save to localStorage (offline-first)
    const updated = [newRun, ...runs]
    setRuns(updated); localStorage.setItem('runs', JSON.stringify(updated))

    // Save to backend API
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const res = await fetch(`http://${window.location.hostname}:5000/api/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            distance: distKm,
            duration,
            steps,
            calories: cal,
            pace,
            route: path,
            territoriesCaptured: territories.length,
          }),
        })
        if (res.ok) {
          setSaveMessage('Run saved to cloud ✓')
        } else {
          setSaveMessage('Run saved locally (cloud sync failed)')
        }
      } catch (err) {
        setSaveMessage('Run saved locally (offline)')
      }
    } else {
      setSaveMessage('Run saved ✓ (log in to sync)')
    }
  }

  const distanceKm = distance / 1000
  const calories = (steps * 0.04).toFixed(1)
  const avgSpeed = distanceKm >= MIN_DISTANCE_FOR_METRICS && duration > 0 ? distanceKm / (duration / 3600) : 0
  const avgPace = distanceKm >= MIN_DISTANCE_FOR_METRICS && duration > 0 ? formatPace(duration / distanceKm) : '--:--'
  const livePace = liveSpeed > 0.5 ? formatPace(3600 / liveSpeed) : '--:--'
  const totalArea = useMemo(() => territories.reduce((s, t) => s + (t.area || 0), 0), [territories])
  const displayPath = selectedRun ? selectedRun.path : path
  const displaySplits = selectedRun ? (selectedRun.splits || []) : splits
  const canClose = loopSegmentLen >= LOOP_MIN_DISTANCE
  const needsMore = LOOP_MIN_DISTANCE - loopSegmentLen
  const tile = isDarkMap ? TILES.dark : TILES.light

  if (error) return <p style={{ color: 'red', padding: 16 }}>{error}</p>
  if (!position) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8', fontFamily: 'monospace', fontSize: 16 }}>
      📡 Acquiring GPS signal…
    </div>
  )

  const panelStyle = {
    position: 'absolute', zIndex: 1000,
    background: 'rgba(10,15,28,0.88)', backdropFilter: 'blur(12px)',
    color: '#f1f5f9', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
    fontFamily: '"JetBrains Mono","Fira Code",monospace', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  }

  const row = (label, value, accent) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
      <span style={{ fontSize: 11, opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: accent || '#f1f5f9' }}>{value}</span>
    </div>
  )

  return (
    <>
      {loopFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(34,197,94,0.2)', pointerEvents: 'none', animation: 'fadeOut 0.8s ease forwards' }} />
      )}
      <style>{`@keyframes fadeOut { from{opacity:1} to{opacity:0} }`}</style>

      {/* ── CONTROL PANEL ── */}
      <div style={{ ...panelStyle, top: 12, left: 12, width: isPanelCollapsed ? 'auto' : 240 }}>
        <div onClick={() => setIsPanelCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isPanelCollapsed ? '10px 14px' : '12px 16px 0', cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isAutoPaused ? '#f59e0b' : isRunning ? '#22c55e' : '#475569', boxShadow: isRunning && !isAutoPaused ? '0 0 8px #22c55e' : 'none', transition: 'all 0.3s' }} />
          <span style={{ fontSize: isPanelCollapsed ? 22 : 14, fontWeight: 800, color: isRunning && !isAutoPaused ? '#22c55e' : '#94a3b8', letterSpacing: '0.05em', transition: 'all 0.2s' }}>{formatDuration(duration)}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.45, transform: isPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.25s' }}>▲</span>
        </div>

        {!isPanelCollapsed && (
          <div style={{ padding: '10px 16px 14px' }}>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.05em', color: isRunning && !isAutoPaused ? '#22c55e' : '#94a3b8', textAlign: 'center', marginBottom: 12, transition: 'color 0.3s' }}>{formatDuration(duration)}</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, marginBottom: 10 }}>
              {row('Distance', `${distanceKm.toFixed(2)} km`)}
              {row('Steps', steps.toLocaleString())}
              {row('Calories', `${calories} kcal`)}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, marginBottom: 12 }}>
              {row('Avg Pace', avgPace)}
              {row('Avg Speed', `${avgSpeed.toFixed(2)} km/h`)}
              {row('Live Pace', livePace, '#4ade80')}
              {row('Live Speed', `${liveSpeed.toFixed(2)} km/h`, '#4ade80')}
            </div>
            {row('Territory', formatArea(totalArea), '#60a5fa')}
            {row('Loops', `${territories.length}`, '#a78bfa')}
            {isRunning && (
              <div style={{ marginTop: 8, padding: '6px 8px', background: canClose ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)', border: `1px solid ${canClose ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 7, fontSize: 11, color: canClose ? '#86efac' : '#fca5a5', textAlign: 'center' }}>
                {canClose ? '🟢 Run back to orange dot to capture!' : `🔴 ${Math.round(needsMore)}m more to enable capture`}
              </div>
            )}
            {saveMessage && <div style={{ marginTop: 6, fontSize: 11, textAlign: 'center', color: saveMessage.includes('✓') ? '#4ade80' : '#f87171' }}>{saveMessage}</div>}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!isRunning
                ? <button onClick={handleStart} style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '0.04em' }}>▶ START RUN</button>
                : <button onClick={handleStop} style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '0.04em' }}>■ STOP RUN</button>
              }
              {isInstallable && <button onClick={handleInstall} style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>⬇ Install App</button>}
              {showIOSBanner && !isInstallable && (
                <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 8, padding: '8px 10px', fontSize: 11, lineHeight: 1.6, color: '#93c5fd' }}>
                  <div style={{ fontWeight: 700, marginBottom: 2, color: '#fff' }}>📲 Install on iOS</div>
                  <div>Tap <strong style={{ color: '#fff' }}>Share ↑</strong> then <strong style={{ color: '#fff' }}>"Add to Home Screen"</strong></div>
                  <div onClick={() => setShowIOSBanner(false)} style={{ marginTop: 5, opacity: 0.45, cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}>Dismiss</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── TOP RIGHT: SPLITS + THEME TOGGLE stacked ── */}
      <div style={{ position: 'absolute', zIndex: 1000, top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>

        {/* Theme toggle button */}
        <button
          onClick={() => setIsDarkMap(v => !v)}
          style={{
            background: 'rgba(10,15,28,0.88)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            padding: '8px 14px', cursor: 'pointer',
            fontFamily: '"JetBrains Mono","Fira Code",monospace',
            fontSize: 13, color: '#f1f5f9',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'background 0.2s',
            userSelect: 'none',
          }}
        >
          {isDarkMap ? '☀️' : '🌙'}
          <span style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.05em' }}>
            {isDarkMap ? 'LIGHT' : 'DARK'}
          </span>
        </button>

        {/* Splits panel — appears below toggle when there are splits */}
        {displaySplits.length > 0 && (
          <div style={{ background: 'rgba(10,15,28,0.88)', backdropFilter: 'blur(12px)', color: '#f1f5f9', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: '"JetBrains Mono","Fira Code",monospace', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '12px 14px', width: 160 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>KM Splits</div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {displaySplits.map(s => (
                <div key={s.km} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ opacity: 0.6 }}>KM {s.km}</span>
                  <span style={{ fontWeight: 700, color: '#facc15' }}>{s.pace}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RUN HISTORY ── */}
      <div style={{ ...panelStyle, bottom: 12, left: 12, width: 240, fontSize: 13 }}>
        <div onClick={() => setIsHistoryCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.6 }}>Run History {runs.length > 0 && `(${runs.length})`}</span>
          <span style={{ fontSize: 12, opacity: 0.4, transform: isHistoryCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}>▲</span>
        </div>
        {!isHistoryCollapsed && (
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '0 14px 12px' }}>
            {runs.length === 0 && <div style={{ opacity: 0.4, fontSize: 12 }}>No runs yet</div>}
            {runs.map(run => (
              <div key={run.id} onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
                style={{ marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', background: selectedRun?.id === run.id ? 'rgba(34,197,94,0.08)' : 'transparent', borderRadius: 6, padding: '4px 6px', transition: 'background 0.2s' }}>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>{run.date}</div>
                <div style={{ fontWeight: 600 }}>{run.distance.toFixed(2)} km · {formatDuration(run.duration)}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{run.steps} steps · {run.calories} kcal</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MAP ── */}
      <MapContainer center={position} zoom={16} style={{ height: '100vh', width: '100%' }}>
        <TileLayer key={isDarkMap ? 'dark' : 'light'} url={tile.url} attribution={tile.attribution} />
        <RecenterMap position={position} isRunning={isRunning} />
        <Marker position={position}><Popup>You are here</Popup></Marker>

        {territories.map(t => (
          <Polygon key={t.id} positions={t.points}
            pathOptions={{ color: '#22c55e', weight: 2, fillColor: '#22c55e', fillOpacity: 0.3 }} />
        ))}

        {displayPath.length > 1 && <Polyline positions={displayPath} color="#ef4444" weight={3} />}

        {isRunning && currentSegmentRef.current.length > 1 && (
          <Polyline positions={currentSegmentRef.current}
            pathOptions={{ color: '#f97316', weight: 2, dashArray: '6 4', opacity: 0.8 }} />
        )}

        {isRunning && currentLoopStart && (
          <Marker position={currentLoopStart}>
            <Popup>Loop start — run back here to capture territory!</Popup>
          </Marker>
        )}
      </MapContainer>
    </>
  )
}