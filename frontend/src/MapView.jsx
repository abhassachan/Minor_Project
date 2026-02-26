import { useEffect, useState, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'

// Haversine distance in meters
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

function RecenterMap({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position)
    }
  }, [position, map])

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
  const [error, setError] = useState(null)

  const timerRef = useRef(null)
  const lastAccelRef = useRef(0)
  const lastStepTimeRef = useRef(0)
  const isMovingRef = useRef(false)

  // 🔹 LOAD SAVED RUNS
  useEffect(() => {
    const savedRuns = localStorage.getItem('runs')
    if (savedRuns) {
      setRuns(JSON.parse(savedRuns))
    }
  }, [])

  // 🔹 GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const newPos = [latitude, longitude]

        setPosition(newPos)

        if (isRunning) {
          setPath((prev) => {
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1]
              const segment = calculateDistance(lastPoint, newPos)
              setDistance((d) => d + segment)
            }
            return [...prev, newPos]
          })
        }
      },
      (err) => setError(err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isRunning])

  // 🔹 TIMER
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }

    return () => clearInterval(timerRef.current)
  }, [isRunning])

  // 🔹 STEP DETECTION
  useEffect(() => {
    const enableMotion = async () => {
      try {
        if (
          typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function'
        ) {
          await DeviceMotionEvent.requestPermission()
        }
      } catch (e) {}
    }

    enableMotion()

    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity
      if (!acc) return

      const magnitude = Math.sqrt(
        acc.x * acc.x +
          acc.y * acc.y +
          acc.z * acc.z
      )

      const diff = Math.abs(magnitude - lastAccelRef.current)
      lastAccelRef.current = magnitude

      const now = Date.now()
      isMovingRef.current = magnitude > 11

      if (diff > 0.9 && now - lastStepTimeRef.current > 300) {
        if (isRunning) {
          setSteps((s) => s + 1)
        }
        lastStepTimeRef.current = now
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [isRunning])

  const handleStart = () => {
    setPath([])
    setDistance(0)
    setDuration(0)
    setSteps(0)
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)

    // don't save very tiny runs
    if (distance < 5) return

    const newRun = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      distance: distance / 1000,
      duration,
      steps,
      calories: Number((steps * 0.04).toFixed(1)),
      path,
    }

    const updatedRuns = [newRun, ...runs]
    setRuns(updatedRuns)
    localStorage.setItem('runs', JSON.stringify(updatedRuns))
  }

  // 🔹 time formatting
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const formattedTime = `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`

  const calories = (steps * 0.04).toFixed(1)

  if (error) return <p>{error}</p>
  if (!position) return <p>Getting your location...</p>

  return (
    <>
      {/* Control Panel */}
      <div
        style={{
          position: 'absolute',
          zIndex: 1000,
          top: 12,
          left: 12,
          background: 'rgba(0, 0, 0, 0.75)',
          color: '#ffffff',
          padding: '12px 14px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ marginBottom: '6px' }}>
          Distance: {(distance / 1000).toFixed(2)} km
        </div>

        <div style={{ fontFamily: 'monospace', marginBottom: '6px' }}>
          Duration: {formattedTime}
        </div>

        <div style={{ marginBottom: '6px' }}>
          Steps: {steps}
        </div>

        <div style={{ marginBottom: '6px' }}>
          Calories: {calories} kcal
        </div>

        {!isRunning ? (
          <button onClick={handleStart}>Start Run</button>
        ) : (
          <button onClick={handleStop}>Stop Run</button>
        )}
      </div>

      {/* 🔹 RUN HISTORY PANEL */}
      <div
        style={{
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
        }}
      >
        <div style={{ fontWeight: '700', marginBottom: '6px' }}>
          Run History
        </div>

        {runs.length === 0 && (
          <div style={{ opacity: 0.7 }}>No runs yet</div>
        )}

        {runs.map((run) => (
          <div
            key={run.id}
            style={{
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
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
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {run.steps} steps • {run.calories} kcal
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

        <RecenterMap position={position} />

        <Marker position={position}>
          <Popup>You are here</Popup>
        </Marker>

        {path.length > 1 && <Polyline positions={path} color="red" />}
      </MapContainer>
    </>
  )
}

export default MapView