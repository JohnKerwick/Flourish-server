import { StatusCodes } from 'http-status-codes'
import { likeMealService, dislikeMealService, getLikedMealsService } from '../services'
import { asyncMiddleware } from '../middlewares'
import jwt from 'jsonwebtoken'

export const CONTROLLER_MEAL = {
  likeMeal: asyncMiddleware(async (req, res) => {
    const { restaurantId, mealId, userId } = req.body
    const result = await likeMealService(restaurantId, mealId, userId)

    if (result.error) {
      return res.status(result.statusCode).json({
        message: result.error,
        statusCode: result.statusCode,
      })
    }

    return res.status(result.statusCode).json(result)
  }),

  dislikeMeal: asyncMiddleware(async (req, res) => {
    const { mealId, userId } = req.body
    const result = await dislikeMealService(mealId, userId)

    if (result.error) {
      return res.status(result.statusCode).json({
        message: result.error,
        statusCode: result.statusCode,
      })
    }

    return res.status(result.statusCode).json(result)
  }),

  getLikedMeals: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    const result = await getLikedMealsService(userId)

    if (result.error) {
      return res.status(result.statusCode).json({
        message: result.error,
        statusCode: result.statusCode,
      })
    }

    return res.status(StatusCodes.OK).json({
      ...result,
      message: 'Liked meals fetched successfully',
    })
  }),
}
