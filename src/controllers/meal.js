import { StatusCodes } from 'http-status-codes'
import { Meals, User } from '../models'
import { asyncMiddleware } from '../middlewares'
import jwt from 'jsonwebtoken'
export const CONTROLLER_MEAL = {
  likeMeal: asyncMiddleware(async (req, res) => {
    const { restaurantId, mealId, userId } = req.body

    const meal = await Meals.findById(mealId)
    const user = await User.findById(userId)

    if (!meal || !user) {
      return res.status(404).json({
        message: 'Meal or User not found',
        statusCode: StatusCodes.NOT_FOUND,
      })
    }

    if (meal.likedBy.includes(userId)) {
      return res.status(200).json({
        message: 'Meal already liked',
        statusCode: StatusCodes.OK,
      })
    }

    await Meals.findByIdAndUpdate(mealId, { $addToSet: { likedBy: userId } }, { new: true })
    await User.findByIdAndUpdate(userId, { $addToSet: { likedMeals: { restaurantId, mealId } } }, { new: true })

    return res.status(200).json({
      message: 'Meal liked successfully',
      statusCode: StatusCodes.OK,
    })
  }),

  dislikeMeal: asyncMiddleware(async (req, res) => {
    const { mealId, userId } = req.body

    const meal = await Meals.findById(mealId)
    const user = await User.findById(userId)

    if (!meal || !user) {
      return res.status(404).json({
        message: 'Meal or User not found',
        statusCode: StatusCodes.NOT_FOUND,
      })
    }

    if (!meal.likedBy.includes(userId)) {
      return res.status(200).json({
        message: 'Meal was not liked',
        statusCode: StatusCodes.OK,
      })
    }

    await Meals.findByIdAndUpdate(mealId, { $pull: { likedBy: userId } }, { new: true })
    await User.findByIdAndUpdate(userId, { $pull: { likedMeals: { mealId } } }, { new: true })

    return res.status(200).json({
      message: 'Meal disliked successfully',
      statusCode: StatusCodes.OK,
    })
  }),

  getLikedMeals: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    const user = await User.findById(userId)
      .populate({
        path: 'likedMeals.restaurantId',
        model: 'Restaurant',
        select: 'name id',
      })
      .populate({
        path: 'likedMeals.mealId',
        model: 'Meal',
        select: 'name',
      })
      .lean()

    const likedMeals = user.likedMeals

    return res.status(StatusCodes.OK).json({
      likedMeals,
      statusCode: StatusCodes.OK,
      message: 'Liked meals fetched successfully',
    })
  }),
}
