import { Router } from 'express'
import multer from 'multer'
import { uploadReportMedia } from '../controllers/media.controller.js'
import { authenticate } from '../middleware/auth.js'

const mediaRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
})

mediaRouter.post('/upload', authenticate, upload.single('file'), uploadReportMedia)
// Run AI classification on a single image without storing — used for quick client-side scans
mediaRouter.post('/scan', authenticate, upload.single('file'), async (req, res, next) => {
  // Lazy-load controller to avoid circular deps in tests
  try {
    const { classifyImage } = await import('../utils/aiFilter.js')
    const file = req.file
    if (!file) return res.status(400).json({ message: 'Image file is required' })
    const aiResult = await classifyImage(file.buffer, file.originalname)
    return res.json({ ai: aiResult })
  } catch (err) {
    return next(err)
  }
})

export default mediaRouter
