import { create } from 'zustand'

// ── Mock Data ──

const MOCK_REPORTS = [
  {
    id: 'RW-2026-0011',
    title: 'Deep pothole causing accidents near Hebbal Lake',
    description: 'Very dangerous pothole, 2 cars already popped their tires today. Needs immediate filler.',
    category: 'pothole',
    severity: 'high',
    status: 'pending',
    location: { lat: 13.0458, lng: 77.5870, address: 'Outer Ring Road, near Hebbal Lake' },
    district: 'Chennai Region',
    reportedBy: 'citizen_011',
    reporterName: 'Sunil Verma',
    assignedTo: null,
    aiConfidence: 95,
    images: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80'],
    createdAt: '2026-04-03T08:30:00Z',
    updatedAt: '2026-04-03T08:30:00Z',
    slaDeadline: '2026-04-05T08:30:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0001',
    title: 'Major pothole on NH-48 near Hebbal Flyover',
    description: 'Large pothole approximately 2ft wide causing traffic slowdown and vehicle damage risk.',
    category: 'pothole',
    severity: 'critical',
    status: 'assigned',
    location: { lat: 13.0358, lng: 77.5970, address: 'NH-48, Hebbal, Bangalore' },
    district: 'Chennai Region',
    reportedBy: 'citizen_001',
    reporterName: 'Priya Sharma',
    assignedTo: 'admin_north',
    aiConfidence: 94,
    images: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80'],
    createdAt: '2026-03-28T08:30:00Z',
    updatedAt: '2026-03-29T14:00:00Z',
    slaDeadline: '2026-04-04T08:30:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0002',
    title: 'Road surface crack on MG Road',
    description: 'Longitudinal crack spanning 15 meters on MG Road near Brigade Road junction.',
    category: 'crack',
    severity: 'high',
    status: 'verified',
    location: { lat: 12.9716, lng: 77.6070, address: 'MG Road, Bangalore' },
    district: 'Trichy Region',
    reportedBy: 'citizen_002',
    reporterName: 'Arjun Menon',
    assignedTo: null,
    aiConfidence: 89,
    images: ['https://images.unsplash.com/photo-1584464436224-118bd3144f80?auto=format&fit=crop&q=80'],
    createdAt: '2026-03-29T10:15:00Z',
    updatedAt: '2026-03-30T09:00:00Z',
    slaDeadline: '2026-04-05T10:15:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0003',
    title: 'Damaged manhole cover on Residency Road',
    description: 'Manhole cover broken and partially sunken, creating a hazard for two-wheelers.',
    category: 'hazard',
    severity: 'critical',
    status: 'pending',
    location: { lat: 12.9700, lng: 77.6000, address: 'Residency Road, Bangalore' },
    district: 'Trichy Region',
    reportedBy: 'citizen_003',
    reporterName: 'Kavitha R',
    assignedTo: null,
    aiConfidence: 91,
    images: ['/placeholder-hazard.jpg'],
    createdAt: '2026-03-30T16:45:00Z',
    updatedAt: '2026-03-30T16:45:00Z',
    slaDeadline: '2026-04-06T16:45:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0004',
    title: 'Water logging on Outer Ring Road',
    description: 'Severe water logging due to broken drainage causing traffic congestion during rains.',
    category: 'waterlogging',
    severity: 'high',
    status: 'assigned',
    location: { lat: 12.9352, lng: 77.6245, address: 'Outer Ring Road, Marathahalli' },
    district: 'Madurai Region',
    reportedBy: 'citizen_004',
    reporterName: 'Rahul Dev',
    assignedTo: 'admin_east',
    aiConfidence: 87,
    images: ['/placeholder-water.jpg'],
    createdAt: '2026-03-27T07:00:00Z',
    updatedAt: '2026-03-28T11:30:00Z',
    slaDeadline: '2026-04-03T07:00:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0005',
    title: 'Speed breaker damage on 100ft Road',
    description: 'Speed breaker has deteriorated, chunks of concrete missing creating sharp edges.',
    category: 'pothole',
    severity: 'medium',
    status: 'resolved',
    location: { lat: 12.9560, lng: 77.6410, address: '100ft Road, Indiranagar' },
    district: 'Madurai Region',
    reportedBy: 'citizen_005',
    reporterName: 'Deepa Nair',
    assignedTo: 'admin_east',
    aiConfidence: 96,
    images: ['/placeholder-speedbreaker.jpg'],
    createdAt: '2026-03-20T09:00:00Z',
    updatedAt: '2026-03-25T16:00:00Z',
    slaDeadline: '2026-03-27T09:00:00Z',
    resolution: 'Repaired with fresh concrete. Quality check passed.',
  },
  {
    id: 'RW-2026-0006',
    title: 'Cave-in near Whitefield bus stop',
    description: 'Road cave-in about 3ft deep near bus stop. Area barricaded by locals.',
    category: 'hazard',
    severity: 'critical',
    status: 'assigned',
    location: { lat: 12.9698, lng: 77.7500, address: 'Whitefield Main Road, Bangalore' },
    district: 'Madurai Region',
    reportedBy: 'citizen_006',
    reporterName: 'Suresh K',
    assignedTo: 'admin_east',
    aiConfidence: 98,
    images: ['/placeholder-cavein.jpg'],
    createdAt: '2026-03-31T06:30:00Z',
    updatedAt: '2026-03-31T10:00:00Z',
    slaDeadline: '2026-04-02T06:30:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0007',
    title: 'Road shoulder erosion on Kanakapura Road',
    description: 'Significant erosion on road shoulder making it dangerous for cyclists and pedestrians.',
    category: 'erosion',
    severity: 'medium',
    status: 'verified',
    location: { lat: 12.8890, lng: 77.5740, address: 'Kanakapura Road, JP Nagar' },
    district: 'Coimbatore Region',
    reportedBy: 'citizen_007',
    reporterName: 'Meena Kumari',
    assignedTo: null,
    aiConfidence: 82,
    images: ['/placeholder-erosion.jpg'],
    createdAt: '2026-03-29T12:00:00Z',
    updatedAt: '2026-03-30T08:00:00Z',
    slaDeadline: '2026-04-05T12:00:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0008',
    title: 'Multiple potholes on Bellary Road',
    description: 'Series of potholes spanning 200m stretch near Palace Grounds entrance.',
    category: 'pothole',
    severity: 'high',
    status: 'resolved',
    location: { lat: 13.0070, lng: 77.5780, address: 'Bellary Road, Sadashivanagar' },
    district: 'Chennai Region',
    reportedBy: 'citizen_008',
    reporterName: 'Vikram Singh',
    assignedTo: 'admin_north',
    aiConfidence: 93,
    images: ['/placeholder-multipothole.jpg'],
    createdAt: '2026-03-15T08:00:00Z',
    updatedAt: '2026-03-22T14:30:00Z',
    slaDeadline: '2026-03-22T08:00:00Z',
    resolution: 'Full road resurfacing completed for 200m stretch.',
  },
  {
    id: 'RW-2026-0009',
    title: 'Sinkhole forming on Sarjapur Road',
    description: 'Small sinkhole forming near Wipro junction. Underground water pipe suspected.',
    category: 'hazard',
    severity: 'critical',
    status: 'pending',
    location: { lat: 12.9100, lng: 77.6850, address: 'Sarjapur Road, Bangalore' },
    district: 'Coimbatore Region',
    reportedBy: 'citizen_009',
    reporterName: 'Anand Rao',
    assignedTo: null,
    aiConfidence: 76,
    images: ['https://images.unsplash.com/photo-1447065972825-f71661d4a04d?auto=format&fit=crop&q=80'],
    createdAt: '2026-04-01T14:00:00Z',
    updatedAt: '2026-04-01T14:00:00Z',
    slaDeadline: '2026-04-08T14:00:00Z',
    resolution: null,
  },
  {
    id: 'RW-2026-0010',
    title: 'Uneven road patch on Electronic City',
    description: 'Previous repair patch has become uneven and creates a bump hazard at high speed.',
    category: 'crack',
    severity: 'medium',
    status: 'assigned',
    location: { lat: 12.8440, lng: 77.6603, address: 'Electronic City Phase 1, Bangalore' },
    district: 'Coimbatore Region',
    reportedBy: 'citizen_010',
    reporterName: 'Lakshmi P',
    assignedTo: 'admin_south',
    aiConfidence: 85,
    images: ['/placeholder-uneven.jpg'],
    createdAt: '2026-03-26T11:00:00Z',
    updatedAt: '2026-03-28T09:00:00Z',
    slaDeadline: '2026-04-02T11:00:00Z',
    resolution: null,
  },
]

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'status', message: 'Your report RW-2026-0001 has been assigned to a field team.', time: '2h ago', read: false },
  { id: 2, type: 'update', message: 'AI validation complete for your submission. Confidence: 94%', time: '5h ago', read: false },
  { id: 3, type: 'resolved', message: 'Report RW-2026-0005 has been resolved! Thank you.', time: '1d ago', read: true },
  { id: 4, type: 'alert', message: 'New critical issue reported near your area.', time: '2d ago', read: true },
]

