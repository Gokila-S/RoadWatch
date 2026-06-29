import cors from 'cors'
import express from 'express'
import net from 'net'
import authRouter from './routes/auth.routes.js'
import adminRouter from './routes/admin.routes.js'
import reportsRouter from './routes/reports.routes.js'
import analyticsRouter from './routes/analytics.routes.js'
import mediaRouter from './routes/media.routes.js'
import announcementsRouter from './routes/announcements.routes.js'
import { env } from './config/env.js'
import { initializeDatabase } from './config/initDb.js'
import { seedCoreData } from './config/seedCoreData.js'
import { seedSuperAdmin } from './config/seedSuperAdmin.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isPortInUse = (port) => new Promise((resolve) => {
  const tester = net.createServer()

  tester.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      resolve(true)
      return
    }

    resolve(false)
  })

  tester.once('listening', () => {
    tester.close(() => resolve(false))
  })

  tester.listen(port, '0.0.0.0')
})

const bootstrapDatabase = async () => {
  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await initializeDatabase()
      await seedSuperAdmin()
      await seedCoreData()
      return
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts
      console.error(
        `Database bootstrap attempt ${attempt}/${maxAttempts} failed:`,
        error?.message || error,
      )

      if (isLastAttempt) {
        throw error
      }

      // Exponential backoff: 2s, 4s, 8s, 16s
      await sleep(2 ** attempt * 1000)
    }
  }
}

const allowedOrigins = env.frontendOrigin.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/media', mediaRouter)
app.use('/api/announcements', announcementsRouter)

app.use(errorHandler)

const startServer = async () => {
  if (await isPortInUse(env.port)) {
    console.error(`Port ${env.port} is already in use. Stop the existing RoadWatch API process before starting another instance.`)
    return
  }

  await bootstrapDatabase()

  const server = app.listen(env.port, () => {
    console.log(`RoadWatch API running on http://localhost:${env.port}`)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use. Stop the existing RoadWatch API process before starting another instance.`)
      return
    }

    throw error
  })
}

startServer().catch((error) => {
  console.error('Failed to start RoadWatch API', error)
  process.exit(1)
})
