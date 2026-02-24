import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'

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
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setPosition([latitude, longitude])
      },
      (err) => {
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  if (error) return <p>{error}</p>
  if (!position) return <p>Getting your location...</p>

  return (
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
    </MapContainer>
  )
}

export default MapView