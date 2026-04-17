import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet'
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

const userIcon = L.divIcon({
  className: 'custom-marker user-marker',
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transform: translateY(-20px);">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 6px 8px rgba(0,0,0,0.8));">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3" fill="#000"/>
      </svg>
      <div class="marker-pulse" style="width: 40px; height: 40px; background: var(--text-primary); animation-duration: 2.5s; opacity: 0.15; position: absolute; z-index: -1; transform: translateY(16px);"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -40],
})

const RecenterMap = ({ center, zoom }) => {
  const map = useMap()

  useEffect(() => {
    if (!Array.isArray(center) || center.length !== 2) return
    map.setView(center, zoom, { animate: true })
  }, [map, center, zoom])

  return null
}

const FitBoundary = ({ boundary = null, enabled = false, padding = [28, 28] }) => {
  const map = useMap()

  useEffect(() => {
    if (!enabled || !Array.isArray(boundary) || boundary.length < 3) return

    const bounds = L.latLngBounds(boundary)
    if (!bounds.isValid()) return

    // Fit once per boundary update so user interactions are not constantly overridden.
    map.fitBounds(bounds, { padding, animate: true, maxZoom: 13 })
  }, [map, boundary, enabled, padding])

  return null
}

const MapView = ({
  reports = [],
  center = [11.15, 77.65],
  zoom = 12,
  height = '100%',
  onMarkerClick,
  selectedId,
  colorBy = 'severity',
  interactive = true,
  className = '',
  showUserLocation = false,
  userLocation = null,
  districtBoundary = null,
  showDistrictBoundary = false,
  focusOnDistrictBoundary = false,
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
        touchZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!focusOnDistrictBoundary && <RecenterMap center={center} zoom={zoom} />}
        <FitBoundary boundary={districtBoundary} enabled={focusOnDistrictBoundary} />

        {showDistrictBoundary && Array.isArray(districtBoundary) && districtBoundary.length >= 3 && (
          <Polygon
            positions={districtBoundary}
            pathOptions={{
              color: '#0dcbf2',
              weight: 2,
              dashArray: '8 8',
              fillColor: '#0dcbf2',
              fillOpacity: 0.08,
            }}
          />
        )}
        
        {showUserLocation && userLocation && (
          <Marker position={userLocation} icon={userIcon}>
             <Popup><div className="map-popup text-center"><strong>You are here</strong></div></Popup>
          </Marker>
        )}

        {markers.map(report => (
          <Marker
            key={report.id}
            position={[report.location.lat, report.location.lng]}
            icon={report.icon}
            eventHandlers={{
              click: () => onMarkerClick?.(report),
            }}
          >
            <Popup autoPan={false}>
              <div className="map-popup">
                <p className="map-popup-id">{report.id}</p>
                <p className="map-popup-title">{report.title}</p>
                <div className="map-popup-meta">
                  <span className={`badge badge-${report.status}`}>
                    <span className="badge-dot"></span>
                    {report.status}
                  </span>
                  <span
                    className="badge"
                    style={{
                      borderColor: `${SEVERITY_COLORS[report.severity] || '#f59e0b'}66`,
                      color: SEVERITY_COLORS[report.severity] || '#f59e0b',
                      background: `${SEVERITY_COLORS[report.severity] || '#f59e0b'}1f`,
                    }}
                  >
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
