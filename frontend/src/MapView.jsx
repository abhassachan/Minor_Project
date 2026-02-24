import { useEffect, useState } from 'react'
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
  const [error, setError] = useState(null)

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
        timeout: 5000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isRunning])

  const handleStart = () => {
    setPath([])
    setDistance(0)
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

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
          attribution='&copy; OpenStreetMap contributors'
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