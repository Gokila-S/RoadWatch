import { Router } from 'express'
import {
  createAnnouncement,
  deleteAnnouncement,
  getRelatedAnnouncements,
  listAnnouncements,
} from '../controllers/announcements.controller.js'
import { authenticate, authorizeRoles } from '../middleware/auth.js'

const announcementsRouter = Router()

announcementsRouter.get('/', authenticate, listAnnouncements)
announcementsRouter.get('/related', authenticate, getRelatedAnnouncements)
announcementsRouter.post('/', authenticate, authorizeRoles('district_admin', 'super_admin'), createAnnouncement)
announcementsRouter.delete('/:id', authenticate, authorizeRoles('district_admin', 'super_admin'), deleteAnnouncement)

export default announcementsRouter
