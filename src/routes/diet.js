// * Libraries
import express, { Router } from 'express'

// * Controllers
// import { CONTROLLER_DIET } from '../controllers'
import { CONTROLLER_DIET, CONTROLLER_NOTIFICATION } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'

// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

// Zeal App User Routes

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
router.get(
  '/update-status',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.updateDietStatus
)

export default router
