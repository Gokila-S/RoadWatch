import { Router } from 'express'
import {
  createDistrictAdmin,
  listDistrictAdmins,
  updateDistrictAdmin,
  deleteDistrictAdmin,
} from '../controllers/admin.controller.js'
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

adminRouter.put(
  '/district-admins/:id',
  authenticate,
  authorizeRoles('super_admin'),
  updateDistrictAdmin,
)

adminRouter.delete(
  '/district-admins/:id',
  authenticate,
  authorizeRoles('super_admin'),
  deleteDistrictAdmin,
)

export default adminRouter
