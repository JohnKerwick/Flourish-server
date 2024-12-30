import { StatusCodes } from 'http-status-codes'
import { asyncMiddleware } from '../middlewares'
import { Notification } from '../models'
import jwt from 'jsonwebtoken'
const admin = require('firebase-admin')
export const CONTROLLER_NOTIFICATION = {
  getUsersWithActiveDiet: async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const id = decoded?._id

    const notifications = await Notification.find({ userId: id }).select('-createdAt -updatedAt -_id -userId').lean()

    return res.status(StatusCodes.OK).json({
      notifications,
      statusCode: StatusCodes.OK,
    })
  },
}
