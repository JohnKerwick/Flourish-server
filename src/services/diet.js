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

  const weeklyPlan = []
  const usedMeals = { breakfast: new Set(), lunch: new Set(), dinner: new Set() }

  // Group meals by location for each meal type
  const groupMealsByLocation = (meals) => {
    return meals.reduce((groups, meal) => {
      if (!groups[meal.restaurantId]) groups[meal.restaurantId] = []
      groups[meal.restaurantId].push(meal)
      return groups
    }, {})
  }

  const groupedMealsByType = {
    breakfast: groupMealsByLocation(sortedMealItemsByType.breakfast),
    lunch: groupMealsByLocation(sortedMealItemsByType.lunch),
    dinner: groupMealsByLocation(sortedMealItemsByType.dinner),
  }

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayPlan = { day: daysOfWeek[dayIndex] }
    let totalProvidedCalories = 0

    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
      const targetCalories = calorieDistribution[mealType]
      let selectedMeals = []
      let currentCalories = 0

      // Select meals from the same location
      for (const [location, meals] of Object.entries(groupedMealsByType[mealType])) {
        selectedMeals = []
        currentCalories = 0

        for (const meal of meals) {
          if (usedMeals[mealType].has(meal.mealId)) continue

          if (currentCalories + meal.calories <= targetCalories + 10) {
            selectedMeals.push(meal)
            currentCalories += meal.calories
            usedMeals[mealType].add(meal.mealId) // Track used meals
          }
          if (currentCalories >= targetCalories - 10) break // Break if within target range
        }

        if (selectedMeals.length > 0 && currentCalories >= targetCalories - 10) break // Use this location if valid
      }

      // Handle calorie surplus/deficit dynamically
      const calorieDifference = targetCalories - currentCalories
      if (calorieDifference !== 0) {
        if (mealType === 'breakfast' && calorieDifference > 0) {
          calorieDistribution.lunch += calorieDifference // Add deficit to lunch
        } else if (mealType === 'lunch' && calorieDifference > 0) {
          calorieDistribution.dinner += calorieDifference // Add deficit to dinner
        }
      }

      totalProvidedCalories += currentCalories
      dayPlan[mealType] = selectedMeals
    }

    // Add macros and totals for the day
    dayPlan.caloriesBMR = Math.trunc(totalCalories)
    dayPlan.caloriesProvided = Math.trunc(totalProvidedCalories)

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
