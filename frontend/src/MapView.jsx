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
  const [error, setError] = useState(null)

  const timerRef = useRef(null)
  const lastAccelRef = useRef(0)
  const lastStepTimeRef = useRef(0)
  const isMovingRef = useRef(false)

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

  // 🔹 STEP DETECTION (phone sensors)
  useEffect(() => {
    const enableMotion = async () => {
      try {
        if (
          typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function'
        ) {
          await DeviceMotionEvent.requestPermission()
        }
      } catch (e) {
        // ignore
      }
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

      // movement detection
      isMovingRef.current = magnitude > 11

      // step detection
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
  }

  // 🔹 time formatting
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const formattedTime = `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`

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

        {!isRunning ? (
          <button
            onClick={handleStart}
            style={{
              marginTop: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: '#22c55e',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Start Run
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              marginTop: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: '#ef4444',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Stop Run
          </button>
        )}
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