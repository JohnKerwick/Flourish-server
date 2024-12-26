import { User, Restaurants, Diet } from '../models'

export const calculateBMR = ({ dob, gender, weight, height, goal }) => {
  const birthDate = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  if (
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
  ) {
    age--
  }
  const HEIGHT_CONVERSION = 2.54
  const GENDER_FACTORS = { male: 5, female: -161 }
  const GOAL_FACTORS = {
    'Gain Weight': 1.2,
    'Maintain Weight': 1.0,
    'Loss Weight': 0.8,
  }
  const heightInCm = height * HEIGHT_CONVERSION
  const genderFactor = GENDER_FACTORS[gender.toLowerCase()] || 0
  const goalFactor = GOAL_FACTORS[goal] || 1.0

  const bmr = (10 * weight + 6.25 * heightInCm - 5 * age + genderFactor) * goalFactor

  return bmr
}

export const getUserById = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { lastActive: new Date() })
    .select(
      '-password -userTypes -name -email -file -role -eatOptions -appGoal -exerciseTypes -phone -refreshTokens -createdAt -updatedAt -exercise'
    )
    .lean()
  return user
}

export const getAllMenuItems = async (campus, allergy, allergyTypes) => {
  return Restaurants.aggregate([
    { $match: { campus } },
    { $unwind: '$menu' },
    { $unwind: '$menu.items' },
    {
      $lookup: {
        from: 'meals',
        localField: 'menu.items',
        foreignField: '_id',
        as: 'mealDetails',
      },
    },
    { $unwind: '$mealDetails' },
    { $match: { 'mealDetails.nutrients.calories': { $gt: 0 } } },
    ...(allergy
      ? [
          {
            $match: {
              'mealDetails.allergens': { $nin: allergyTypes },
            },
          },
        ]
      : []),
    {
      $project: {
        mealName: '$mealDetails.name',
        mealType: '$mealDetails.type',
        ingredients: '$mealDetails.ingredients',
        allergens: '$mealDetails.allergens',
        dietaryPreferences: '$mealDetails.dietaryPreferences',
        serving: '$mealDetails.serving',
        calories: '$mealDetails.nutrients.calories',
        protein: '$mealDetails.nutrients.protein',
        fat: '$mealDetails.nutrients.fat',
        carbohydrate: '$mealDetails.nutrients.carbohydrate',
        restaurantName: '$name',
        restaurantId: '$_id',
        mealId: '$mealDetails._id',
      },
    },
    { $sort: { 'mealDetails.nutrients.calories': -1 } },
  ])
}

export const createWeeklyDietPlanService = (totalCalories, sortedMealItemsByType) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const calorieDistribution = {
    breakfast: Math.round(totalCalories * 0.3),
    lunch: Math.round(totalCalories * 0.4),
    dinner: Math.round(totalCalories * 0.3),
  }

  const usedMealsByLocation = {} // Track used meals per location
  const weeklyPlan = []

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayPlan = { day: daysOfWeek[dayIndex] }
    let totalProvidedCalories = 0
    let totalProtein = 0
    let totalFat = 0
    let totalCarbs = 0

    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
      const mealsByLocation = sortedMealItemsByType[mealType].reduce((acc, meal) => {
        if (!acc[meal.location]) {
          acc[meal.location] = []
        }
        acc[meal.location].push(meal)
        return acc
      }, {})

      const availableLocations = Object.keys(mealsByLocation)
      if (availableLocations.length === 0) {
        dayPlan[mealType] = []
        continue
      }

      // Randomly select a location for the meal type
      const selectedLocation = availableLocations[Math.floor(Math.random() * availableLocations.length)]
      const mealsFromSelectedLocation = mealsByLocation[selectedLocation]

      // Initialize usedMeals tracking for the selected location if not present
      if (!usedMealsByLocation[selectedLocation]) {
        usedMealsByLocation[selectedLocation] = new Set()
      }

      const dailyMeals = []
      let caloriesRemaining = calorieDistribution[mealType]

      // First, prioritize unused meals
      for (const meal of mealsFromSelectedLocation) {
        if (!usedMealsByLocation[selectedLocation].has(meal.mealName) && meal.calories <= caloriesRemaining) {
          dailyMeals.push(meal)
          usedMealsByLocation[selectedLocation].add(meal.mealName)
          caloriesRemaining -= meal.calories
          totalProvidedCalories += meal.calories
          totalProtein += meal.protein
          totalFat += meal.fat
          totalCarbs += meal.carbohydrate
        }
      }

      // If we still have calories to fill, allow repeats
      if (caloriesRemaining > 0) {
        for (const meal of mealsFromSelectedLocation) {
          if (meal.calories <= caloriesRemaining) {
            dailyMeals.push(meal)
            caloriesRemaining -= meal.calories
            totalProvidedCalories += meal.calories
            totalProtein += meal.protein
            totalFat += meal.fat
            totalCarbs += meal.carbohydrate

            // No need to re-add to usedMeals since repeats are allowed now
          }
          if (caloriesRemaining <= 0) break
        }
      }

      // Add meals to the day plan
      dayPlan[mealType] = dailyMeals
    }

    // Aggregate totals for the day
    dayPlan.caloriesBMR = Math.trunc(totalCalories)
    dayPlan.caloriesProvided = Math.trunc(totalProvidedCalories)
    dayPlan.proteinProvided = Math.trunc(totalProtein)
    dayPlan.fatProvided = Math.trunc(totalFat)
    dayPlan.carbsProvided = Math.trunc(totalCarbs)

    weeklyPlan.push(dayPlan)
  }

  return weeklyPlan
}

export const saveDietPlan = async (dietPlanData) => {
  let currentDate = new Date()
  dietPlanData.dietplan.forEach((dayPlan) => {
    dayPlan.date = new Date(currentDate)
    currentDate.setDate(currentDate.getDate() + 1)
  })
  return new Diet({ ...dietPlanData }).save()
}

export const getDietHistoryService = async (userId) => {
  const date = Date.now()
  return Diet.find({
    dietOwner: userId,
    expiresAt: { $lt: date },
  })
    .select('name')
    .lean()
}

export const getDietDetails = async (dietId) => {
  return Diet.findById(dietId)
    .populate({
      path: 'dietplan.item.meal.meal',
      model: 'Meal',
    })
    .lean()
}
