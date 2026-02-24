import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

function MapView() {
  const position = [26.9124, 75.7873] // Jaipur

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>Runner starting point</Popup>
      </Marker>
    </MapContainer>
  )
}

export default MapView