const DISTRICTS = [
  { id: 'north', name: 'Chennai Region', admin: 'Rajesh Kumar', totalIssues: 156, resolved: 134, pending: 12, assigned: 10, avgResolution: '4.2 days' },
  { id: 'south', name: 'Coimbatore Region', admin: 'Sunita Devi', totalIssues: 203, resolved: 178, pending: 15, assigned: 10, avgResolution: '3.8 days' },
  { id: 'east', name: 'Madurai Region', admin: 'Mohammed Salim', totalIssues: 187, resolved: 152, pending: 18, assigned: 17, avgResolution: '5.1 days' },
  { id: 'central', name: 'Trichy Region', admin: 'Preethi Rao', totalIssues: 142, resolved: 125, pending: 8, assigned: 9, avgResolution: '3.2 days' },
  { id: 'west', name: 'Salem Region', admin: 'Ganesh Hegde', totalIssues: 98, resolved: 89, pending: 5, assigned: 4, avgResolution: '2.9 days' },
]

const ANALYTICS_MONTHLY = [
  { month: 'Oct', reported: 142, resolved: 128, pending: 14 },
  { month: 'Nov', reported: 168, resolved: 155, pending: 13 },
  { month: 'Dec', reported: 134, resolved: 130, pending: 4 },
  { month: 'Jan', reported: 189, resolved: 171, pending: 18 },
  { month: 'Feb', reported: 210, resolved: 192, pending: 18 },
  { month: 'Mar', reported: 198, resolved: 178, pending: 20 },
]

