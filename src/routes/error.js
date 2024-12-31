// * Libraries
import { Router } from 'express'

// * Middlewares
import { permitMiddleware, Authenticate } from '../middlewares'
import { USER_TYPES } from '../utils'
import { CONTROLLER_ERROR } from '../controllers/error'

const router = Router()

// Zeal App User Routes

router.post('/err-log', Authenticate(), permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]), CONTROLLER_ERROR.errorLog)

export default router
