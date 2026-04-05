import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from 'recharts'
import useStore from '../../store/useStore'
import './Analytics.css'

const Analytics = () => {
  const { analyticsMonthly, issueCategories, districts, analyticsSummary, fetchAnalytics } = useStore()

  useEffect(() => {
    fetchAnalytics().catch((error) => {
      console.error('Failed to fetch analytics', error)
    })
  }, [fetchAnalytics])

  // Custom tooltips for dark theme
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip glass-panel p-sm border-dim">
          <p className="text-mono text-dim mb-1">{`Month: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="analytics-page container">
      <div className="page-header mb-xl">
        <h1 className="heading-display heading-md">System Intelligence & Analytics</h1>
        <p className="text-secondary mt-xs flex items-center gap-sm mt-2">
          <span className="badge-dot" style={{background: 'var(--signal-cyan)'}}></span>
          Live Data Stream Active
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="stats-grid mb-xl">
        <motion.div className="stat-card glass-panel" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}}>
           <p className="text-mono text-dim mb-2 text-xs">AVERAGE AI CONFIDENCE</p>
           <h3 className="heading-display text-accent text-3xl">{analyticsSummary?.avg_ai_confidence || 0}%</h3>
           <p className="text-signal-green text-xs mt-2">Live from backend</p>
        </motion.div>
        <motion.div className="stat-card glass-panel" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
           <p className="text-mono text-dim mb-2 text-xs">AVG SLA RESOLUTION TIME</p>
           <h3 className="heading-display text-3xl">{districts.length} <span className="text-lg text-dim">Districts</span></h3>
           <p className="text-signal-green text-xs mt-2">Live district coverage</p>
        </motion.div>
        <motion.div className="stat-card glass-panel" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}}>
           <p className="text-mono text-dim mb-2 text-xs">AUTO-ROUTING EFFICIENCY</p>
           <h3 className="heading-display text-3xl">{analyticsSummary?.resolved || 0}/{analyticsSummary?.total || 0}</h3>
           <p className="text-secondary text-xs mt-2">Resolved vs total reports</p>
        </motion.div>
        <motion.div className="stat-card glass-panel" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.4}}>
           <p className="text-mono text-dim mb-2 text-xs">CRITICAL INCIDENTS</p>
           <h3 className="heading-display text-signal-red text-3xl">{analyticsSummary?.critical || 0}</h3>
           <p className="text-signal-red text-xs mt-2">Critical incidents from DB</p>
        </motion.div>
      </div>

      <div className="charts-grid mb-xl">
        {/* Main Trend Chart */}
        <div className="chart-card glass-panel-sm p-lg chart-span-2">
          <div className="flex justify-between items-center mb-md">
            <div>
              <h3 className="text-sm font-semibold">Incident reporting & Resolution trends</h3>
              <p className="text-xs text-dim mt-1">Comparitive analysis over 6 months</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--amber)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--signal-green)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--signal-green)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-tertiary)" tick={{fontSize: 12}} dy={10} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-tertiary)" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="reported" name="Reported" stroke="var(--amber)" strokeWidth={2} fillOpacity={1} fill="url(#colorReported)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="var(--signal-green)" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Bar Chart */}
        <div className="chart-card glass-panel-sm p-lg">
          <div className="mb-md">
            <h3 className="text-sm font-semibold">Classification Distribution</h3>
            <p className="text-xs text-dim mt-1">AI-categorized issue volumes</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueCategories} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="var(--text-tertiary)" hide />
                <YAxis dataKey="label" type="category" stroke="var(--text-secondary)" tick={{fontSize: 11}} width={80} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: 'var(--bg-tertiary)', border: '1px solid var(--border-dim)'}} />
                <Bar dataKey="count" fill="var(--signal-blue)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* District Performance Table */}
      <div className="data-table-section glass-panel">
        <div className="p-lg border-b border-dim">
          <h3 className="text-sm font-semibold text-accent">District SLA Performance Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-tertiary text-xs text-mono text-dim">
                <th className="p-md font-normal">DISTRICT</th>
                <th className="p-md font-normal">ADMINISTRATOR</th>
                <th className="p-md font-normal text-right">TOTAL ISSUES</th>
                <th className="p-md font-normal text-right">RESOLVED (%)</th>
                <th className="p-md font-normal text-right">PENDING</th>
                <th className="p-md font-normal text-right">AVG SLA</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((district, i) => {
                const resolutionRate = Math.round((district.resolved / district.totalIssues) * 100)
                return (
                  <tr key={district.id} className="border-b border-dim hover:bg-surface transition-colors">
                    <td className="p-md font-medium text-sm">{district.name}</td>
                    <td className="p-md text-secondary text-sm">{district.admin}</td>
                    <td className="p-md text-right text-sm">{district.totalIssues}</td>
                    <td className="p-md text-right">
                      <div className="flex items-center justify-end gap-sm">
                        <span className="text-sm">{resolutionRate}%</span>
                        <div className="w-16 h-1.5 bg-tertiary rounded-full overflow-hidden">
                           <div className="h-full rounded-full" style={{width: `${resolutionRate}%`, background: resolutionRate > 85 ? 'var(--signal-green)' : 'var(--amber)'}}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-md text-right text-sm">{district.pending}</td>
                    <td className="p-md text-right text-sm text-mono text-secondary">{district.avgResolution}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics
