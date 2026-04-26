export const FALLBACK_IMAGES = {
  pothole: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80",
  crack: "https://images.unsplash.com/photo-1584464436224-118bd3144f80?auto=format&fit=crop&w=400&q=80",
  default: "https://images.unsplash.com/photo-1447065972825-f71661d4a04d?auto=format&fit=crop&w=400&q=80"
}

export const getReportImage = (report) => {
  const url = report?.images?.[0]
  if (url && !url.includes('placeholder')) return url;
  return FALLBACK_IMAGES[report.category] || FALLBACK_IMAGES.default
}
