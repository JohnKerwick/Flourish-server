import { StatusCodes } from 'http-status-codes'
import {
  calculateBMR,
  getUserById,
  getAllMenuItems,
  createWeeklyDietPlanService,
  saveDietPlan,
  getDietDetails,
  getDietHistoryService,
  getFranchiseItems as getCafeteriaItems,
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
    const goal = user.goal
    const campus = user.student.school
    const allMenuItems = await getAllMenuItems(campus)
    const { dietPlan, selectedMeals } = req.body

    // Function to normalize meal types
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
    const isValidCalorieRange = (calories) => calories >= 50 && calories <= 9000
    const bestChipsNachosMeal = new Map()
    const filteredMenuItems = []
    const seenKeywords = new Set() // Track keywords like "chips" and "nachos"

    allMenuItems.forEach((item) => {
      const mealName = item.mealName.toLowerCase()
      const containsKeyword = ['chips', 'nachos', 'tortilla', 'smoothies', 'cookies', 'burrito', 'quesadillas'].find(
        (word) => mealName.includes(word)
      )

      if (containsKeyword) {
        if (!seenKeywords.has(containsKeyword)) {
          console.log('First occurrence added:', mealName) // ✅ Log only first time
          seenKeywords.add(containsKeyword)
          filteredMenuItems.push(item) // ✅ Add first occurrence only
        }
      } else {
        filteredMenuItems.push(item) // ✅ Always add non-chips/nachos meals
      }
    })

    filteredMenuItems.push(...bestChipsNachosMeal.values())

    // Organize meals by type
    const mealItemsByType = { breakfast: [], lunch: [], dinner: [] }
    filteredMenuItems.forEach((item) => {
      if (!item?.mealName || typeof item.mealName !== 'string') return

      const normalizedMealType = normalizeMealType(item.mealType)
      const normalizedRestaurant = normalizeRestaurantName(item.restaurantName)

      if (!isValidCalorieRange(item.calories)) return

      let finalMealType = normalizedMealType
      if (finalMealType === 'unknown') {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(normalizedRestaurant)) {
            finalMealType = mealType
            break
          }
        }
      }

      if (finalMealType !== 'unknown') {
        mealItemsByType[finalMealType].push(item)
      }
    })

    // Return error if no meals available for one or more types
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

    // Sort meals by calories
    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }

    // Normalize and fix meal calories (if needed) before using them
    const normalizedBreakfast = normalizeMealCalories_Maintain(sortedMealItemsByType.breakfast, true)
    const normalizedLunch = normalizeMealCalories_Maintain(sortedMealItemsByType.lunch, true)
    const normalizedDinner = normalizeMealCalories_Maintain(sortedMealItemsByType.dinner, true)

    // Now we can use the normalized meals in the diet plan generation
    const totalCalories = calculateBMR(user)
    const weeklyPlan = createWeeklyDietPlanService(
      totalCalories,
      { breakfast: normalizedBreakfast, lunch: normalizedLunch, dinner: normalizedDinner },
      dietPlan,
      selectedMeals
    )

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

  getVeganDiet: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await getUserById(userId)
    const campus = user.student.school
    const allMenuItems = await getCafeteriaItems(campus)

    // List of animal-based ingredients to check
    const nonVeganIngredients = [
      'cheese',
      'bacon',
      'butter',
      'milk',
      'egg',
      'lard',
      'cream',
      'honey',
      'gelatin',
      'meat',
      'fish',
      'chicken',
      'beef',
      'pork',
    ]

    // Function to check if a meal is vegan based on its ingredients
    const isVegan = (ingredients) => {
      return !ingredients.some((ingredient) =>
        nonVeganIngredients.some((nonVegan) => ingredient.toLowerCase().includes(nonVegan))
      )
    }

    // Filter the menu items to return only vegan meals
    const veganMenuItems = allMenuItems.filter((item) => isVegan(item.ingredients))
    const normalizeMealType = (mealType) => {
      const normalized = mealType?.trim().toLowerCase()

      const mealVariants = {
        breakfast: ['breakfast'],
        lunch: ['lunch'],
        dinner: ['dinner'],
      }

      for (const [key, values] of Object.entries(mealVariants)) {
        if (values.includes(normalized)) return key
      }
      return 'unknown'
    }
    const mealItemsByType = { breakfast: [], lunch: [], dinner: [] }
    veganMenuItems.forEach((item) => {
      if (!item?.mealName || typeof item.mealName !== 'string') return

      const normalizedMealType = normalizeMealType(item.mealType)
      // const normalizedRestaurant = normalizeRestaurantName(item.restaurantName)

      // if (!isValidCalorieRange(item.calories)) return

      let finalMealType = normalizedMealType
      if (finalMealType === 'unknown') {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(normalizedRestaurant)) {
            finalMealType = mealType
            break
          }
        }
      }

      if (finalMealType !== 'unknown') {
        mealItemsByType[finalMealType].push(item)
      }
    })
    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }
    const totalCalories = calculateBMR(user)
    const weeklyPlan = createWeeklyDietPlanService(
      totalCalories,
      sortedMealItemsByType,
      { Franchise: 0, 'Dining-Halls': 21 },
      ['breakfast', 'lunch', 'dinner']
    )
    return res.status(StatusCodes.OK).json({
      sortedMealItemsByType,
      message: 'Vegan Diet Plan fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  getPaleoDiet: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await getUserById(userId)
    const campus = user.student.school
    const allMenuItems = await getCafeteriaItems(campus)

    const nonPaleoIngredients = [
      'wheat',
      'oats',
      'rice',
      'barley',
      'quinoa',
      'corn',
      'beans',
      'lentils',
      'soy',
      'tofu',
      'milk',
      'cheese',
      'butter',
      'cream',
      'yogurt',
      'sugar',
      'high fructose corn syrup',
      'honey',
      'canola oil',
      'sunflower oil',
      'margarine',
      'processed',
      'flour',
      'bread',
      'pasta',
    ]

    const isPaleo = (ingredients) => {
      return !ingredients.some((ingredient) =>
        nonPaleoIngredients.some((nonPaleo) => ingredient.toLowerCase().includes(nonPaleo))
      )
    }

    const paleoMenuItems = allMenuItems.filter((item) => isPaleo(item.ingredients))

    const normalizeMealType = (mealType) => {
      const normalized = mealType?.trim().toLowerCase()

      const mealVariants = {
        breakfast: ['breakfast'],
        lunch: ['lunch'],
        dinner: ['dinner'],
      }

      for (const [key, values] of Object.entries(mealVariants)) {
        if (values.includes(normalized)) return key
      }
      return 'unknown'
    }

    const mealItemsByType = { breakfast: [], lunch: [], dinner: [] }

    paleoMenuItems.forEach((item) => {
      if (!item?.mealName || typeof item.mealName !== 'string') return

      const normalizedMealType = normalizeMealType(item.mealType)

      let finalMealType = normalizedMealType
      if (finalMealType === 'unknown') {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(item.restaurantName?.toLowerCase())) {
            finalMealType = mealType
            break
          }
        }
      }

      if (finalMealType !== 'unknown') {
        mealItemsByType[finalMealType].push(item)
      }
    })

    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }

    const totalCalories = calculateBMR(user)

    const weeklyPlan = createWeeklyDietPlanService(
      totalCalories,
      sortedMealItemsByType,
      { Franchise: 0, 'Dining-Halls': 21 },
      ['breakfast', 'lunch', 'dinner']
    )

    return res.status(StatusCodes.OK).json({
      sortedMealItemsByType,
      weeklyPlan,
      message: 'Paleo Diet Plan fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),
}

export const normalizeMealCalories_Maintain = (meals, shouldFix = false) => {
  const MACRO_CALORIES = {
    protein: 4,
    fat: 9,
    carbohydrate: 4,
  }

  return meals
    .map((meal) => {
      const { protein = 0, fat = 0, carbohydrate = 0, calories } = meal

      // Calculate the total calories from the macronutrients
      const calculatedCalories =
        protein * MACRO_CALORIES.protein + fat * MACRO_CALORIES.fat + carbohydrate * MACRO_CALORIES.carbohydrate

      // Calculate the fat percentage of the total calories
      const fatPercentage = ((fat * MACRO_CALORIES.fat) / calculatedCalories) * 100

      // Calculate the carbohydrate percentage of the total calories
      const carbPercentage = ((carbohydrate * MACRO_CALORIES.carbohydrate) / calculatedCalories) * 100

      // If the fat percentage is greater than 50%, or carbohydrate percentage is greater than 65%, skip this meal (filter it out)
      if (fatPercentage > 50 || carbPercentage > 70) {
        return null // Returning null will remove the meal from the array
      }

      const diff = Math.abs(calculatedCalories - calories)

      const isMismatch = diff > 20 // more than 20 kcal difference

      if (isMismatch && shouldFix) {
        return {
          ...meal,
          calories: Math.round(calculatedCalories),
          _calorieMismatch: true, // Optional: for debug tracking
        }
      }

      return {
        ...meal,
        _calorieMismatch: isMismatch ? true : undefined, // Mark only if mismatch
      }
    })
    .filter(Boolean) // Remove any null values (meals with >50% fat or >65% carbs)
}

export const normalizeMealCalories_HighProtien = (meals, shouldFix = false) => {
  const MACRO_CALORIES = {
    protein: 4,
    fat: 9,
    carbohydrate: 4,
  }

  return (
    meals
      .map((meal) => {
        const { protein = 0, fat = 0, carbohydrate = 0, calories } = meal

        const calculatedCalories =
          protein * MACRO_CALORIES.protein + fat * MACRO_CALORIES.fat + carbohydrate * MACRO_CALORIES.carbohydrate

        const proteinPercentage = ((protein * MACRO_CALORIES.protein) / calculatedCalories) * 100
        const fatPercentage = ((fat * MACRO_CALORIES.fat) / calculatedCalories) * 100
        const carbPercentage = ((carbohydrate * MACRO_CALORIES.carbohydrate) / calculatedCalories) * 100

        // Add condition for high protein, and reduce fat & carb bias
        const isHighProtein = proteinPercentage >= 25
        const isAcceptableFat = fatPercentage <= 30
        const isAcceptableCarb = carbPercentage <= 60

        if (!isHighProtein || !isAcceptableFat || !isAcceptableCarb) {
          return null
        }

        const diff = Math.abs(calculatedCalories - calories)
        const isMismatch = diff > 20

        if (isMismatch && shouldFix) {
          return {
            ...meal,
            calories: Math.round(calculatedCalories),
            _calorieMismatch: true,
          }
        }

        return {
          ...meal,
          _calorieMismatch: isMismatch ? true : undefined,
        }
      })
      .filter(Boolean)
      // Optional: Sort meals with highest protein % first
      .sort((a, b) => {
        const aCalories = a.protein * 4 + a.fat * 9 + a.carbohydrate * 4
        const bCalories = b.protein * 4 + b.fat * 9 + b.carbohydrate * 4

        const aProteinRatio = (a.protein * 4) / aCalories
        const bProteinRatio = (b.protein * 4) / bCalories

        return bProteinRatio - aProteinRatio // highest protein first
      })
  )
}
