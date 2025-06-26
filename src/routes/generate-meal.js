// * Libraries
import { Router } from 'express'
import { CONTROLLER_GENERATE_MEAL } from '../controllers'

// * Controllers

const router = Router()

router.post('/', CONTROLLER_GENERATE_MEAL.generateMeals)
router.get('/manual', CONTROLLER_GENERATE_MEAL.generateMealsManually)

export default router
