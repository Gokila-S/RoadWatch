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

export default mediaRouter
