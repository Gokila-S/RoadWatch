import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import { StatusBadge, SeverityBadge } from '../../components/StatusBadge/StatusBadge'
import './Dashboard.css'

const Dashboard = () => {
  const { user, reports, fetchReports } = useStore()

  useEffect(() => {
    fetchReports().catch((error) => {
      console.error('Failed to fetch dashboard reports', error)
    })
  }, [fetchReports])
  
  // Filter reports for current citizen
  const citizenReports = reports.filter(r => r.reportedBy === user?.id)

  const activeReports = citizenReports.filter(r => r.status !== 'resolved')
  const resolvedReports = citizenReports.filter(r => r.status === 'resolved')

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
            
            {activeReports.length > 0 ? (
              <div className="reports-list space-y-sm">
                {activeReports.map((report, i) => (
                  <motion.div 
                    key={report.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link to={`/report/${report.id}`} className="report-card card flex gap-md block w-full text-left">
                      <div className="report-thumb rounded-md overflow-hidden bg-tertiary" style={{width: '100px', flexShrink: 0}}>
                        {report.images?.[0] ? (
                          <div className="w-full h-full skeleton-shimmer"></div> // Mock image
                        ) : (
                           <div className="flex items-center justify-center h-full text-mono text-dim text-xs">NO IMG</div>
                        )}
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
                        
                        <div className="flex items-center justify-between mt-sm">
                          <div className="flex gap-sm">
                            <SeverityBadge severity={report.severity} />
                            <span className="text-xs text-mono text-dim self-center">{report.id}</span>
                          </div>
                          <span className="text-xs text-dim">Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
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

          <section className="reports-section space-y-md mt-xl">
            <h2 className="heading-sm flex items-center gap-xs text-muted">
              Resolved Reports
              <span className="badge" style={{background: 'var(--bg-tertiary)'}}>{resolvedReports.length}</span>
            </h2>
            
            {resolvedReports.length > 0 && (
              <div className="reports-list space-y-sm opacity-80">
                {resolvedReports.map((report) => (
                   <Link key={report.id} to={`/report/${report.id}`} className="report-card card flex gap-md border-dim block w-full text-left">
                     <div className="flex-1 py-1">
                         <div className="flex justify-between items-center mb-xs">
                           <h3 className="text-sm text-primary">{report.title}</h3>
                           <StatusBadge status="resolved" />
                         </div>
                         <p className="text-xs text-secondary">{report.resolution}</p>
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
                center={[12.9352, 77.6245]} 
                zoom={12} 
                reports={reports} 
                colorBy="status"
                showUserLocation={true}
              />
            </div>
            <div className="p-xl border-t border-dim">
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
                  <span style={{width:10, height:10, borderRadius:'50%', backgroundColor:'var(--signal-green)'}}></span>
                  <span className="text-secondary">Resolved</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dim flex items-center gap-2 text-xs font-mono text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3" fill="#000"/>
                </svg>
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
