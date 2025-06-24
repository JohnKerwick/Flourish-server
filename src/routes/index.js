import { Router } from 'express'
import authRoutes from './auth'
import dietRoutes from './diet'
import errorRoutes from './error'
import mealRoutes from './meal'
import restaurantsRoutes from './restaurants'
import scrapperRoutes from './scrapper'
import userRoutes from './user'
import notificationRoute from './notification'
import generateMealRoute from './generate-meal'

const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/error', errorRoutes)
router.use('/restaurants', restaurantsRoutes)
router.use('/diet', dietRoutes)
router.use('/scrapper', scrapperRoutes)
router.use('/meal', mealRoutes)
router.use('/generate-meal', generateMealRoute)
router.use('/notifications', notificationRoute)

export default router
