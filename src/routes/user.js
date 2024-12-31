// * Libraries
import { Router } from 'express'

// * Controllers
import { CONTROLLER_USER } from '../controllers'

// * Middlewares
import { permitMiddleware, Authenticate } from '../middlewares'
import { parser } from '../utils/cloudinary'
import { USER_TYPES } from '../utils'

const router = Router()

router.get(
  '/profile',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_USER.profile
)

router.put(
  '/profile-update',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  parser.single('file'),
  CONTROLLER_USER.updateProfile
)

router.get(
  '/home',
  Authenticate(),
  //  permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_USER.home
)

router.delete(
  '/delete-account',
  Authenticate(),
  // permitMiddleware([USER_TYPES.SYS, USER_TYPES.USR]),
  CONTROLLER_USER.deleteUser
)
export default router
