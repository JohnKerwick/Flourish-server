import { Restaurants, User } from '../models'
import { toObjectId } from '../utils/misc'
import { StatusCodes } from 'http-status-codes'
export const getAllRestaurantsService = async (userId, category) => {
  const user = await User.findById(userId).select('student')
  const campus = user.student.school
  return await Restaurants.find({
    campus,
    category,
  })
    .select('name id tabItems campus category likedBy')
    .lean()
}

export const getRestaurantDetailsService = async (restaurantId, mealTypeFilter) => {
  const result = await Restaurants.aggregate([
    { $match: { _id: toObjectId(restaurantId) } },
    { $unwind: '$menu' },
    {
      $lookup: {
        from: 'meals',
        localField: 'menu.items',
        foreignField: '_id',
        as: 'mealDetails',
      },
    },
    { $unwind: { path: '$mealDetails', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$menu.category',
        meals: { $push: '$mealDetails' },
        restaurantName: { $first: '$name' },
        campus: { $first: '$campus' },
        tabItems: { $first: '$tabItems' },
        restaurantCategory: { $first: '$category' },
        restaurantId: { $first: '$_id' },
      },
    },
    {
      $project: {
        category: '$_id',
        meals: 1,
        restaurantName: 1,
        campus: 1,
        tabItems: 1,
        restaurantId: 1,
        restaurantCategory: 1,
        _id: 0,
      },
    },
  ])

  if (mealTypeFilter) {
    result.forEach((group) => {
      group.meals = group.meals.filter((meal) => meal.type === mealTypeFilter)
    })

    return result.filter((group) => group.meals.length > 0)
  }

  return result
}

export const likeRestaurantService = async (userId, restaurantId) => {
  const user = await User.findById(userId)
  if (user.likedRestaurants.includes(restaurantId)) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'Restaurant already liked by user',
    }
  }

  const restaurant = await Restaurants.findById(restaurantId)
  if (restaurant.likedBy.includes(userId)) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'User already liked restaurant',
    }
  }

  await User.updateOne({ _id: userId }, { $push: { likedRestaurants: restaurantId } })
  await Restaurants.updateOne({ _id: restaurantId }, { $push: { likedBy: userId } })
  return { statusCode: StatusCodes.OK, message: 'Restaurant liked successfully' }
}

export const dislikeRestaurantService = async (userId, restaurantId) => {
  const user = await User.findById(userId)
  if (!user.likedRestaurants.includes(restaurantId)) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'Already disliked by user',
    }
  }

  const restaurant = await Restaurants.findById(restaurantId)
  if (!restaurant.likedBy.includes(userId)) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'Already disliked by User',
    }
  }

  await User.updateOne({ _id: userId }, { $pull: { likedRestaurants: restaurantId } })
  await Restaurants.updateOne({ _id: restaurantId }, { $pull: { likedBy: userId } })
  return { statusCode: StatusCodes.OK, message: 'Restaurant disliked successfully' }
}

export const searchRestaurantService = async (campus, searchRegex) => {
  return await Restaurants.find({
    campus,
    name: searchRegex,
  })
    .select('name id campus tabItems likedBy')
    .lean()
}

export const getLikedRestaurantService = async (userId) => {
  const user = await User.findById(userId)
    .populate({
      path: 'likedRestaurants',
      model: 'Restaurant',
      select: '-menu',
    })
    .lean()
  return user.likedRestaurants
}
