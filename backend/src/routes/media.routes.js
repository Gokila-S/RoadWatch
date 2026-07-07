import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { uploadReportMedia } from '../controllers/media.controller.js'
import { authenticate } from '../middleware/auth.js'

const mediaRouter = Router()

// In-memory short-lived cache for scan results keyed by file SHA256.
// This avoids re-invoking the AI model twice when the client first calls
// `/api/media/scan` and then uploads the same image via `/api/media/upload`.
const scanCache = new Map() // map: hash -> { result, expires }
const SCAN_TTL_MS = 10 * 60 * 1000 // 10 minutes

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
})

// Middleware: if a matching recent scan exists, attach it to req.aiScanResult
const attachScanResultIfAny = async (req, res, next) => {
  try {
    const file = req.file
    if (!file || !file.buffer) return next()
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex')
    const entry = scanCache.get(hash)
    if (entry && entry.expires > Date.now()) {
      req.aiScanResult = entry.result
    } else {
      scanCache.delete(hash)
    }
    return next()
  } catch (err) {
    return next(err)
  }
}

// Upload route reuses any cached scan result when available to avoid duplicate AI calls.
mediaRouter.post('/upload', authenticate, upload.single('file'), attachScanResultIfAny, uploadReportMedia)

// Run AI two-stage pipeline on a single image without storing — used for quick client-side scans
mediaRouter.post('/scan', authenticate, upload.single('file'), async (req, res, next) => {
  // Lazy-load controller to avoid circular deps in tests
  try {
    const { classifyImagePipeline } = await import('../utils/aiFilter.js')
    const file = req.file
    if (!file) return res.status(400).json({ message: 'Image file is required' })

    const pipelineResult = await classifyImagePipeline(file.buffer, file.originalname)

    // store in cache keyed by file content hash (use stage1 result for upload compatibility)
    try {
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex')
      scanCache.set(hash, {
        result: {
          prediction: pipelineResult.prediction,
          confidence: pipelineResult.confidence,
          store_in_db: pipelineResult.store_in_db,
        },
        expires: Date.now() + SCAN_TTL_MS,
      })
    } catch (e) {
      // Non-fatal: continue if hashing fails
      console.error('Failed to store scan cache:', e)
    }

    return res.json({
      ai: {
        prediction: pipelineResult.prediction,
        confidence: pipelineResult.confidence,
        store_in_db: pipelineResult.store_in_db,
      },
      stage1: pipelineResult.stage1,
      stage2: pipelineResult.stage2,
      final_label: pipelineResult.final_label,
      scanId: null,
    })
  } catch (err) {
    return next(err)
  }
})

// Periodic cleanup of expired cache entries
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of scanCache) {
    if (v.expires <= now) scanCache.delete(k)
  }
}, 60 * 1000)

export default mediaRouter
