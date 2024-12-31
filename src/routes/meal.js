// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_MEAL } from '../controllers'
// * Middlewares
import { permitMiddleware, Authenticate } from '../middlewares'
import { USER_TYPES } from '../utils'

const router = Router()

router.post(
  '/like-meal',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_MEAL.likeMeal
)

router.post(
  '/dislike-meal',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_MEAL.dislikeMeal
)

router.get(
  '/get-liked-meals',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_MEAL.getLikedMeals
)
export default router
