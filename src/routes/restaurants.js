// * Libraries
import express, { Router } from 'express'

// * Controllers
import { CONTROLLER_RESTAURANTS } from '../controllers'

// * Middlewares
import { permitMiddleware, Authenticate } from '../middlewares'
import { USER_TYPES } from '../utils'

const router = Router()

router.get(
  '/',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.getAllRestaurants
)
router.get(
  '/restaurant-details',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.getRestaurantDetails
)

router.post(
  '/like-restaurant',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.likeRestaurant
)

router.post(
  '/dislike-restaurant',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.dislikeRestaurant
)

router.get(
  '/search-restaurant',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.searchRestaurants
)

router.get(
  '/get-liked-restaurants',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_RESTAURANTS.getLikedRestaurants
)
export default router
