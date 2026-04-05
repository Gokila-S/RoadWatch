import { Router } from 'express'
import { login, me, signupCitizen } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'

const authRouter = Router()

authRouter.post('/signup/citizen', signupCitizen)
authRouter.post('/login', login)
authRouter.get('/me', authenticate, me)

export default authRouter
