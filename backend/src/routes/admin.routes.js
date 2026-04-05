import { Router } from 'express'
import { createDistrictAdmin, listDistrictAdmins } from '../controllers/admin.controller.js'
import { authenticate, authorizeRoles } from '../middleware/auth.js'

const adminRouter = Router()

adminRouter.get(
  '/district-admins',
  authenticate,
  authorizeRoles('super_admin'),
  listDistrictAdmins,
)

adminRouter.post(
  '/district-admins',
  authenticate,
  authorizeRoles('super_admin'),
  createDistrictAdmin,
)

export default adminRouter
