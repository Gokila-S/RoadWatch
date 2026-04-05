import { Router } from 'express'
import { getAnalytics } from '../controllers/analytics.controller.js'
import { authenticate, authorizeRoles } from '../middleware/auth.js'

const analyticsRouter = Router()

analyticsRouter.get('/', authenticate, authorizeRoles('district_admin', 'super_admin'), getAnalytics)

export default analyticsRouter
