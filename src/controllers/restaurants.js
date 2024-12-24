import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import { Restaurants, User } from '../models'
import { asyncMiddleware } from '../middlewares'
import {
  getAllRestaurantsService,
  getRestaurantDetailsService,
  likeRestaurantService,
  dislikeRestaurantService,
  searchRestaurantService,
  getLikedRestaurantService,
} from '../services'
export const CONTROLLER_RESTAURANTS = {
  getAllRestaurants: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const category = req.query.category

    const restaurants = await getAllRestaurantsService(userId, category)
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

    const result = await getRestaurantDetailsService(restaurantId, mealTypeFilter)

    if (result.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No restaurant or menu items found' })
    }

    return res.status(StatusCodes.OK).json({
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
      statusCode: StatusCodes.OK,
    })
  }),

  likeRestaurant: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    const { restaurantId } = req.body

    const result = await likeRestaurantService(userId, restaurantId)
    return res.status(result.statusCode).json({
      message: result.message,
    })
  }),

  dislikeRestaurant: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const { restaurantId } = req.body

    const result = await dislikeRestaurantService(userId, restaurantId)
    return res.status(result.statusCode).json({
      message: result.message,
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

    const restaurants = await searchRestaurantService(campus, searchRegex)
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
    const likedRestaurants = await getLikedRestaurantService(userId)
    return res.status(StatusCodes.OK).json({
      likedRestaurants,
      statusCode: StatusCodes.OK,
      message: 'Liked restaurants fetched successfully',
    })
  }),
}
