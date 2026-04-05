import path from 'path'
import { getSupabaseAdmin } from '../config/supabase.js'
import { env } from '../config/env.js'

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

    await ensureBucket(supabaseAdmin)

    if (!file) {
      return res.status(400).json({ message: 'Image file is required' })
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      return res.status(400).json({ message: 'Unsupported file type. Use JPG, PNG, WEBP, or HEIC.' })
    }

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

    return res.status(201).json({
      message: 'Media uploaded successfully',
      media: {
        path: storagePath,
        url: data.publicUrl,
      },
    })
  } catch (error) {
    return next(error)
  }
}
