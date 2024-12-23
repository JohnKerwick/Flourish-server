// * Libraries
import { Router } from 'express'

// * Controllers
import { CONTROLLER_SCRAPPER } from '../controllers'

// * Utilities
// import { validateRegistration } from '../models/User'
// import { USER_PERMISSIONS, USER_ROLE } from '../utils/user'
// * Middlewares

const router = Router()

router.get('/', CONTROLLER_SCRAPPER.scrapeAllMenus)

export default router
