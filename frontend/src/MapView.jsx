import { useEffect, useState, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'

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
    if (position) map.setView(position)
  }, [position, map])
  return null
}

function MapView() {
  const [position, setPosition] = useState(null)
  const [path, setPath] = useState([])
  const [distance, setDistance] = useState(0)
  const [steps, setSteps] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [duration, setDuration] = useState(0)

  const timerRef = useRef(null)
  const isMovingRef = useRef(false)
  const lastAccelRef = useRef(0)
  const lastStepTimeRef = useRef(0)
  const prevSmoothedRef = useRef(null)

  // 🔹 MOTION + STEP DETECTION
  useEffect(() => {
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

      // Movement detection
      if (magnitude > 11) {
        isMovingRef.current = true
      } else {
        isMovingRef.current = false
      }

      // Step detection
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

  // 🔹 GPS + SMOOTHING
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords

// Ignore bad GPS accuracy (>20 meters)
if (accuracy > 20) return
        const newRaw = [latitude, longitude]

        setPosition(newRaw)

        if (!isRunning || !isMovingRef.current) return

        const alpha = 0.3

        let smoothed = newRaw

        if (prevSmoothedRef.current) {
          const prev = prevSmoothedRef.current
          smoothed = [
            prev[0] + alpha * (newRaw[0] - prev[0]),
            prev[1] + alpha * (newRaw[1] - prev[1]),
          ]
        }

        prevSmoothedRef.current = smoothed

        setPath((prev) => {
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1]
            const segment = calculateDistance(lastPoint, smoothed)

            if (segment > 2) {
              setDistance((d) => d + segment)
              return [...prev, smoothed]
            }

            return prev
          }

          return [...prev, smoothed]
        })
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isRunning])

  // Timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning])

  const handleStart = () => {
    setPath([])
    setDistance(0)
    setSteps(0)
    setDuration(0)
    prevSmoothedRef.current = null
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const distanceKm = distance / 1000
  const calories = (steps * 0.04).toFixed(1)

  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const formattedTime = `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`

  if (!position) return <p>Getting location...</p>

  return (
    <>
      <div style={{
        position: 'absolute',
        zIndex: 1000,
        top: 12,
        left: 12,
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        padding: '14px',
        borderRadius: '12px'
      }}>
        <div>Distance: {distanceKm.toFixed(2)} km</div>
        <div>Duration: {formattedTime}</div>
        <div>Steps: {steps}</div>
        <div>Calories: {calories} kcal</div>

        {!isRunning ? (
          <button onClick={handleStart}>Start Run</button>
        ) : (
          <button onClick={handleStop}>Stop Run</button>
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

        {path.length > 1 && (
          <Polyline positions={path} color="red" />
        )}
      </MapContainer>
    </>
  )
}

export default MapView