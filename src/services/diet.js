import { User, Restaurants, Diet } from '../models'

export const calculateBMR = ({ dob, gender, weight, height, goal, exercise }) => {
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
  const ACTIVITY_FACTORS = {
    'Never (0 times a week)': 1.2,
    'Sometimes (1-2 times a week)': 1.375,
    'Regularly (3-4 times a week)': 1.55,
    'Often (5-6 times a week)': 1.725,
    'Daily (> 7 times a week)': 1.9,
  }
  const GOAL_FACTORS = {
    'Gain Weight': 1.2,
    'Maintain Weight': 1.0,
    'Loss Weight': 0.8,
  }

  const heightInCm = height * HEIGHT_CONVERSION
  const genderFactor = GENDER_FACTORS[gender.toLowerCase()] || 0
  const activityFactor = ACTIVITY_FACTORS[exercise] || 1.2 // Default to Sedentary
  const goalFactor = GOAL_FACTORS[goal] || 1.0

  const bmr = 10 * weight + 6.25 * heightInCm - 5 * age + genderFactor
  const tdee = bmr * activityFactor // Total Daily Energy Expenditure
  const caloricIntake = tdee * goalFactor // Adjusted for Goal

  return caloricIntake
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
    { $match: { campus: { $in: [campus] } } },
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
    {
      $match: {
        'mealDetails._id': { $ne: null },
      },
    },
    ...(allergy && Array.isArray(allergyTypes) && allergyTypes.length > 0
      ? [
          {
            $match: {
              'mealDetails.allergens': { $not: { $elemMatch: { $in: allergyTypes } } },
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
        category: '$category',
        mealId: '$mealDetails._id',
      },
    },
    { $sort: { calories: -1 } },
  ])
}
export const createWeeklyDietPlanService = (
  totalCalories,
  sortedMealItemsByType,
  mealSwipeLimits,
  selectedMealTypes
) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  let calorieDistribution = { breakfast: 0, lunch: 0, dinner: 0 }
  const totalSelectedMeals = selectedMealTypes.length

  if (totalSelectedMeals === 3) {
    calorieDistribution = {
      breakfast: Math.round(totalCalories * 0.3),
      lunch: Math.round(totalCalories * 0.4),
      dinner: Math.round(totalCalories * 0.3),
    }
  } else if (selectedMealTypes.includes('breakfast') && selectedMealTypes.includes('dinner')) {
    calorieDistribution = {
      breakfast: Math.round(totalCalories * 0.4),
      lunch: Math.round(totalCalories * 0.2),
      dinner: Math.round(totalCalories * 0.4),
    }
  } else if (selectedMealTypes.includes('breakfast')) {
    calorieDistribution = { breakfast: Math.round(totalCalories * 0.6), lunch: Math.round(totalCalories * 0.4) }
  } else if (selectedMealTypes.includes('dinner')) {
    calorieDistribution = { lunch: Math.round(totalCalories * 0.4), dinner: Math.round(totalCalories * 0.6) }
  }

  let franchiseSwipesLeft = mealSwipeLimits['Franchise']
  console.log('franchiseSwipesLeft', franchiseSwipesLeft)
  let cafeteriaSwipesLeft = mealSwipeLimits['Dining-Halls']
  console.log('cafeteriaSwipesLeft', cafeteriaSwipesLeft)
  console.log('mealSwipeLimits', mealSwipeLimits)

  const weeklyPlan = []
  let usedMealsLog = new Set()

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayPlan = { day: daysOfWeek[dayIndex] }
    let totalProvidedCalories = 0,
      totalProtein = 0,
      totalFat = 0,
      totalCarbs = 0
    let chosenRestaurants = {}

    for (const mealType of selectedMealTypes) {
      const targetCalories = calorieDistribution[mealType]

      let availableMeals = sortedMealItemsByType[mealType]?.filter((meal) => !usedMealsLog.has(meal._id)) || []

      if (availableMeals.length === 0) {
        console.warn(`No meals available for ${mealType} on ${daysOfWeek[dayIndex]}`)
        continue
      }

      availableMeals.sort((a, b) => b.calories - a.calories)

      // **Pick a restaurant for this meal type on this day**
      if (!chosenRestaurants[mealType]) {
        let validRestaurants = [...new Set(availableMeals.map((meal) => meal.restaurantName))]

        let chosenRestaurant = null
        for (let restaurant of validRestaurants) {
          let sampleMeal = availableMeals.find((meal) => meal.restaurantName === restaurant)

          if (!sampleMeal) continue
          if (sampleMeal.category === 'Franchise' && franchiseSwipesLeft > 0) {
            chosenRestaurant = restaurant
            franchiseSwipesLeft--
            break
          } else if (sampleMeal.category === 'Dining-Halls' && cafeteriaSwipesLeft > 0) {
            chosenRestaurant = restaurant
            cafeteriaSwipesLeft--
            break
          }
        }

        if (!chosenRestaurant) {
          console.warn(`No available restaurant meets meal swipe limits for ${mealType} on ${daysOfWeek[dayIndex]}`)
          continue
        }

        chosenRestaurants[mealType] = chosenRestaurant
      }

      let chosenRestaurant = chosenRestaurants[mealType]
      availableMeals = availableMeals.filter((meal) => meal.restaurantName === chosenRestaurant)

      if (availableMeals.length === 0) {
        console.warn(`No meals found from ${chosenRestaurant} for ${mealType} on ${daysOfWeek[dayIndex]}`)
        continue
      }

      let selectedMeals = []
      let currentCalories = 0,
        currentProtein = 0,
        currentFat = 0,
        currentCarbs = 0

      for (const meal of availableMeals) {
        if (currentCalories + meal.calories > targetCalories + 10) continue

        selectedMeals.push(meal)
        currentCalories += meal.calories
        currentProtein += meal.protein
        currentFat += meal.fat
        currentCarbs += meal.carbohydrate

        if (currentCalories >= targetCalories - 10) break
      }

      if (selectedMeals.length === 0) {
        let closestMeal = availableMeals.reduce((closest, meal) => {
          return Math.abs(meal.calories - targetCalories) < Math.abs(closest.calories - targetCalories) ? meal : closest
        }, availableMeals[0])

        if (closestMeal) {
          selectedMeals.push(closestMeal)
          currentCalories += closestMeal.calories
          currentProtein += closestMeal.protein
          currentFat += closestMeal.fat
          currentCarbs += closestMeal.carbohydrate
        }
      }

      if (selectedMeals.length === 0) {
        console.warn(`No valid meals could be selected for ${mealType} on ${daysOfWeek[dayIndex]}`)
        continue
      }

      dayPlan[mealType] = selectedMeals
      totalProvidedCalories += currentCalories
      totalProtein += currentProtein
      totalFat += currentFat
      totalCarbs += currentCarbs

      selectedMeals.forEach((meal) => usedMealsLog.add(meal._id))
    }

    // Enforce strict calorie range: ±10 of BMR
    if (totalProvidedCalories < totalCalories - 10 || totalProvidedCalories > totalCalories + 10) {
      console.warn(
        `⚠️ Adjusting calorie range for ${daysOfWeek[dayIndex]}: Target=${totalCalories}, Provided=${totalProvidedCalories}`
      )
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
