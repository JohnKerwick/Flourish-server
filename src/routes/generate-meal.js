// * Libraries
import { Router } from 'express'
import { CONTROLLER_GENERATE } from '../controllers'

// * Controllers

const router = Router()

router.get('/manual', CONTROLLER_GENERATE.generateMealManually)

export default router
