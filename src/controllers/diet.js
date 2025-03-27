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
import { ConversationPage } from 'twilio/lib/rest/conversations/v1/conversation'
function normalizeMealName(mealName) {
  if (!mealName || typeof mealName !== 'string') return ''

  return mealName
    .toLowerCase()
    .replace(/\b(medium|cheese|chips|large|small|extra|double|spicy|grilled|crispy|special|combo|meal)\b/g, '') // Remove single-word descriptors
    .replace(/\b(cheese dip|chips & dip|side order|family pack| medium cheese dip)\b/g, '') // Remove common meal phrases
    .replace(/[^\w\s]/g, '') // Remove non-alphanumeric characters (optional)
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}
export const CONTROLLER_DIET = {
  getWeeklyDietPlan: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    const user = await getUserById(userId)
    const { allergy, allergyTypes } = user
    const campus = user.student.school
    const allMenuItems = await getAllMenuItems(campus, allergy, allergyTypes)
    const { dietPlan, selectedMeals } = req.body

    // Meal type & restaurant normalization
    const normalizeText = (text) => text?.trim().toLowerCase()

    const normalizeMealType = (mealType) => {
      const normalized = normalizeText(mealType)
      const mealVariants = {
        breakfast: ['breakfast', 'morning meal'],
        lunch: ['lunch', 'midday meal'],
        dinner: ['dinner', 'supper', 'evening meal'],
      }

      for (const [key, values] of Object.entries(mealVariants)) {
        if (values.includes(normalized)) return key
      }

      return 'unknown' // Default if mealType is unrecognized
    }

    const normalizeRestaurantName = (name) => normalizeText(name)

    const mealOptions = {
      breakfast: ['starbucks', 'jamba juice', 'village juice', 'taco bell'],
      lunch: ['barberitos', 'qdoba', 'saladworks', 'bojangles'],
      dinner: ['subway', 'chick-fil-a', 'panera bread', 'panda express'],
    }

    const isValidCalorieRange = (calories) => calories >= 50 && calories <= 900

    // Categorizing menu items by meal type
    const mealItemsByType = {
      breakfast: [],
      lunch: [],
      dinner: [],
    }

    allMenuItems.forEach((item) => {
      const normalizedMealType = normalizeMealType(item.mealType)
      const normalizedRestaurant = normalizeRestaurantName(item.restaurantName)
      const normalizedMealName = normalizeMealName(item.name) // 🔥 **Apply Meal Name Normalization**

      if (isValidCalorieRange(item.calories)) {
        if (normalizedMealType !== 'unknown') {
          mealItemsByType[normalizedMealType].push({ ...item, mealType: normalizedMealType, name: normalizedMealName })
        } else {
          // Assign "unknown" meal types to appropriate categories based on restaurant
          for (const [mealType, restaurants] of Object.entries(mealOptions)) {
            if (restaurants.includes(normalizedRestaurant)) {
              mealItemsByType[mealType].push({ ...item, mealType, name: normalizedMealName })
              break
            }
          }
        }
      }
    })

    // Check if any meal type is empty
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

    // Sort meals by calorie count (highest first)
    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }

    // Calculate daily calorie needs
    const totalCalories = calculateBMR(user)

    // Generate weekly diet plan
    const weeklyPlan = createWeeklyDietPlanService(totalCalories, sortedMealItemsByType, dietPlan, selectedMeals)

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
