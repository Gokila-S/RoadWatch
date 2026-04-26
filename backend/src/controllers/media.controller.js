import path from 'path'
import { pool } from '../config/db.js'
import { getSupabaseAdmin } from '../config/supabase.js'
import { env } from '../config/env.js'
import { classifyImage } from '../utils/aiFilter.js'

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
let bucketReady = false

const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_')

const ensureBucket = async (supabaseAdmin) => {
  if (bucketReady) return

  const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket(env.supabaseStorageBucket)

  if (!bucketError && bucket) {
    bucketReady = true
    return
  }

  const shouldCreate =
    String(bucketError?.message || '').toLowerCase().includes('not found') ||
    String(bucketError?.message || '').toLowerCase().includes('does not exist')

  if (!shouldCreate) {
    throw new Error(bucketError?.message || 'Could not verify storage bucket')
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(env.supabaseStorageBucket, {
    public: true,
    fileSizeLimit: '8MB',
    allowedMimeTypes: [...allowedMimeTypes],
  })

  if (createError && !String(createError.message || '').toLowerCase().includes('already exists')) {
    throw new Error(createError.message || `Could not create storage bucket '${env.supabaseStorageBucket}'`)
  }

  bucketReady = true
}

export const uploadReportMedia = async (req, res, next) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: 'Image file is required' })
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      return res.status(400).json({ message: 'Unsupported file type. Use JPG, PNG, WEBP, or HEIC.' })
    }

    // ── AI Road-Damage Filter ────────────────────────────────────────────────
    let aiResult
    try {
      aiResult = await classifyImage(file.buffer, file.originalname)
    } catch (aiErr) {
      // Surface AI service errors with appropriate status codes
      return res.status(aiErr.status || 503).json({
        message: aiErr.message,
        code: aiErr.code || 'AI_UNAVAILABLE',
      })
    }

    // Reject images that are not classified as road damage with ≥ 80 % confidence
    if (!aiResult.store_in_db) {
      return res.status(422).json({
        message:
          aiResult.prediction === 'not_road'
            ? `Image does not appear to show road damage (confidence: ${(aiResult.confidence * 100).toFixed(1)}%). Please upload a clear photo of the damaged road.`
            : `AI confidence too low (${(aiResult.confidence * 100).toFixed(1)}%). Please upload a clearer photo of the damaged road.`,
        code: 'AI_REJECTED',
        ai: {
          prediction: aiResult.prediction,
          confidence: aiResult.confidence,
        },
      })
    }
    // ────────────────────────────────────────────────────────────────────────

    await ensureBucket(supabaseAdmin)

    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg'
    const fileName = sanitizeFileName(path.basename(file.originalname || `capture${ext}`, ext))
    const storagePath = `${req.user.sub}/${Date.now()}-${fileName}${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(env.supabaseStorageBucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      })

    if (uploadError) {
      return res.status(500).json({ message: uploadError.message || 'Failed to upload image to storage' })
    }

    const { data } = supabaseAdmin.storage.from(env.supabaseStorageBucket).getPublicUrl(storagePath)

    const mediaInsert = await pool.query(
      `
      INSERT INTO report_media_uploads (
        uploaded_by,
        storage_path,
        public_url,
        mime_type,
        original_name,
        ai_prediction,
        ai_confidence,
        verified_by_model
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING id, created_at
      `,
      [
        req.user.sub,
        storagePath,
        data.publicUrl,
        file.mimetype,
        file.originalname || 'upload.jpg',
        aiResult.prediction,
        aiResult.confidence,
      ],
    )

    return res.status(201).json({
      message: 'Media uploaded successfully',
      media: {
        id: mediaInsert.rows[0].id,
        path: storagePath,
        url: data.publicUrl,
        createdAt: mediaInsert.rows[0].created_at,
      },
      ai: {
        prediction: aiResult.prediction,
        confidence: aiResult.confidence,
      },
    })
  } catch (error) {
    return next(error)
  }
}
