// * Libraries
import { Router } from 'express'

// * Controllers
import { CONTROLLER_SCRAPPER } from '../controllers'

const router = Router()

router.get('/', CONTROLLER_SCRAPPER.scrapeAllMenus)

export default router
