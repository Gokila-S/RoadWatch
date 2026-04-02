import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import './MapView.css'

// Custom marker icons
const createIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div class="marker-pin" style="--marker-color: ${color}">
    <div class="marker-pulse"></div>
    <div class="marker-dot"></div>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -20],
})

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  verified: '#3b82f6',
  assigned: '#a855f7',
  resolved: '#22c55e',
}

const MapView = ({
  reports = [],
  center = [12.9716, 77.5946],
  zoom = 12,
  height = '100%',
  onMarkerClick,
  selectedId,
  colorBy = 'severity',
  interactive = true,
  className = '',
}) => {
  const markers = useMemo(() => {
    return reports.map(report => ({
      ...report,
      icon: createIcon(
        colorBy === 'severity'
          ? SEVERITY_COLORS[report.severity] || '#f59e0b'
          : STATUS_COLORS[report.status] || '#f59e0b'
      ),
    }))
  }, [reports, colorBy])

  return (
    <div className={`map-container ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map(report => (
          <Marker
            key={report.id}
            position={[report.location.lat, report.location.lng]}
            icon={report.icon}
            eventHandlers={{
              click: () => onMarkerClick?.(report),
            }}
          >
            <Popup>
              <div className="map-popup">
                <p className="map-popup-id">{report.id}</p>
                <p className="map-popup-title">{report.title}</p>
                <div className="map-popup-meta">
                  <span className={`badge badge-${report.status}`}>
                    <span className="badge-dot"></span>
                    {report.status}
                  </span>
                  <span className={`badge badge-${report.severity === 'critical' ? 'critical' : 'pending'}`}>
                    {report.severity}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map overlay gradient */}
      <div className="map-overlay-gradient"></div>
    </div>
  )
}

export default MapView
