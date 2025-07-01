// * Libraries
import { Router } from 'express'
import { CONTROLLER_GENERATE_MEAL } from '../controllers'

// * Controllers

const router = Router()

router.post('/', CONTROLLER_GENERATE_MEAL.generateMeals)
router.post('/testing', CONTROLLER_GENERATE_MEAL.generateMealsTesting)
router.get('/manual', CONTROLLER_GENERATE_MEAL.generateMealsManually)

export default router
