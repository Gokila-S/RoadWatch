import { Router } from 'express'
import { login, me, signupCitizen, changePassword } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'

const authRouter = Router()

authRouter.post('/signup/citizen', signupCitizen)
authRouter.post('/login', login)
authRouter.get('/me', authenticate, me)
authRouter.post('/change-password', authenticate, changePassword)

export default authRouter
