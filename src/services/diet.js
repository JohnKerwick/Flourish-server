import { User, Restaurants, Diet } from '../models'
import _ from 'lodash' // Import lodash for shuffling

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

export const getAllMenuItems = async (campus) => {
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
  let calorieDistribution = {}

  // Default calorie distribution
  const totalSelectedMeals = selectedMealTypes.length
  if (totalSelectedMeals === 3) {
    calorieDistribution = {
      breakfast: Math.round(totalCalories * 0.3),
      lunch: Math.round(totalCalories * 0.4),
      dinner: Math.round(totalCalories * 0.3),
    }
  } else if (selectedMealTypes.includes('breakfast') && selectedMealTypes.includes('dinner')) {
    calorieDistribution = {
      breakfast: Math.round(totalCalories * 0.3),
      lunch: Math.round(totalCalories * 0.2),
      dinner: Math.round(totalCalories * 0.5),
    }
  } else if (selectedMealTypes.includes('breakfast')) {
    calorieDistribution = {
      breakfast: Math.round(totalCalories * 0.4),
      lunch: Math.round(totalCalories * 0.6),
    }
  } else if (selectedMealTypes.includes('dinner')) {
    calorieDistribution = {
      lunch: Math.round(totalCalories * 0.4),
      dinner: Math.round(totalCalories * 0.6),
    }
  }

  let franchiseSwipesLeft = mealSwipeLimits['Franchise']
  let cafeteriaSwipesLeft = mealSwipeLimits['Dining-Halls']
  let usedMealsSet = new Set()

  const weeklyPlan = []

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayPlan = { day: daysOfWeek[dayIndex] }
    let totalProvidedCalories = 0,
      totalProtein = 0,
      totalFat = 0,
      totalCarbs = 0

    let chosenRestaurants = {}
    let breakfastCalories = 0

    for (const mealType of selectedMealTypes) {
      let targetCalories = calorieDistribution[mealType]
      let availableMeals =
        sortedMealItemsByType[mealType]?.filter((meal) => {
          if (!meal?.name) return true // Keep meals with no name
          return !meal.name.toLowerCase().endsWith('oil') && !usedMealsSet.has(meal._id)
        }) || []
      if (availableMeals.length === 0) continue

      let mainMeals = availableMeals.filter((meal) => meal.calories >= 100)
      if (mainMeals.length === 0) continue

      mainMeals = _.shuffle(mainMeals)

      if (!chosenRestaurants[mealType]) {
        let validRestaurants = [...new Set(availableMeals.map((meal) => meal.restaurantName))]
        let categoryPriority = ['Franchise', 'Dining-Halls']
        let chosenRestaurant = null
        let chosenCategory = null

        for (let category of categoryPriority) {
          for (let restaurant of _.shuffle(validRestaurants)) {
            let sampleMeal = mainMeals.find((meal) => meal.restaurantName === restaurant && meal.category === category)

            if (!sampleMeal) continue
            if (category === 'Franchise' && franchiseSwipesLeft > 0) {
              chosenRestaurant = restaurant
              chosenCategory = 'Franchise'
              franchiseSwipesLeft--
              break
            } else if (category === 'Dining-Halls' && cafeteriaSwipesLeft > 0) {
              chosenRestaurant = restaurant
              chosenCategory = 'Dining-Halls'
              cafeteriaSwipesLeft--
              break
            }
          }
          if (chosenRestaurant) break
        }

        if (!chosenRestaurant) continue
        chosenRestaurants[mealType] = { restaurant: chosenRestaurant, category: chosenCategory }
      }

      let { restaurant: chosenRestaurant, category: chosenCategory } = chosenRestaurants[mealType]
      mainMeals = mainMeals.filter((meal) => meal.restaurantName === chosenRestaurant)

      if (mainMeals.length === 0) continue

      let selectedMeals = []
      let currentCalories = 0,
        currentProtein = 0,
        currentFat = 0,
        currentCarbs = 0

      // **Special Rule for Franchise Breakfast**
      if (mealType === 'breakfast' && chosenCategory === 'Franchise') {
        let highestCalorieMeal = mainMeals.reduce(
          (maxMeal, meal) => (meal.calories > maxMeal.calories ? meal : maxMeal),
          mainMeals[0]
        )
        selectedMeals.push(highestCalorieMeal)
        usedMealsSet.add(highestCalorieMeal._id)
        breakfastCalories = highestCalorieMeal.calories // Store breakfast calories
        currentCalories = highestCalorieMeal.calories
        currentProtein = highestCalorieMeal.protein
        currentFat = highestCalorieMeal.fat
        currentCarbs = highestCalorieMeal.carbohydrate

        // **Recalculate Remaining Calories for Lunch & Dinner**
        let remainingCalories = totalCalories - breakfastCalories
        calorieDistribution.lunch = Math.round(remainingCalories * 0.55)
        calorieDistribution.dinner = Math.round(remainingCalories * 0.45)
        sortedMealItemsByType[mealType] = sortedMealItemsByType[mealType].filter(
          (meal) => meal._id !== highestCalorieMeal._id
        )
      } else {
        // **Regular Meal Selection (Lunch & Dinner)**
        let mainMeal = mainMeals.shift()

        selectedMeals.push(mainMeal)
        usedMealsSet.add(mainMeal._id)
        currentCalories += mainMeal?.calories ?? 0
        currentProtein += mainMeal.protein
        currentFat += mainMeal.fat
        currentCarbs += mainMeal.carbohydrate
        sortedMealItemsByType[mealType] = sortedMealItemsByType[mealType].filter((meal) => meal._id !== mainMeal._id)

        // Add extra meals if required
        while (
          currentCalories < targetCalories * 0.95 &&
          totalProvidedCalories + (mainMeals[0]?.calories ?? 0) <= totalCalories &&
          mainMeals.length > 0
        ) {
          let extraMainMeal = mainMeals.shift()
          selectedMeals.push(extraMainMeal)
          usedMealsSet.add(extraMainMeal._id)
          currentCalories += extraMainMeal?.calories ?? 0
          currentProtein += extraMainMeal.protein
          currentFat += extraMainMeal.fat
          currentCarbs += extraMainMeal.carbohydrate
          sortedMealItemsByType[mealType] = sortedMealItemsByType[mealType].filter(
            (meal) => meal._id !== extraMainMeal._id
          )
        }
      }

      dayPlan[mealType] = selectedMeals
      totalProvidedCalories += currentCalories

      totalProtein += currentProtein
      totalFat += currentFat
      totalCarbs += currentCarbs
    }
    let calorieDiff = totalCalories - totalProvidedCalories

    // ✅ Add Side Meals If Needed, But Stay Under BMR
    while (calorieDiff > 0) {
      let sideMeal = sortedMealItemsByType['sideMeals']
        ?.filter((meal) => !usedMealsSet.has(meal._id) && meal.calories <= calorieDiff)
        .sort((a, b) => a.calories - b.calories)[0] // Pick the smallest suitable meal

      if (!sideMeal || totalProvidedCalories + (sideMeal?.calories ?? 0) > totalCalories) break

      dayPlan.dinner.push(sideMeal) // Add side meal to dinner
      usedMealsSet.add(sideMeal._id)
      totalProvidedCalories += sideMeal?.calories ?? 0
      calorieDiff -= sideMeal?.calories ?? 0
    }

    // ✅ Remove Excess Calories If We Over-Shoot
    if (totalProvidedCalories > totalCalories) {
      let excess = totalProvidedCalories - totalCalories

      // First, try removing an entire side meal
      for (let mealType of selectedMealTypes) {
        let mealIndex = dayPlan[mealType]?.findIndex((meal) => meal.calories <= excess)
        if (mealIndex !== -1) {
          let removedMeal = dayPlan[mealType].splice(mealIndex, 1)[0]
          totalProvidedCalories -= removedMeal.calories
          excess -= removedMeal.calories
          break
        }
      }

      // If still excess, reduce calories from the largest meal
      if (excess > 0) {
        let largestMeal = selectedMealTypes
          .flatMap((mealType) => dayPlan[mealType])
          .sort((a, b) => b.calories - a.calories)[0] // Find highest-calorie meal

        if (largestMeal && largestMeal.calories > excess) {
          largestMeal.calories -= excess // Trim just enough calories
          totalProvidedCalories -= excess
        }
      }
    }

    // ✅ Ensure Calories Match Exactly
    dayPlan.caloriesBMR = Math.trunc(totalCalories)
    dayPlan.caloriesProvided = Math.trunc(totalProvidedCalories)

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

export const getFranchiseItems = async (campus) => {
  return Restaurants.aggregate([
    { $match: { campus: { $in: [campus] }, category: 'Dining-Halls' } },
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
