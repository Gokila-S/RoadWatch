import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, MapPin, Clock, Calendar, CheckCircle2, User, AlertCircle } from 'lucide-react'
import useStore from '../../store/useStore'
import MapView from '../../components/MapView/MapView'
import { StatusBadge, SeverityBadge } from '../../components/StatusBadge/StatusBadge'
import './ReportTracker.css'

const ReportTracker = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { reports } = useStore()
  
  const report = reports.find(r => r.id === id) || reports[0] // Fallback for mock demo

  if (!report) {
    return <div className="p-xl text-center">Report not found</div>
  }

  const timelineSteps = [
    { status: 'pending', title: 'Pending Verification', desc: 'System has logged the report. Awaiting review.' },
    { status: 'verified', title: 'Verified', desc: 'AI and Admin have verified the issue exists.' },
    { status: 'assigned', title: 'Assigned to Team', desc: 'A field team has been dispatched to the location.' },
    { status: 'resolved', title: 'Resolved', desc: report.resolution || 'The issue has been completely fixed.' }
  ]

  const currentStepIdx = timelineSteps.findIndex(s => s.status === report.status)

  return (
    <div className="tracker-page">
      <div className="container max-w-4xl mx-auto pt-24 pb-20 px-4">
        
        {/* Header Back & Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="btn-icon bg-secondary border border-dim text-secondary hover:text-primary">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="heading-display text-xl">{report.title}</h1>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-secondary font-mono text-xs mt-1 tracking-wide">ID: {report.id}</p>
          </div>
        </div>

        <div className="tracker-grid">
          
          {/* Main Info Column */}
          <div className="flex flex-col gap-6">
            
            {/* Context Card */}
            <div className="card p-0 overflow-hidden bg-secondary border border-subtle">
               {/* Image */}
               <div className="w-full h-48 bg-tertiary relative">
                 {report.images?.[0] ? (
                    <img src={report.images[0]} className="w-full h-full object-cover" alt="Issue" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary">
                      <AlertCircle className="opacity-20 flex-shrink-0" style={{marginRight: '8px'}} size={40} /> No Image
                    </div>
                 )}
                 <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                    <SeverityBadge severity={report.severity} />
                 </div>
               </div>

               {/* Meta Details */}
               <div className="p-5">
                  <div className="flex gap-2 items-start mb-4">
                    <MapPin className="text-signal-cyan shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-dim font-mono mb-1">LOCATION</p>
                      <p className="text-sm font-semibold text-primary">{report.location.address}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dim">
                     <div>
                       <p className="text-xs text-dim font-mono mb-1">DATE REPORTED</p>
                       <p className="text-sm flex gap-2 items-center text-secondary"><Calendar size={14}/> {new Date(report.createdAt).toLocaleDateString()}</p>
                     </div>
                     <div>
                       <p className="text-xs text-dim font-mono mb-1">REPORTED BY</p>
                       <p className="text-sm flex gap-2 items-center text-secondary"><User size={14}/> {report.reporterName}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Exact Location Map */}
            <div className="card p-0 overflow-hidden h-48 border border-subtle">
               <MapView center={[report.location.lat, report.location.lng]} zoom={15} interactive={false} reports={[report]} />
            </div>
          </div>

          {/* Timeline Column */}
          <div className="flex flex-col gap-6">
            
            <div className="card bg-secondary border border-subtle flex-1">
               <h2 className="text-sm font-semibold mb-6 flex items-center gap-2 text-primary">
                 <Clock size={16} className="text-amber" />
                 Resolution Timeline
               </h2>

               <div className="timeline">
                 {timelineSteps.map((step, idx) => {
                    const isCompleted = idx <= currentStepIdx
                    const isCurrent = idx === currentStepIdx

                    return (
                      <div key={idx} className={`timeline-item ${isCompleted ? 'completed' : 'pending'} ${isCurrent ? 'current' : ''}`}>
                         <div className="timeline-marker">
                            {isCompleted ? <CheckCircle2 size={16} /> : <div className="w-2 h-2 rounded-full bg-dim"></div>}
                         </div>
                         <div className="timeline-content">
                            <h3 className="timeline-title">{step.title}</h3>
                            <p className="timeline-desc">{step.desc}</p>
                            {isCurrent && report.status === 'pending' && (
                               <p className="text-xs text-amber font-mono mt-2 bg-amber-glow/10 p-2 rounded border border-amber/20 inline-block">
                                 Waiting for verification
                               </p>
                            )}
                            {isCurrent && report.status === 'resolved' && (
                               <p className="text-xs text-signal-green font-mono mt-2 bg-signal-green/10 p-2 rounded border border-signal-green/20 inline-block">
                                 Road repaired by local authority
                               </p>
                            )}
                         </div>
                      </div>
                    )
                 })}
               </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default ReportTracker
