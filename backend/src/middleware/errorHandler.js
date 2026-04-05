export const errorHandler = (err, req, res, next) => {
  console.error(err)

  if (res.headersSent) {
    return next(err)
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Image too large. Please upload a file under 8MB.' })
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload is too large.' })
  }

  return res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  })
}
