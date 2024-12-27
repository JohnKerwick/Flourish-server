import { StatusCodes } from 'http-status-codes'
import { asyncMiddleware } from '../middlewares'
import { Diet } from '../models'
import jwt from 'jsonwebtoken'
const admin = require('firebase-admin')
export const CONTROLLER_NOTIFICATION = {
  getUsersWithActiveDiet: async (req, res) => {
    const today = new Date()

    const activeDiets = await Diet.find({
      createdAt: { $lte: today }, // Diets created on or before today
      expiresAt: { $gte: today }, // Diets not expired yet
    })

      .populate({
        path: 'dietOwner',
        model: 'User',
        select: 'name fcmToken',
      })
      .select('name')

    // // Transform the data to include only the necessary details
    for (const diet of activeDiets) {
      if (diet.dietOwner && diet.dietOwner.fcmToken) {
        const message = {
          notification: {
            title: diet.name,
            body: 'Update Status of Your Diet',
          },
          token: diet.dietOwner.fcmToken,
        }

        await admin.messaging().send(message)
        console.log(`Notification sent to ${diet.dietOwner.name} for diet: ${diet.name}`)
      }
    }

    return res.status(StatusCodes.OK).json({
      activeDiets,
      statusCode: StatusCodes.OK,
    })
  },
}
