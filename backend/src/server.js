import cors from 'cors'
import express from 'express'
import authRouter from './routes/auth.routes.js'
import adminRouter from './routes/admin.routes.js'
import reportsRouter from './routes/reports.routes.js'
import analyticsRouter from './routes/analytics.routes.js'
import mediaRouter from './routes/media.routes.js'
import { env } from './config/env.js'
import { initializeDatabase } from './config/initDb.js'
import { seedCoreData } from './config/seedCoreData.js'
import { seedSuperAdmin } from './config/seedSuperAdmin.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors({ origin: env.frontendOrigin, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/media', mediaRouter)

app.use(errorHandler)

const startServer = async () => {
  await initializeDatabase()
  await seedSuperAdmin()
  await seedCoreData()

  app.listen(env.port, () => {
    console.log(`RoadWatch API running on http://localhost:${env.port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start RoadWatch API', error)
  process.exit(1)
})
