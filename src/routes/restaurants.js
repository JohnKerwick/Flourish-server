// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_RESTAURANTS } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'
// * Middlewares
import { validateMiddleware, permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { totpRateLimiter } from '../utils/rateLimiter'
import { USER_TYPES } from '../utils'

const router = Router()

router.get(
  '/',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.getAllRestaurants
)
router.get(
  '/restaurant-details',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.getRestaurantDetails
)

router.post(
  '/like-restaurant',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.likeRestaurant
)

router.post(
  '/dislike-restaurant',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.dislikeRestaurant
)

router.get(
  '/search-restaurant',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.searchRestaurants
)

router.get(
  '/get-liked-restaurants',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.getLikedRestaurants
)

// router.post(
//   '/like-meal',
//   Authenticate(),
//   permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_RESTAURANTS.likeMeal
// )

// router.post(
//   '/dislike-meal',
//   Authenticate(),
//   permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
//   CONTROLLER_RESTAURANTS.dislikeMeal
// )

export default router
