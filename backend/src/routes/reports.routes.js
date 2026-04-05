import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { createReport, listReports, updateReportStatus } from '../controllers/reports.controller.js'

const reportsRouter = Router()

reportsRouter.get('/', authenticate, listReports)
reportsRouter.post('/', authenticate, createReport)
reportsRouter.patch('/:id/status', authenticate, updateReportStatus)

export default reportsRouter
