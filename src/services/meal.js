import { StatusCodes } from 'http-status-codes'
import { Meals, User } from '../models'

export const likeMealService = async (restaurantId, mealId, userId) => {
  const meal = await Meals.findById(mealId)
  const user = await User.findById(userId)

  if (!meal || !user) {
    return { error: 'Meal or User not found', statusCode: StatusCodes.NOT_FOUND }
  }

  if (meal.likedBy.includes(userId)) {
    return { message: 'Meal already liked', statusCode: StatusCodes.OK }
  }

  await Meals.findByIdAndUpdate(mealId, { $addToSet: { likedBy: userId } }, { new: true })
  await User.findByIdAndUpdate(userId, { $addToSet: { likedMeals: { restaurantId, mealId } } }, { new: true })

  return { message: 'Meal liked successfully', statusCode: StatusCodes.OK }
}

export const dislikeMealService = async (mealId, userId) => {
  const meal = await Meals.findById(mealId)
  const user = await User.findById(userId)

  if (!meal || !user) {
    return { error: 'Meal or User not found', statusCode: StatusCodes.NOT_FOUND }
  }

  if (!meal.likedBy.includes(userId)) {
    return { message: 'Meal was not liked', statusCode: StatusCodes.OK }
  }

  await Meals.findByIdAndUpdate(mealId, { $pull: { likedBy: userId } }, { new: true })
  await User.findByIdAndUpdate(userId, { $pull: { likedMeals: { mealId } } }, { new: true })

  return { message: 'Meal disliked successfully', statusCode: StatusCodes.OK }
}

export const getLikedMealsService = async (userId) => {
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

  if (!user) {
    return { error: 'User not found', statusCode: StatusCodes.NOT_FOUND }
  }

  return { likedMeals: user.likedMeals, statusCode: StatusCodes.OK }
}
