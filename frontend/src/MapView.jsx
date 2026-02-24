import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'

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
  const [isRunning, setIsRunning] = useState(false)
  const [watchId, setWatchId] = useState(null)

  const startRun = () => {
    if (!navigator.geolocation) return

    setPath([]) // reset previous path
    setIsRunning(true)

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const newPos = [latitude, longitude]

        setPosition(newPos)

        // Add to path only if running
        setPath((prev) => [...prev, newPos])
      },
      (err) => {
        console.log(err)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    )

    setWatchId(id)
  }

  const stopRun = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
    }
    setIsRunning(false)
  }

  if (!position && !isRunning) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <button onClick={startRun}>Start Run</button>
      </div>
    )
  }

  return (
    <div>
      <MapContainer
        center={position || [0, 0]}
        zoom={16}
        style={{ height: '90vh', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {position && <RecenterMap position={position} />}

        {position && (
          <Marker position={position}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {path.length > 1 && (
          <Polyline positions={path} color="red" />
        )}
      </MapContainer>

      <div style={{ textAlign: 'center', padding: '10px' }}>
        {isRunning ? (
          <button onClick={stopRun}>Stop Run</button>
        ) : (
          <button onClick={startRun}>Start Run</button>
        )}
      </div>
    </div>
  )
}

export default MapView