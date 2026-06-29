/**
 * aiFilter.js
 * Sends a raw image buffer to the Python AI microservice and returns the
 * classification result. Throws a structured error on network / model issues.
 */

import FormData from 'form-data'
import fetch from 'node-fetch'
import { env } from '../config/env.js'

/**
 * @typedef {Object} AiFilterResult
 * @property {'road_damage'|'not_road'} prediction  - Class label
 * @property {number}   confidence   - Confidence score in [0, 1]
 * @property {boolean}  store_in_db  - True only when prediction === 'road_damage' && confidence >= 0.80
 */

/**
 * Run the AI road-damage classifier on the given image buffer.
 *
 * @param {Buffer} imageBuffer   - Raw image bytes (jpg / png / webp)
 * @param {string} originalName  - Original filename (used to set the correct mime)
 * @returns {Promise<AiFilterResult>}
 */
export async function classifyImage(imageBuffer, originalName = 'image.jpg') {
  let response
  let attempt = 0
  const maxAttempts = 3
  try {
    // Node runtimes differ in support for AbortSignal.timeout — use AbortController
    while (attempt < maxAttempts) {
      attempt += 1
      const form = new FormData()
      form.append('image', imageBuffer, {
        filename: originalName,
        contentType: guessMime(originalName),
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30_000)

      try {
        response = await fetch(`${env.aiServiceUrl}/predict`, {
          method: 'POST',
          body: form,
          headers: form.getHeaders(),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (response.status !== 429 || attempt >= maxAttempts) {
        break
      }

      const retryAfterHeader = Number(response.headers.get('retry-after'))
      const retryDelayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 1000 * attempt

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  } catch (networkErr) {
    const isTimeout = networkErr?.name === 'AbortError' || networkErr?.name === 'TimeoutError'
    const msg = isTimeout
      ? 'AI service timed out. Please try again.'
      : `AI service is unreachable. Ensure the model server is running (${env.aiServiceUrl}).`
    throw Object.assign(new Error(msg), { status: 503, code: 'AI_UNAVAILABLE' })
  }

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const isRateLimited = response.status === 429
    const msg = body?.error || `AI service returned HTTP ${response.status}`
    throw Object.assign(new Error(msg), {
      status: isRateLimited ? 503 : 502,
      code: isRateLimited ? 'AI_RATE_LIMIT' : 'AI_ERROR',
    })
  }

  return {
    prediction: body.prediction,
    confidence: body.confidence,
    store_in_db: body.store_in_db,
  }
}

/** Best-effort mime-type from file extension */
function guessMime(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase()
  return {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    bmp: 'image/bmp',
  }[ext] ?? 'image/jpeg'
}
