import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import { Restaurants, User } from '../models'
import { asyncMiddleware } from '../middlewares'
import { toObjectId } from '../utils/misc'

export const CONTROLLER_RESTAURANTS = {
  getAllRestaurants: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const category = req.query.category

    const userId = decoded?._id
    const user = await User.findById(userId).select('student')
    const campus = user.student.school
    const restaurants = await Restaurants.find({
      campus,
      category,
    })
      .select('name id tabItems campus likedBy')
      .lean()

    if (!restaurants.length) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No restaurants found for this campus' })
    }

    return res.status(StatusCodes.OK).json({
      restaurants,
      statusCode: StatusCodes.OK,
      message: 'Restaurants fetched successfully',
    })
  }),

  getRestaurantDetails: asyncMiddleware(async (req, res) => {
    const restaurantId = req.query.id
    const mealTypeFilter = req.query.mealType && req.query.mealType !== 'All' ? req.query.mealType : null

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
        $addFields: {
          filteredMealType: mealTypeFilter ? mealTypeFilter : { $arrayElemAt: ['$tabItems', 0] },
        },
      },

      {
        $match: {
          $expr: {
            $eq: ['$mealDetails.type', '$filteredMealType'],
          },
        },
      },

      {
        $group: {
          _id: '$menu.category',
          meals: { $push: '$mealDetails' },
          restaurantName: { $first: '$name' },
          campus: { $first: '$campus' },
          tabItems: { $first: '$tabItems' },
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
          _id: 0,
        },
      },
    ])

    if (result.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No restaurant or menu items found' })
    }

    return res.status(200).json({
      restaurant: {
        name: result[0].restaurantName,
        campus: result[0].campus,
        tabItems: result[0].tabItems,
        _id: result[0].restaurantId,
      },
      menu: result.map((item) => ({
        category: item.category,
        items: item.meals,
      })),
      message: 'Restaurant details fetched successfully',
      statusCode: 200,
    })
  }),

  likeRestaurant: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User not found in token' })
    }

    const { restaurantId } = req.body

    // Check if the user has already liked this restaurant
    const user = await User.findById(userId)
    if (user.likedRestaurants.includes(restaurantId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Restaurant already liked by user' })
    }

    // Check if the restaurant has already liked this user
    const restaurant = await Restaurants.findById(restaurantId)
    if (restaurant.likedBy.includes(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User already liked by restaurant' })
    }

    // Add the restaurant to the user's likedRestaurants array
    await User.updateOne({ _id: userId }, { $push: { likedRestaurants: restaurantId } })

    // Add the user to the restaurant's likedBy array
    await Restaurants.updateOne({ _id: restaurantId }, { $push: { likedBy: userId } })

    return res.status(StatusCodes.OK).json({
      message: 'Restaurant liked successfully',
    })
  }),

  dislikeRestaurant: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const { restaurantId } = req.body

    const user = await User.findById(userId)
    if (!user.likedRestaurants.includes(restaurantId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Already  disliked  by user' })
    }

    const restaurant = await Restaurants.findById(restaurantId)
    if (!restaurant.likedBy.includes(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Already disliked by User' })
    }

    await User.updateOne({ _id: userId }, { $pull: { likedRestaurants: restaurantId } })

    await Restaurants.updateOne({ _id: restaurantId }, { $pull: { likedBy: userId } })

    return res.status(StatusCodes.OK).json({
      message: 'Restaurant disliked successfully',
    })
  }),

  searchRestaurants: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await User.findById(userId).select('student')
    const campus = user.student.school
    const keyword = req.query.keyword
    const searchRegex = new RegExp(keyword, 'i')

    const restaurants = await Restaurants.find({
      campus,
      name: searchRegex,
    })
      .select('name id campus tabItems likedBy')
      .lean()
    if (!restaurants.length) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No restaurants found matching the search criteria',
        statusCode: StatusCodes.NOT_FOUND,
      })
    }
    return res.status(StatusCodes.OK).json({
      restaurants,
      statusCode: StatusCodes.OK,
      message: 'Search results fetched successfully',
    })
  }),

  getLikedRestaurants: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await User.findById(userId)
      .populate({
        path: 'likedRestaurants',
        model: 'Restaurant',
        select: '-menu',
      })
      .lean()
    const likedRestaurants = user.likedRestaurants

    return res.status(StatusCodes.OK).json({
      likedRestaurants,
      statusCode: StatusCodes.OK,
      message: 'Liked restaurants fetched successfully',
    })
  }),
}
