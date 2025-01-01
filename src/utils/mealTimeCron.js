import { schedule } from 'node-cron'
import { Notification, Diet } from '../models'
const admin = require('firebase-admin')

// "0 0 * * 0", Every sunday at 00:00 - Required
// "59 14 * * 1", Every monday at 14:59
// "* * * * * *", Every second
// "* * * * *", Every minute
// 0 0 0 * * *, Every Midnight
// 0 0 * * *, every 24 hour

export const mealTimeCron = schedule('0 9,13,19 * * *', async () => {
  console.log('Running Meal Time CRON')
  const currentHour = new Date().getHours()
  const today = new Date()
  const currentDay = today.toLocaleString('en-US', { weekday: 'long' })
  let mealType
  if (currentHour === 9) {
    mealType = 'Breakfast'
  } else if (currentHour === 13) {
    mealType = 'Lunch'
  } else if (currentHour === 19) {
    mealType = 'Dinner'
  }
  if (!mealType) return

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
      const message = `It's time to eat. Go grab your ${mealType}`
      const notificationData = {
        title: `${diet.name} - ${mealType}`,
        body: `${message}`,
        payload: { dietId: diet._id, mealType, day: currentDay },
        type: 'MealTime Notification',
        userId: diet.dietOwner._id,
        isUpdated: false,
      }
      await Notification.create(notificationData)
      if (diet.dietOwner?.fcmToken) {
        const pushNotification = {
          notification: {
            title: notificationData.title,
            body: notificationData.body,
          },
          token: diet.dietOwner.fcmToken,
        }
        await admin.messaging().send(pushNotification)
      }
    } else {
    }
  }
})
