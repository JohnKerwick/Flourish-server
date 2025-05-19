// * Libraries
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

// * Models
import { User, Restaurants, Diet, Meals } from '../models'
const { ObjectId } = mongoose.Types

// * Middlewares
import { asyncMiddleware } from '../middlewares'

export const CONTROLLER_USER = {
  profile: asyncMiddleware(async (req, res) => {
    const { _id } = req.decoded
    const id = req.query.id

    let userId
    if (id) {
      userId = id
    } else userId = _id

    const user = await User.findByIdAndUpdate(
      userId,
      { lastActive: new Date() }, // the update operation
      { new: true } // options for the update operation
    )
      .select('-password -role -userTypes -refreshTokens') // selecting fields to exclude
      .lean()

    if (!user)
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })

    res.status(StatusCodes.OK).json({
      data: {
        user,
      },
      message: 'Profiles Fetched Successfully',
    })
  }),

  updateProfile: asyncMiddleware(async (req, res) => {
    const id = req.query.id

    let body = JSON.parse(req.body.body)

    body = {
      file: req.file && req.file.path,
      ...body,
    }
    const existingUser = await User.findById(id).lean()
    if (!existingUser) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    if (existingUser.student && body.student) {
      if (body.student.school && body.student.school !== existingUser.student.school) {
        if (existingUser.likedMeals?.length) {
          await Meals.updateMany(
            { _id: { $in: existingUser.likedMeals.map((meal) => meal.mealId) } },
            { $pull: { likedBy: id } }
          )
        }
        if (existingUser.likedRestaurants?.length) {
          await Restaurants.updateMany({ _id: { $in: existingUser.likedRestaurants } }, { $pull: { likedBy: id } })
        }
        body.likedMeals = []
        body.likedRestaurants = []
      }
    }

    const user = await User.findByIdAndUpdate(id, body, {
      new: true,
    })
      .select('-password -refreshToken')
      .lean()

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    res.status(StatusCodes.OK).json({
      data: { user: user },
      message: 'Profile updated Successfully',
    })
  }),

  home: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const category = req.query.category

    const userId = decoded?._id
    const user = await User.findById(userId).select('student')
    const campus = user.student.school //hpu [hpu]
    const date = Date.now()
    const restaurants = await Restaurants.find({
      campus: { $in: campus },
      category,
    })
      .select('name id tabItems campus likedBy')
      .lean()

    const diet = await Diet.find({ dietOwner: userId, expiresAt: { $gte: date } })
      .select('name')
      .lean()

    res.status(StatusCodes.OK).json({
      data: { restaurants, diet },
      message: 'home info fetched successfully',
    })
  }),

  deleteUser: asyncMiddleware(async (req, res) => {
    const userId = req.query.id

    const session = await mongoose.startSession()
    session.startTransaction()

    const options = { session }

    await Restaurants.updateMany({ likedBy: userId }, { $pull: { likedBy: userId } }, options)
    await Meals.updateMany({ likedBy: userId }, { $pull: { likedBy: userId } }, options)
    await Diet.deleteMany({ dietOwner: userId }, options)
    await User.deleteOne({ _id: userId }, options)

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({
      message: 'User account and related references deleted successfully',
    })
  }),
}
