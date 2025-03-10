// * Libraries
import { Router } from 'express'

// * Controllers
import { CONTROLLER_SCRAPPER } from '../controllers'

const router = Router()

router.get('/', CONTROLLER_SCRAPPER.scrapeAllMenus)
router.get('/nutritionx', CONTROLLER_SCRAPPER.getNutritionixData)

export default router
