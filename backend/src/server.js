import cors from 'cors'
import express from 'express'
import authRouter from './routes/auth.routes.js'
import adminRouter from './routes/admin.routes.js'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors({ origin: env.frontendOrigin, credentials: true }))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)

app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`RoadWatch API running on http://localhost:${env.port}`)
})
