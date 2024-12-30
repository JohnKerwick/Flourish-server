// Using ES6 module import syntax
import { schedule } from 'node-cron'
import { Notification, Diet } from '../models'
import { sendPushNotification } from './pushNotification'
const admin = require('firebase-admin')

// "0 0 * * 0", Every sunday at 00:00 - Required
// "59 14 * * 1", Every monday at 14:59
// "* * * * * *", Every second
// "* * * * *", Every minute
// 0 0 0 * * *, Every Midnight
// 0 0 * * *, every 24 hour

export const task = schedule(
  // '*/30 * * * * *',
  '0 10,14,20 * * *', // Runs at 10 AM, 2 PM, and 8 PM
  async () => {
    const currentHour = new Date().getHours()
    const today = new Date()
    const currentDay = today.toLocaleString('en-US', { weekday: 'long' }) // e.g., "Monday"
    let mealType

    // if (currentHour === 10) {
    //   mealType = 'Breakfast'
    // } else if (currentHour === 14) {
    //   mealType = 'Lunch'
    // } else if (currentHour === 20) {
    //   mealType = 'Dinner'
    // }

    // if (!mealType) return
    mealType = 'Dinner'

    console.log(`Sending notifications for ${mealType}`)

    const activeDiets = await Diet.find({
      createdAt: { $lte: today },
      expiresAt: { $gte: today },
      'dietplan.day': currentDay,
    })
      .populate({
        path: 'dietOwner',
        model: 'User',
        select: 'name fcmToken',
      })
      .select('name dietplan')

    for (const diet of activeDiets) {
      const dayPlan = diet.dietplan.find((plan) => plan.day === currentDay)
      const mealPlan = dayPlan?.item.find((item) => item.mealType === mealType)

      if (mealPlan) {
        const message = `${mealType} time has ended. Mark your meal status.`
        const notificationData = {
          title: `${diet.name} - ${mealType}`,
          body: `${message}`,
          payload: { dietId: diet._id, mealType, day: currentDay },
          type: 'Diet Notification',
          userId: diet.dietOwner._id,
          isUpdated: false,
        }

        console.log(notificationData)

        // Save notification to the database
        await Notification.create(notificationData)

        // Send push notification
        if (diet.dietOwner?.fcmToken) {
          const pushNotification = {
            notification: {
              title: notificationData.title,
              body: notificationData.body,
            },
            token: diet.dietOwner.fcmToken,
          }

          await admin.messaging().send(pushNotification)
          console.log(`Notification sent to ${diet.dietOwner.name} for diet: ${diet.name}, Meal: ${mealType}`)
        }
      } else {
        console.log(`No ${mealType} found for ${diet.name} on ${currentDay}. Skipping notification.`)
      }
    }
  }
)
