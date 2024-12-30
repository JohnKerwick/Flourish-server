import express, { Router } from 'express'
import { CONTROLLER_NOTIFICATION } from '../controllers'
import { permitMiddleware, Authenticate } from '../middlewares'
import { USER_TYPES } from '../utils'

const router = Router()
router.get(
  '/get',
  Authenticate(),
  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_NOTIFICATION.getUsersWithActiveDiet
)
export default router