const ISSUE_CATEGORIES = [
  { id: 'pothole', label: 'Pothole', icon: '🕳️', count: 342 },
  { id: 'crack', label: 'Road Crack', icon: '⚡', count: 189 },
  { id: 'hazard', label: 'Hazard', icon: '⚠️', count: 156 },
  { id: 'waterlogging', label: 'Waterlogging', icon: '🌊', count: 98 },
  { id: 'erosion', label: 'Erosion', icon: '🏔️', count: 67 },
  { id: 'signage', label: 'Signage', icon: '🪧', count: 45 },
  { id: 'other', label: 'Other', icon: '📋', count: 89 },
]

// ── Store ──

const useStore = create((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  userRole: null, // 'citizen', 'admin', 'superadmin'

  login: (role, name = undefined) => {
    const users = {
      citizen: { id: 'citizen_001', name: name || 'Priya Sharma', email: 'priya@example.com', role: 'citizen', district: 'Chennai Region' },
      admin: { id: 'admin_north', name: 'Rajesh Kumar', email: 'rajesh@roadwatch.gov', role: 'admin', district: 'Chennai Region' },
      superadmin: { id: 'super_001', name: 'Commissioner Rao', email: 'commissioner@roadwatch.gov', role: 'superadmin', district: 'All' },
    }
    set({ user: users[role], isAuthenticated: true, userRole: role })
  },

  logout: () => set({ user: null, isAuthenticated: false, userRole: null }),

  // Reports
  reports: MOCK_REPORTS,
  selectedReport: null,
  filterStatus: 'all',
  filterSeverity: 'all',
  filterDistrict: 'all',

  setSelectedReport: (report) => set({ selectedReport: report }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterSeverity: (severity) => set({ filterSeverity: severity }),
  setFilterDistrict: (district) => set({ filterDistrict: district }),

  getFilteredReports: () => {
    const { reports, filterStatus, filterSeverity, filterDistrict } = get()
    return reports.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false
      if (filterDistrict !== 'all' && r.district !== filterDistrict) return false
      return true
    })
  },

  addReport: (report) => set(state => ({
    reports: [{ ...report, id: `RW-2026-${String(state.reports.length + 1).padStart(4, '0')}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...state.reports]
  })),

  updateReportStatus: (id, status) => set(state => ({
    reports: state.reports.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
  })),

  // Notifications
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.read).length,

  markNotificationRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: state.notifications.filter(n => !n.read && n.id !== id).length,
  })),

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  // Data
  districts: DISTRICTS,
  analyticsMonthly: ANALYTICS_MONTHLY,
  issueCategories: ISSUE_CATEGORIES,

  // Stats
  getStats: () => {
    const reports = get().reports
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      verified: reports.filter(r => r.status === 'verified').length,
      assigned: reports.filter(r => r.status === 'assigned').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      critical: reports.filter(r => r.severity === 'critical').length,
      avgAiConfidence: Math.round(reports.reduce((a, r) => a + r.aiConfidence, 0) / reports.length),
      totalResolved: 786,
      totalReported: 986,
      citizenCount: 12450,
    }
  },
}))

export default useStore
