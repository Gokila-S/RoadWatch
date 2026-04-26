const DISTRICT_GEOFENCES = [
  {
    district: 'Coimbatore',
    polygon: [
      [10.9, 76.8],
      [11.17, 76.8],
      [11.17, 77.1],
      [10.9, 77.1],
    ],
  },
  {
    district: 'Tiruppur',
    polygon: [
      [11.0, 77.15],
      [11.25, 77.15],
      [11.25, 77.45],
      [11.0, 77.45],
    ],
  },
  {
    district: 'Erode',
    polygon: [
      [11.2, 77.55],
      [11.52, 77.55],
      [11.52, 77.95],
      [11.2, 77.95],
    ],
  },
  {
    district: 'Salem',
    polygon: [
      [11.45, 77.95],
      [11.9, 77.95],
      [11.9, 78.35],
      [11.45, 78.35],
    ],
  },
  {
    district: 'Trichy',
    polygon: [
      [10.65, 78.45],
      [11.0, 78.45],
      [11.0, 78.95],
      [10.65, 78.95],
    ],
  },
]

export const SUPPORTED_DISTRICTS = DISTRICT_GEOFENCES.map((item) => item.district)

const isValidCoordinate = (value) => Number.isFinite(value)

const isPointInPolygon = (lat, lng, polygon) => {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i]
    const [latJ, lngJ] = polygon[j]

    const intersects = (
      (lngI > lng) !== (lngJ > lng)
      && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI
    )

    if (intersects) inside = !inside
  }

  return inside
}

export const resolveDistrictFromCoordinates = (lat, lng) => {
  if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
    return null
  }

  for (const district of DISTRICT_GEOFENCES) {
    if (isPointInPolygon(lat, lng, district.polygon)) {
      return district.district
    }
  }

  return null
}

export const DISTRICT_BOUNDARIES = DISTRICT_GEOFENCES

export const isSupportedDistrict = (district) => SUPPORTED_DISTRICTS.includes(district) || district === 'ALL'
