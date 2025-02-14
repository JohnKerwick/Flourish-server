import { StatusCodes } from 'http-status-codes'
import {
  calculateBMR,
  getUserById,
  getAllMenuItems,
  createWeeklyDietPlanService,
  saveDietPlan,
  getDietDetails,
  getDietHistoryService,
} from '../services'
import jwt from 'jsonwebtoken'
import { asyncMiddleware } from '../middlewares'
import { Diet, Notification } from '../models'

export const CONTROLLER_DIET = {
  getWeeklyDietPlan: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    const user = await getUserById(userId)

    const { allergy, allergyTypes } = user
    const campus = user.student.school
    const allMenuItems = await getAllMenuItems(campus, allergy, allergyTypes)

    const mealOptions = {
      breakfast: ['Starbucks', 'Jamba Juice', 'Village Juice'],
      lunch: ['Barberitos', 'Qdoba', 'SaladWorks', 'Bojangles'],
      dinner: ['Subway', 'Chick-Fil-A', 'Panera Bread', 'Taco Bell', 'Panda Express'],
    }

    const mealItemsByType = {
      breakfast: allMenuItems.filter((item) => item.mealType === 'Breakfast'),
      lunch: allMenuItems.filter((item) => item.mealType === 'Lunch'),
      dinner: allMenuItems.filter((item) => item.mealType === 'Dinner'),
    }

    allMenuItems
      .filter((item) => item.mealType === 'Unknown')
      .forEach((item) => {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(item.restaurantName)) {
            mealItemsByType[mealType].push({ ...item, mealType })
            return
          }
        }
      })

    if (
      mealItemsByType.breakfast.length === 0 ||
      mealItemsByType.lunch.length === 0 ||
      mealItemsByType.dinner.length === 0
    ) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No menu items available for one or more meal types.',
        statusCode: StatusCodes.NOT_FOUND,
      })
    }

    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }

    const totalCalories = calculateBMR(user)
    const weeklyPlan = createWeeklyDietPlanService(totalCalories, sortedMealItemsByType)

    return res.status(StatusCodes.OK).json({
      message: 'Weekly diet plan generated successfully.',
      weeklyPlan,
      statusCode: 200,
    })
  }),

  createWeeklyDietPlan: asyncMiddleware(async (req, res) => {
    const dietPlanData = req.body
    const newDietPlan = await saveDietPlan(dietPlanData)

    return res.status(StatusCodes.OK).json({
      message: 'Diet plan created successfully.',
      statusCode: StatusCodes.OK,
      dietPlan: newDietPlan,
    })
  }),

  getDietHistory: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const dietPlans = await getDietHistoryService(userId)
    return res.status(StatusCodes.OK).json({
      dietPlans,
      message: 'Diet History fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  getWeeklydietPlanDetails: asyncMiddleware(async (req, res) => {
    const dietId = req.query.id
    const dietPlanDetails = await getDietDetails(dietId)
    return res.status(StatusCodes.OK).json({
      dietPlanDetails,
      message: 'Diet plan details fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  updateDietStatus: asyncMiddleware(async (req, res) => {
    const { dietId, mealType, day, newStatus, notificationId } = req.body
    const updatedDiet = await Diet.findOneAndUpdate(
      {
        _id: dietId,
        'dietplan.day': day,
        'dietplan.item.mealType': mealType,
      },
      {
        $set: {
          'dietplan.$[dayMatch].item.$[mealMatch].status': newStatus,
        },
      },
      {
        arrayFilters: [{ 'dayMatch.day': day }, { 'mealMatch.mealType': mealType }],
        new: true,
      }
    )
    await Notification.findByIdAndUpdate(notificationId, { isUpdated: true })
    return res.status(StatusCodes.OK).json({
      updatedDiet,
      message: 'Diet History fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),
}
