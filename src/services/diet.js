import { User, Restaurants, Diet } from '../models'

export const calculateBMR = ({ dob, gender, weight, height, goal, exercise, exerciseTypes }) => {
  console.log(exercise)
  console.log(exerciseTypes)
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
      '-password -userTypes -name -email -file -role -eatOptions -appGoal -phone -refreshTokens -createdAt -updatedAt'
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
  let calorieDistribution = {
    breakfast: Math.round(totalCalories * 0.3),
    lunch: Math.round(totalCalories * 0.4),
    dinner: Math.round(totalCalories * 0.3),
  }

  const weeklyPlan = []
  const usedMeals = { breakfast: new Set(), lunch: new Set(), dinner: new Set() }
  const mealUsageCount = {} // Track how often a meal has been used
  const lastUsedLocations = { breakfast: null, lunch: null, dinner: null } // Rotate locations

  const groupMealsByLocation = (meals) => {
    return meals.reduce((groups, meal) => {
      if (!groups[meal.restaurantId]) groups[meal.restaurantId] = []
      groups[meal.restaurantId].push(meal)
      return groups
    }, {})
  }

  // Group meals by location and sort by calorie count
  const groupedMealsByType = {
    breakfast: groupMealsByLocation([...sortedMealItemsByType.breakfast].sort((a, b) => b.calories - a.calories)),
    lunch: groupMealsByLocation([...sortedMealItemsByType.lunch].sort((a, b) => b.calories - a.calories)),
    dinner: groupMealsByLocation([...sortedMealItemsByType.dinner].sort((a, b) => b.calories - a.calories)),
  }

  // Initialize meal usage tracking
  for (const mealType of ['breakfast', 'lunch', 'dinner']) {
    for (const meals of Object.values(groupedMealsByType[mealType])) {
      for (const meal of meals) {
        mealUsageCount[meal.mealId] = 0
      }
    }
  }

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayPlan = { day: daysOfWeek[dayIndex] }
    let totalProvidedCalories = 0
    let totalProtein = 0
    let totalFat = 0
    let totalCarbs = 0

    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
      const targetCalories = calorieDistribution[mealType]
      let selectedMeals = []
      let currentCalories = 0
      let currentProtein = 0
      let currentFat = 0
      let currentCarbs = 0

      // Pick a location that wasn't used last for variety
      let locationMeals = Object.entries(groupedMealsByType[mealType])
        .filter(([location]) => location !== lastUsedLocations[mealType])
        .sort((a, b) => b[1][0].calories - a[1][0].calories) // Highest calorie first
        .find(([_, meals]) => meals.some((meal) => mealUsageCount[meal.mealId] < 2))

      if (!locationMeals) {
        // If no new location, reuse a previous one
        locationMeals = Object.entries(groupedMealsByType[mealType])
          .sort((a, b) => b[1][0].calories - a[1][0].calories)
          .find(([_, meals]) => meals.some((meal) => mealUsageCount[meal.mealId] < 3))
      }

      if (locationMeals) {
        const [location, meals] = locationMeals
        for (const meal of meals) {
          if (usedMeals[mealType].has(meal.mealId)) continue
          if (mealUsageCount[meal.mealId] >= 2) continue // Don't overuse a meal

          if (currentCalories + meal.calories <= targetCalories * 1.05) {
            // Allow ±5% buffer
            selectedMeals.push(meal)
            currentCalories += meal.calories
            currentProtein += meal.protein
            currentFat += meal.fat
            currentCarbs += meal.carbohydrate
            usedMeals[mealType].add(meal.mealId)
            mealUsageCount[meal.mealId] += 1
          }

          if (currentCalories >= targetCalories * 0.95) break
        }
        lastUsedLocations[mealType] = location // Track last used location
      }

      // Redistribute unassigned calories across remaining meals
      const calorieDifference = targetCalories - currentCalories
      if (calorieDifference > 0) {
        const remainingMeals = ['breakfast', 'lunch', 'dinner'].filter((m) => m !== mealType)
        remainingMeals.forEach((m) => {
          calorieDistribution[m] += Math.round(calorieDifference / remainingMeals.length)
        })
      }

      totalProvidedCalories += currentCalories
      totalProtein += currentProtein
      totalFat += currentFat
      totalCarbs += currentCarbs
      dayPlan[mealType] = selectedMeals
    }

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
