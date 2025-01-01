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
    // console.log('id', id)
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
    console.log(id)

    let body = JSON.parse(req.body.body)

    body = {
      file: req.file && req.file.path,
      ...body,
    }
    console.log(body)
    const user = await User.findByIdAndUpdate(id, body, { new: true }).select('-password -refreshToken').lean()

    if (!user)
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })

    res.status(StatusCodes.OK).json({
      data: user,
      message: 'Profile updated Successfully',
    })
  }),

  home: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const category = req.query.category

    const userId = decoded?._id
    const user = await User.findById(userId).select('student')
    const campus = user.student.school
    const date = Date.now()
    const restaurants = await Restaurants.find({
      campus,
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
    console.log(userId)

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
