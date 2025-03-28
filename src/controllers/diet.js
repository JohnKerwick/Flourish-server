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
    const { dietPlan, selectedMeals } = req.body

    // Normalize meal names to prevent duplicates (remove size, weight, etc.)
    const extractCoreMealName = (mealName) => {
      let name = mealName.toLowerCase()

      // Handle special cases like Nachos & Chips
      if (name.includes('nachos')) {
        if (name.includes('cheese') && !name.includes('chips')) return 'nachos_cheese'
        if (name.includes('chips')) return 'nachos_chips'
        return 'nachos_plain'
      }

      // Remove weight/size units like "3.5 oz", "8 oz", "Large", "Small"
      return name
        .replace(/\b(large|medium|small|extra large|extra)\b/g, '') // Remove size words
        .replace(/\b(chips|dip|cheese dip)\b/g, '') // Normalize chips/dip wording
        .replace(/\b(\d+(\.\d+)?\s?(oz|g|lbs)?)\b/g, '') // Remove weight units
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim()
    }

    const normalizeMealType = (mealType) => {
      const normalized = mealType?.trim().toLowerCase()
      const mealVariants = {
        breakfast: ['breakfast', 'morning meal'],
        lunch: ['lunch', 'midday meal'],
        dinner: ['dinner', 'supper', 'evening meal'],
      }

      for (const [key, values] of Object.entries(mealVariants)) {
        if (values.includes(normalized)) return key
      }
      return 'unknown'
    }

    const normalizeRestaurantName = (name) => name?.trim().toLowerCase()

    const mealOptions = {
      breakfast: ['starbucks', 'jamba juice', 'village juice', 'taco bell'],
      lunch: ['barberitos', 'qdoba', 'saladworks', 'bojangles'],
      dinner: ['subway', 'chick-fil-a', 'panera bread', 'panda express'],
    }

    const isValidCalorieRange = (calories) => calories >= 50 && calories <= 900

    // Group meals by type while preventing duplicates
    const mealItemsByType = { breakfast: [], lunch: [], dinner: [] }
    const mealVariantsMap = new Map()

    allMenuItems.forEach((item) => {
      if (!item?.mealName || typeof item.mealName !== 'string') return

      const normalizedMealType = normalizeMealType(item.mealType)
      const coreMealName = extractCoreMealName(item.mealName)
      const normalizedRestaurant = normalizeRestaurantName(item.restaurantName)

      if (!isValidCalorieRange(item.calories)) return

      // Assign "unknown" meal types to appropriate categories based on restaurant
      let finalMealType = normalizedMealType
      if (finalMealType === 'unknown') {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(normalizedRestaurant)) {
            finalMealType = mealType
            break
          }
        }
      }

      // Prevent duplicate meal variants (keep highest calorie version)
      if (!mealVariantsMap.has(coreMealName) || mealVariantsMap.get(coreMealName).calories < item.calories) {
        mealVariantsMap.set(coreMealName, { ...item, mealType: finalMealType })
      }
    })

    // Move filtered meals to categorized lists
    mealVariantsMap.forEach((item) => {
      if (item.mealType !== 'unknown') {
        mealItemsByType[item.mealType].push(item)
      }
    })

    // Ensure at least one meal exists per category
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
