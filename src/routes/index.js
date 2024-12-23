import { Router } from 'express'
import userRoutes from './user'
import authRoutes from './auth'
import followRoutes from './follow'
import postRoutes from './post'
import commentRoutes from './comment'
import groupRoutes from './group'
import challengeRoutes from './challenge'
import exerciseRoutes from './exercise'
import badgeRoutes from './badge'
import progressRoutes from './progress'
import errorRoutes from './error'
import dietRoutes from './diet'
import restaurantsRoutes from './restaurants'
import scrapperRoutes from './scrapper'
import mealRoutes from './meal'

const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/follow', followRoutes)
router.use('/post', postRoutes)
router.use('/comment', commentRoutes)
router.use('/group', groupRoutes)
router.use('/challenge', challengeRoutes)
router.use('/exercise', exerciseRoutes)
router.use('/badge', badgeRoutes)
router.use('/progress', progressRoutes)
router.use('/error', errorRoutes)
router.use('/restaurants', restaurantsRoutes)
router.use('/diet', dietRoutes)
router.use('/scrapper', scrapperRoutes)
router.use('/meal', mealRoutes)

export default router
