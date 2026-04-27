import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AlertTriangle, CloudRain, Construction, ImageOff, MapPin } from 'lucide-react'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import Loader from '../../components/Loader/Loader'
import { StatusBadge, SeverityBadge } from '../../components/StatusBadge/StatusBadge'
import { getReportImage, FALLBACK_IMAGES } from '../../utils/imageFallback'
import './Dashboard.css'

const toRadians = (value) => (value * Math.PI) / 180

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

const CategoryIcon = ({ category }) => {
  if (category === 'waterlogging') return <CloudRain size={18} />
  if (category === 'pothole') return <Construction size={18} />
  if (category === 'crack') return <AlertTriangle size={18} />
  if (category === 'hazard') return <AlertTriangle size={18} />
  return <ImageOff size={18} />
}

const ReportThumbnail = ({ report }) => {
  const [failed, setFailed] = useState(false)
  const imageUrl = failed ? (FALLBACK_IMAGES[report.category] || FALLBACK_IMAGES.default) : getReportImage(report)

  return (
    <img
      src={imageUrl}
      alt="Reported issue"
      className="report-thumb-image"
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

const Dashboard = () => {
  const { user, reports, fetchReports } = useStore()
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const query = userLocation
      ? {
        scope: 'map',
        lat: userLocation[0],
        lng: userLocation[1],
        radiusKm: 100,
      }
      : {}

    setLoading(true)
    fetchReports(query)
      .catch((error) => {
        console.error('Failed to fetch dashboard reports', error)
      })
      .finally(() => setLoading(false))
  }, [fetchReports, userLocation])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude])
        setLocationError('')
      },
      () => {
        setLocationError('Location permission denied. Showing default city view.')
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60 * 1000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])
  
  // Filter reports for current citizen
  const citizenReports = reports.filter(r => r.reportedBy === user?.id || (Array.isArray(r.supporters) && r.supporters.includes(user?.id)))

  const activeReports = reports.filter(r => r.reportedBy === user?.id && r.status !== 'resolved')
  const supportedActiveReports = reports.filter(r => r.reportedBy !== user?.id && Array.isArray(r.supporters) && r.supporters.includes(user?.id) && r.status !== 'resolved')
  const resolvedReports = citizenReports.filter(r => r.status === 'resolved')

  const mapCenter = useMemo(() => {
    const allActive = [...activeReports, ...supportedActiveReports]
    const firstGeoReport = allActive.find((report) => report.location?.lat && report.location?.lng)

    if (userLocation) {
      if (firstGeoReport) {
        const dist = calculateDistanceKm(userLocation[0], userLocation[1], firstGeoReport.location.lat, firstGeoReport.location.lng)
        // If the browser ISP location is more than 50km from their active localized reports,
        // center the map back on their incidents to prevent showing an empty canvas.
        if (dist > 50) return [firstGeoReport.location.lat, firstGeoReport.location.lng]
      }
      return userLocation
    }

    if (firstGeoReport) {
      return [firstGeoReport.location.lat, firstGeoReport.location.lng]
    }

    return [11.15, 77.65] // Core Erode defaults
  }, [userLocation, activeReports, supportedActiveReports])

  const mapReports = useMemo(() => {
    if (!userLocation) {
      return citizenReports
    }

    const [userLat, userLng] = userLocation

    return reports.filter((report) => {
      const isOwnReport = report.reportedBy === user?.id || (Array.isArray(report.supporters) && report.supporters.includes(user?.id))
      if (isOwnReport) return true

      const lat = report.location?.lat
      const lng = report.location?.lng
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false

      return calculateDistanceKm(userLat, userLng, lat, lng) <= 100
    })
  }, [reports, userLocation, citizenReports, user?.id])

  return (
    <div className="citizen-dashboard container">
      <div className="dashboard-header flex justify-between items-center mb-xl">
        <div>
          <h1 className="heading-display heading-md">Citizen Dashboard</h1>
          <p className="text-secondary text-mono mt-2">Welcome back, {user?.name || 'Citizen'}</p>
        </div>
        <Link to="/report" className="btn btn-primary">
          + New Report
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main space-y-lg">
          <section className="reports-section space-y-md">
            <h2 className="heading-sm flex items-center gap-xs">
              <span className="text-accent text-mono">//</span> Active Reports
              <span className="badge" style={{background: 'var(--bg-tertiary)'}}>{activeReports.length}</span>
            </h2>
            
            {loading ? (
              <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <Loader />
              </div>
            ) : activeReports.length > 0 ? (
              <div className="reports-list space-y-sm">
                {activeReports.map((report, i) => (
                  <motion.div 
                    key={report.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link to={`/report/${report.id}`} className="report-card card flex gap-md w-full text-left">
                      <div className="report-thumb rounded-md overflow-hidden bg-tertiary" style={{width: '100px', flexShrink: 0}}>
                        <ReportThumbnail report={report} />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <h3 className="text-base font-semibold text-primary line-clamp-1 flex-1">{report.title}</h3>
                              <div className="flex-shrink-0">
                                <StatusBadge status={report.status} />
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-secondary line-clamp-1">{report.location.address}</p>
                        </div>
                        
                        <div className="report-meta-row mt-sm">
                          <div className="report-meta-left">
                            <SeverityBadge severity={report.severity} />
                            <span className="text-xs text-mono text-dim self-center">{report.id}</span>
                          </div>
                          <span className="text-xs text-dim report-updated">Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
               <div className="glass-panel p-xl text-center">
                 <p className="text-secondary">No active reports. Good job!</p>
               </div>
            )}
          </section>

          {supportedActiveReports.length > 0 && (
            <section className="reports-section space-y-md mt-xl">
              <h2 className="heading-sm flex items-center gap-xs">
                <span className="text-signal-blue text-mono">//</span> Supported Issues
                <span className="badge" style={{background: 'var(--bg-tertiary)'}}>{supportedActiveReports.length}</span>
              </h2>
              
              <div className="reports-list space-y-sm">
                {supportedActiveReports.map((report, i) => (
                  <motion.div 
                    key={report.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link to={`/report/${report.id}`} className="report-card card flex gap-md w-full text-left" style={{ borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                      <div className="report-thumb rounded-md overflow-hidden bg-tertiary" style={{width: '100px', flexShrink: 0}}>
                        <ReportThumbnail report={report} />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <h3 className="text-base font-semibold text-primary line-clamp-1 flex-1">{report.title}</h3>
                              <div className="flex-shrink-0">
                                <StatusBadge status={report.status} />
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-secondary line-clamp-1">{report.location.address}</p>
                        </div>
                        
                        <div className="report-meta-row mt-sm">
                          <div className="report-meta-left">
                            <SeverityBadge severity={report.severity} />
                            <span className="text-xs text-mono text-dim self-center">{report.id}</span>
                          </div>
                          <span className="text-xs text-dim report-updated">Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <section className="reports-section space-y-md mt-xl">
            <h2 className="heading-sm flex items-center gap-xs text-muted">
              Resolved Reports
              <span className="badge" style={{background: 'var(--bg-tertiary)'}}>{resolvedReports.length}</span>
            </h2>
            
            {resolvedReports.length > 0 && (
              <div className="reports-list space-y-sm opacity-80">
                {resolvedReports.map((report) => (
                  <Link key={report.id} to={`/report/${report.id}`} className="report-card card flex gap-md border-dim w-full text-left">
                    <div className="report-thumb rounded-md overflow-hidden bg-tertiary" style={{ width: '100px', flexShrink: 0 }}>
                      <ReportThumbnail report={report} />
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="resolved-card-header">
                        <h3 className="text-base font-semibold text-primary line-clamp-1">{report.title}</h3>
                        <StatusBadge status="resolved" />
                      </div>

                      <p className="text-sm text-secondary line-clamp-1">{report.location?.address || 'Location unavailable'}</p>
                      <p className="text-xs text-secondary line-clamp-1">{report.resolution || 'Resolved by district team.'}</p>

                      <div className="report-meta-row mt-sm">
                        <div className="report-meta-left">
                          <SeverityBadge severity={report.severity} />
                          <span className="text-xs text-mono text-dim self-center">{report.id}</span>
                        </div>
                        <span className="text-xs text-dim report-updated">Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-sidebar">
          <div className="card sticky-sidebar p-0 overflow-hidden">
            <div className="p-sm bg-tertiary border-b border-dim">
              <h3 className="text-sm font-semibold flex items-center gap-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                My Area Activity
              </h3>
            </div>
            <div style={{ height: '300px' }}>
              <MapView 
                key={`my-area-map-${userLocation ? userLocation.join('-') : 'fallback'}`}
                center={mapCenter}
                zoom={userLocation ? 13 : 12}
                reports={mapReports}
                colorBy="status"
                showUserLocation={true}
                userLocation={userLocation}
                interactive={true}
              />
            </div>
            <div className="p-xl border-t border-dim">
              {locationError ? <p className="text-xs text-dim mb-3">{locationError}</p> : null}
              <h4 className="text-sm font-semibold mb-xs text-primary">Map Indicators</h4>
              <p className="text-xs text-secondary mb-4 leading-relaxed">Showing active local issues.</p>
              
              <div className="flex text-xs font-mono" style={{ flexWrap: 'wrap', rowGap: '12px', columnGap: '16px' }}>
                <div className="flex items-center gap-2">
                  <span style={{width:10, height:10, borderRadius:'50%', backgroundColor:'var(--amber)', boxShadow: '0 0 5px var(--amber)'}}></span>
                  <span className="text-secondary">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{width:10, height:10, borderRadius:'50%', backgroundColor:'var(--signal-blue)', boxShadow: '0 0 5px var(--signal-blue)'}}></span>
                  <span className="text-secondary">Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{width:10, height:10, borderRadius:'50%', backgroundColor:'var(--signal-purple)', boxShadow: '0 0 5px var(--signal-purple)'}}></span>
                  <span className="text-secondary">Assigned</span>
                </div>
                <div className="flex items-center gap-2 opacity-40">
                  <span style={{width:10, height:10, borderRadius:'50%', backgroundColor:'var(--signal-green)', boxShadow: '0 0 5px var(--signal-green)'}}></span>
                  <span className="text-secondary">Resolved</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dim flex items-center gap-2 text-xs font-mono text-primary">
                <div style={{ position: 'relative', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--signal-blue)" stroke="var(--bg-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3" fill="var(--bg-secondary)"/>
                  </svg>
                </div>
                <span>You are here</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
