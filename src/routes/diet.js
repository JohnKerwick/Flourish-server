// * Libraries
import express, { Router } from 'express'

// * Controllers
// ? new comment

import { CONTROLLER_DIET } from '../controllers'

// * Middlewares
import { permitMiddleware, Authenticate } from '../middlewares'
import { USER_TYPES } from '../utils'

const router = Router()

// router.post(
//   '/diet-plan',
//   Authenticate(),
//   // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_DIET.getWeeklyDietPlan
// )

router.post('/diet-plan-old', Authenticate(), CONTROLLER_DIET.createWeekPlan)

// ? NEW ALGO ROUTE
// /generate-meal-plan
router.post('/diet-plan', Authenticate(), CONTROLLER_DIET.generateMealPlanForWeek)
// ? NEW ALGO ROUTE END

router.post(
  '/create-diet-plan',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.createWeeklyDietPlan
)
// for testing
// router.post(
//   '/create-week-plan',
//   Authenticate(),
//   // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_DIET.createWeekPlan
// )
//  testing

router.get(
  '/get-diet-details',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.getWeeklydietPlanDetails
)
router.get(
  '/get-diet-history',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.getDietHistory
)
router.post(
  '/update-status',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_DIET.updateDietStatus
)

export default router
