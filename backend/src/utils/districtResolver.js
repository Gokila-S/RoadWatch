const DISTRICT_CENTROIDS = [
  { district: 'Chennai Region', lat: 13.0358, lng: 77.597 },
  { district: 'Trichy Region', lat: 12.9716, lng: 77.607 },
  { district: 'Madurai Region', lat: 12.956, lng: 77.641 },
  { district: 'Coimbatore Region', lat: 12.889, lng: 77.574 },
  { district: 'Salem Region', lat: 12.95, lng: 77.53 },
]

const isValidCoordinate = (value) => Number.isFinite(value)

const toRadians = (value) => (value * Math.PI) / 180

const haversineDistanceKm = (aLat, aLng, bLat, bLng) => {
  const earthRadiusKm = 6371
  const dLat = toRadians(bLat - aLat)
  const dLng = toRadians(bLng - aLng)
  const lat1 = toRadians(aLat)
  const lat2 = toRadians(bLat)

  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)

  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  const centralAngle = 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))

  return earthRadiusKm * centralAngle
}

export const resolveDistrictFromCoordinates = (lat, lng) => {
  if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
    return null
  }

  let nearest = DISTRICT_CENTROIDS[0]
  let shortestDistance = haversineDistanceKm(lat, lng, nearest.lat, nearest.lng)

  for (const candidate of DISTRICT_CENTROIDS.slice(1)) {
    const distance = haversineDistanceKm(lat, lng, candidate.lat, candidate.lng)
    if (distance < shortestDistance) {
      nearest = candidate
      shortestDistance = distance
    }
  }

  return nearest.district
}
