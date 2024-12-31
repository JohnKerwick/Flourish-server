// * Libraries
import express, { Router } from 'express'

// * Controllers

import { CONTROLLER_DIET } from '../controllers'

// * Middlewares
import { permitMiddleware, Authenticate } from '../middlewares'
import { USER_TYPES } from '../utils'

const router = Router()

router.get(
  '/diet-plan',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.getWeeklyDietPlan
)
router.post(
  '/create-diet-plan',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.createWeeklyDietPlan
)
router.get(
  '/get-diet-details',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.getWeeklydietPlanDetails
)
router.get(
  '/get-diet-history',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.getDietHistory
)
router.post(
  '/update-status',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.updateDietStatus
)

export default router
