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

const DISTRICTS = [
  { id: 'coimbatore', name: 'Coimbatore', admin: 'Rajesh Kumar', totalIssues: 156, resolved: 134, pending: 12, assigned: 10, avgResolution: '4.2 days' },
  { id: 'erode', name: 'Erode', admin: 'Sunita Devi', totalIssues: 203, resolved: 178, pending: 15, assigned: 10, avgResolution: '3.8 days' },
  { id: 'tiruppur', name: 'Tiruppur', admin: 'Mohammed Salim', totalIssues: 187, resolved: 152, pending: 18, assigned: 17, avgResolution: '5.1 days' },
  { id: 'salem', name: 'Salem', admin: 'Preethi Rao', totalIssues: 142, resolved: 125, pending: 8, assigned: 9, avgResolution: '3.2 days' },
  { id: 'trichy', name: 'Trichy', admin: 'Ganesh Hegde', totalIssues: 98, resolved: 89, pending: 5, assigned: 4, avgResolution: '2.9 days' },
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const extractWardFromAddress = (address) => {
  if (typeof address !== 'string') return ''
  const firstPart = address.split(',')[0]?.trim()
  return firstPart || ''
}

const getPersistedAuth = () => {
  const token = localStorage.getItem('rw_token')
  const userRaw = localStorage.getItem('rw_user')

  if (!token || !userRaw) {
    return { token: null, user: null }
  }

  try {
    const user = JSON.parse(userRaw)
    return { token, user }
  } catch {
    localStorage.removeItem('rw_token')
    localStorage.removeItem('rw_user')
    return { token: null, user: null }
  }
}

const persistedAuth = getPersistedAuth()

const getPersistedTheme = () => {
  const theme = localStorage.getItem('rw_theme') || 'light'
  if (theme === 'dark') {
    document.documentElement.classList.add('dark-theme')
  } else {
    document.documentElement.classList.remove('dark-theme')
  }
  return theme
}

const initialTheme = getPersistedTheme()

// ── Store ──

const useStore = create((set, get) => ({
  // Theme
  theme: initialTheme,
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('rw_theme', newTheme)

    // Enable smooth transition animation
    document.documentElement.classList.add('theme-transitioning')

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark-theme')
    } else {
      document.documentElement.classList.remove('dark-theme')
    }

    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 500)

    return { theme: newTheme }
  }),

  // Auth
  user: persistedAuth.user,
  token: persistedAuth.token,
  isAuthenticated: Boolean(persistedAuth.token),
  userRole: persistedAuth.user?.role || null,
  authLoading: false,
  authError: null,

  login: async (email, password) => {
    set({ authLoading: true, authError: null })

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      const user = {
        id: data.user.id,
        name: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        district: data.user.district,
        phone: data.user.phone,
        status: data.user.status,
      }

      localStorage.setItem('rw_token', data.token)
      localStorage.setItem('rw_user', JSON.stringify(user))

      set({
        user,
        token: data.token,
        isAuthenticated: true,
        userRole: data.user.role,
        authLoading: false,
        authError: null,
      })

      return { route: data.route }
    } catch (error) {
      set({ authLoading: false, authError: error.message })
      throw error
    }
  },

  signupCitizen: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup/citizen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Signup failed')
    }

    return data
  },

  fetchCurrentUser: async () => {
    const token = get().token
    if (!token) return null

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      get().logout()
      return null
    }

    const data = await response.json()
    const user = {
      id: data.user.id,
      name: data.user.full_name,
      email: data.user.email,
      role: data.user.role,
      district: data.user.district,
      phone: data.user.phone,
      status: data.user.status,
    }

    localStorage.setItem('rw_user', JSON.stringify(user))
    set({ user, userRole: user.role, isAuthenticated: true })

    return user
  },

  createDistrictAdmin: async (payload) => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/admin/district-admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not create district admin')
    }

    return data
  },

  updateDistrictAdmin: async (id, payload) => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/admin/district-admins/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not update district admin')
    }

    return data
  },

  deleteDistrictAdmin: async (id) => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/admin/district-admins/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not delete district admin')
    }

    return data
  },

  districtAdmins: [],

  fetchDistrictAdmins: async () => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/admin/district-admins`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not fetch district admins')
    }

    set({ districtAdmins: data.district_admins || [] })
    return data.district_admins || []
  },

  logout: () => {
    localStorage.removeItem('rw_token')
    localStorage.removeItem('rw_user')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      userRole: null,
      authError: null,
      districtAdmins: [],
      announcements: [],
    })
  },

  // Reports
  reports: [],
  selectedReport: null,
  filterStatus: 'all',
  filterSeverity: 'all',
  filterDistrict: 'all',
  reportsLoading: false,
  announcements: [],
  announcementFilter: 'all',
  announcementsLoading: false,

  setSelectedReport: (report) => set({ selectedReport: report }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterSeverity: (severity) => set({ filterSeverity: severity }),
  setFilterDistrict: (district) => set({ filterDistrict: district }),
  setAnnouncementFilter: (category) => set({ announcementFilter: category }),

  fetchReports: async (query = {}) => {
    const token = get().token
    if (!token) {
      set({ reports: [] })
      return []
    }

    set({ reportsLoading: true })

    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value)
      }
    })

    const response = await fetch(`${API_BASE_URL}/api/reports${params.toString() ? `?${params.toString()}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) {
      set({ reportsLoading: false })
      throw new Error(data.message || 'Could not fetch reports')
    }

    set({ reports: data.reports || [], reportsLoading: false })
    return data.reports || []
  },

  fetchAnnouncements: async (query = {}) => {
    const token = get().token
    if (!token) {
      set({ announcements: [] })
      return []
    }

    set({ announcementsLoading: true })

    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value)
        }
      })

      const response = await fetch(`${API_BASE_URL}/api/announcements${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Could not fetch announcements')
      }

      set({ announcements: data.announcements || [] })
      return data.announcements || []
    } finally {
      set({ announcementsLoading: false })
    }
  },

  fetchRelatedAnnouncements: async ({ category, location, district, limit = 3 }) => {
    const token = get().token
    if (!token || !category) return []

    const params = new URLSearchParams()
    params.set('category', category)
    params.set('limit', String(limit))

    if (location?.lat != null && location?.lng != null) {
      params.set('lat', String(location.lat))
      params.set('lng', String(location.lng))
    }

    if (location?.address) {
      const ward = extractWardFromAddress(location.address)
      if (ward) {
        params.set('ward', ward)
      }
    }

    if (district) {
      params.set('district', district)
    }

    const response = await fetch(`${API_BASE_URL}/api/announcements/related?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not fetch related announcements')
    }

    return data.announcements || []
  },

  createAnnouncement: async (payload) => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not create announcement')
    }

    set((state) => ({
      announcements: [data.announcement, ...state.announcements],
    }))

    return data.announcement
  },

  deleteAnnouncement: async (id) => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not delete announcement')
    }

    set((state) => ({
      announcements: state.announcements.filter((item) => item.id !== id),
    }))
  },

  getFilteredReports: () => {
    const { reports, filterStatus, filterSeverity, filterDistrict } = get()
    return reports.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false
      if (filterDistrict !== 'all' && r.district !== filterDistrict) return false
      return true
    })
  },

  checkSimilarReports: async ({ category, location, radiusKm = 0.2 }) => {
    const token = get().token
    if (!token || !category || !location?.lat || !location?.lng) return []

    const params = new URLSearchParams()
    params.set('scope', 'map')
    params.set('lat', String(location.lat))
    params.set('lng', String(location.lng))
    params.set('radiusKm', String(radiusKm))

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) return []

      return (data.reports || []).filter(
        (r) => r.category === category && r.status !== 'resolved' && r.status !== 'rejected'
      )
    } catch {
      return []
    }
  },

  createReport: async (payload) => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not create report')
    }

    set((state) => {
      const existIndex = state.reports.findIndex(r => r.id === data.report.id)
      if (existIndex > -1) {
        // Replace existing natively (auto-merged support)
        const updated = [...state.reports]
        updated[existIndex] = data.report
        return { reports: updated }
      }
      return { reports: [data.report, ...state.reports] }
    })
    
    return {
      report: data.report,
      relatedAnnouncements: data.relatedAnnouncements || [],
    }
  },

  // Offline Sync Queue
  offlineReports: JSON.parse(localStorage.getItem('rw_offline_reports') || '[]'),
  saveOfflineReport: (reportData) => set((state) => {
    const updated = [...state.offlineReports, reportData]
    localStorage.setItem('rw_offline_reports', JSON.stringify(updated))
    return { offlineReports: updated }
  }),
  removeOfflineReport: (id) => set((state) => {
    const updated = state.offlineReports.filter(r => r.offlineId !== id)
    localStorage.setItem('rw_offline_reports', JSON.stringify(updated))
    return { offlineReports: updated }
  }),
  syncOfflineReports: async () => {
    const { offlineReports, removeOfflineReport, createReport, token } = get()
    if (!token || offlineReports.length === 0) return

    for (const report of offlineReports) {
      try {
        let mediaIds = report.mediaIds || []
        
        // If it was saved with a base64 image and no mediaIds, upload it first
        if (mediaIds.length === 0 && report.imageBase64) {
          try {
            // Convert base64 to blob
            const response = await fetch(report.imageBase64)
            const blob = await response.blob()
            const file = new File([blob], 'offline-capture.jpg', { type: 'image/jpeg' })
            
            const formData = new FormData()
            formData.append('file', file)

            const uploadRes = await fetch(`${API_BASE_URL}/api/media/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            })

            const uploadData = await uploadRes.json()
            if (uploadRes.ok && uploadData.media) {
              mediaIds = [uploadData.media.id]
            } else if (uploadData.code === 'AI_REJECTED') {
              // If AI rejects it during sync, just remove it from queue
              removeOfflineReport(report.offlineId)
              continue
            } else {
              throw new Error('Upload failed during sync')
            }
          } catch (e) {
             console.error('Offline image upload failed during sync:', e)
             continue // Try next report
          }
        }

        if (mediaIds.length > 0) {
          await createReport({ ...report.payload, mediaIds })
          removeOfflineReport(report.offlineId)
        }
      } catch (err) {
        console.error('Failed to sync offline report', err)
      }
    }
  },

  supportReport: async (id) => {
    const token = get().token
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE_URL}/api/reports/${id}/support`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not support report')
    }

    set((state) => ({
      reports: state.reports.map((r) => (r.id === id ? data.report : r)),
      selectedReport: state.selectedReport?.id === id ? data.report : state.selectedReport,
    }))

    return data.report
  },

  uploadReportMedia: async (file) => {
    const token = get().token
    if (!token) {
      throw new Error('Not authenticated')
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) {
      const error = new Error(data.message || 'Could not upload image')
      error.code = data.code
      error.ai = data.ai
      throw error
    }

    return {
      media: data.media || null,
      ai: data.ai || null,
    }
  },

  updateReportStatus: async (id, status, resolution = '') => {
    const token = get().token
    const response = await fetch(`${API_BASE_URL}/api/reports/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, resolution }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not update report status')
    }

    set((state) => ({
      reports: state.reports.map((r) => (r.id === id ? data.report : r)),
      selectedReport: state.selectedReport?.id === id ? data.report : state.selectedReport,
    }))

    return data.report
  },

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  // Data
  districts: DISTRICTS,
  analyticsMonthly: [],
  issueCategories: [],
  analyticsSummary: null,

  fetchAnalytics: async (query = {}) => {
    const token = get().token
    if (!token) return null

    const searchParams = new URLSearchParams()
    if (query.district) {
      searchParams.set('district', query.district)
    }

    const url = `${API_BASE_URL}/api/analytics${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Could not fetch analytics')
    }

    set({
      analyticsSummary: data.stats,
      districts: (data.districtPerformance || []).map((d, idx) => ({
        id: String(idx + 1),
        name: d.district,
        admin: d.admin,
        totalIssues: d.total_issues,
        resolved: d.resolved,
        pending: d.pending,
        assigned: d.assigned,
        avgResolution: 'N/A',
      })),
      issueCategories: data.issueCategories || [],
      analyticsMonthly: data.monthlyTrend || [],
    })

    return data
  },

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
      avgAiConfidence: reports.length > 0 ? Math.round(reports.reduce((a, r) => a + r.aiConfidence, 0) / reports.length) : 0,
      totalResolved: reports.filter(r => r.status === 'resolved').length,
      totalReported: reports.length,
      citizenCount: reports.reduce((acc, r) => acc + (r.supportersCount || 1), 0),
    }
  },
}))

export default useStore
