import { useEffect, useState, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'

// ================= Haversine =================
function calculateDistance(coord1, coord2) {
  const R = 6371000
  const toRad = (v) => (v * Math.PI) / 180

  const dLat = toRad(coord2[0] - coord1[0])
  const dLon = toRad(coord2[1] - coord1[1])

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1[0])) *
      Math.cos(toRad(coord2[0])) *
      Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ================= Map Follow =================
function RecenterMap({ position, isRunning }) {
  const map = useMap()

  useEffect(() => {
    if (position && isRunning) {
      map.setView(position)
    }
  }, [position, isRunning, map])

  return null
}

function MapView() {
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
  const [locationFailed, setLocationFailed] = useState(false)

  // ⭐ PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  // ⭐ splits
  const [splits, setSplits] = useState([])
  const nextSplitKmRef = useRef(1)
  const lastSplitTimeRef = useRef(0)

  const timerRef = useRef(null)
  const lastAccelRef = useRef(0)
  const lastStepTimeRef = useRef(0)
  const lastMovementTimeRef = useRef(Date.now())
  const locationTimeoutRef = useRef(null)

  // ================= PWA listener =================
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () =>
      window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  // ================= Load runs =================
  useEffect(() => {
    const savedRuns = localStorage.getItem('runs')
    if (savedRuns) setRuns(JSON.parse(savedRuns))
  }, [])

  // ================= GPS =================
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    locationTimeoutRef.current = setTimeout(() => {
      setLocationFailed(true)
    }, 20000)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        clearTimeout(locationTimeoutRef.current)
        setLocationFailed(false)

        const { latitude, longitude } = pos.coords
        const newPos = [latitude, longitude]
        setPosition(newPos)

        if (isRunning && !isAutoPaused) {
          setPath((prev) => {
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1]
              const segment = calculateDistance(lastPoint, newPos)

              if (segment >= 2) {
                setDistance((d) => {
                  const updated = d + segment

                  // ⭐ split detection
                  const km = updated / 1000
                  if (km >= nextSplitKmRef.current) {
                    const splitDuration =
                      duration - lastSplitTimeRef.current

                    const paceMin = Math.floor(splitDuration / 60)
                    const paceRem = Math.floor(splitDuration % 60)

                    const newSplit = {
                      km: nextSplitKmRef.current,
                      pace: `${paceMin}:${paceRem
                        .toString()
                        .padStart(2, '0')}`,
                    }

                    setSplits((s) => [...s, newSplit])
                    lastSplitTimeRef.current = duration
                    nextSplitKmRef.current += 1
                  }

                  return updated
                })
              }
            }
            return [...prev, newPos]
          })
        }
      },
      (err) => {
        clearTimeout(locationTimeoutRef.current)
        setError(err.message)
      },
      {
        enableHighAccuracy: false,
        maximumAge: 15000,
        timeout: 30000,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      clearTimeout(locationTimeoutRef.current)
    }
  }, [isRunning, isAutoPaused, duration])

  // ================= Timer =================
  useEffect(() => {
    if (isRunning && !isAutoPaused) {
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }

    return () => clearInterval(timerRef.current)
  }, [isRunning, isAutoPaused])

  // ================= Motion =================
  useEffect(() => {
    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity
      if (!acc) return

      const magnitude = Math.sqrt(
        acc.x * acc.x + acc.y * acc.y + acc.z * acc.z
      )

      const diff = Math.abs(magnitude - lastAccelRef.current)
      lastAccelRef.current = magnitude

      const now = Date.now()

      if (magnitude > 11) {
        lastMovementTimeRef.current = now
        if (isAutoPaused) setIsAutoPaused(false)
      }

      if (isRunning && now - lastMovementTimeRef.current > 3000) {
        setIsAutoPaused(true)
      }

      if (diff > 0.9 && now - lastStepTimeRef.current > 300) {
        if (isRunning && !isAutoPaused) setSteps((s) => s + 1)
        lastStepTimeRef.current = now
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [isRunning, isAutoPaused])

  // ================= Controls =================
  const handleStart = () => {
    setSelectedRun(null)
    setPath([])
    setDistance(0)
    setDuration(0)
    setSteps(0)
    setSplits([])

    nextSplitKmRef.current = 1
    lastSplitTimeRef.current = 0
    lastMovementTimeRef.current = Date.now()

    setIsAutoPaused(false)
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
    setIsAutoPaused(false)

    if (distance < 5) return

    const newRun = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      distance: distance / 1000,
      duration,
      steps,
      calories: Number((steps * 0.04).toFixed(1)),
      path,
      splits,
    }

    const updatedRuns = [newRun, ...runs]
    setRuns(updatedRuns)
    localStorage.setItem('runs', JSON.stringify(updatedRuns))
  }

  // ================= Metrics =================
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const formattedTime = `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`

  const calories = (steps * 0.04).toFixed(1)
  const distanceKm = distance / 1000

  let avgPace = '--:--'
  if (distanceKm > 0) {
    const paceSec = duration / distanceKm
    const paceMin = Math.floor(paceSec / 60)
    const paceRem = Math.floor(paceSec % 60)
    avgPace = `${paceMin}:${paceRem.toString().padStart(2, '0')}`
  }

  let avgSpeed = 0
  if (duration > 0) {
    avgSpeed = distanceKm / (duration / 3600)
  }

  let livePace = '--:--'
  if (isRunning && distanceKm > 0) {
    const liveSec = duration / distanceKm
    const liveMin = Math.floor(liveSec / 60)
    const liveRem = Math.floor(liveSec % 60)
    livePace = `${liveMin}:${liveRem.toString().padStart(2, '0')}`
  }

  const displayPath = selectedRun ? selectedRun.path : path

  if (error) return <p>{error}</p>
  if (!position) return <p>Getting your location...</p>

  return (
    <>
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        zIndex: 1000,
        top: 12,
        left: 12,
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        padding: '12px 14px',
        borderRadius: '12px',
        fontWeight: '600',
        maxWidth: 260
      }}>
        <div>Distance: {(distance / 1000).toFixed(2)} km</div>
        <div style={{ fontFamily: 'monospace' }}>
          Duration: {formattedTime}
        </div>
        <div>Steps: {steps}</div>
        <div>Calories: {calories} kcal</div>
        <div>Avg Pace: {avgPace} min/km</div>
        <div>Avg Speed: {avgSpeed.toFixed(2)} km/h</div>

        {isRunning && (
          <div style={{ color: isAutoPaused ? '#facc15' : '#4ade80' }}>
            {isAutoPaused
              ? 'Auto Paused'
              : `Live Pace: ${livePace} min/km`}
          </div>
        )}

        {!isRunning ? (
          <button onClick={handleStart}>Start Run</button>
        ) : (
          <button onClick={handleStop}>Stop Run</button>
        )}

        {isInstallable && (
          <button onClick={handleInstall}>
            Install App
          </button>
        )}

        {splits.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>Splits</div>
            {splits.map((s) => (
              <div key={s.km}>
                Km {s.km}: {s.pace}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run History */}
      <div style={{
        position: 'absolute',
        zIndex: 1000,
        bottom: 12,
        left: 12,
        width: '260px',
        maxHeight: '220px',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        padding: '12px',
        borderRadius: '12px',
        fontSize: '14px',
      }}>
        <div style={{ fontWeight: '700', marginBottom: '6px' }}>
          Run History
        </div>

        {runs.length === 0 && (
          <div style={{ opacity: 0.7 }}>No runs yet</div>
        )}

        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => setSelectedRun(run)}
            style={{
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {run.date}
            </div>
            <div>
              {run.distance.toFixed(2)} km •{' '}
              {Math.floor(run.duration / 60)}:
              {(run.duration % 60).toString().padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>

      <MapContainer
        center={position}
        zoom={16}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap position={position} isRunning={isRunning} />

        <Marker position={position}>
          <Popup>You are here</Popup>
        </Marker>

        {displayPath.length > 1 && (
          <Polyline positions={displayPath} color="red" />
        )}
      </MapContainer>
    </>
  )
}

export default MapView