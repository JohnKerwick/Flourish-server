function generate19MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  rejectedmealtype,
  maxAttempts = 2000,
  calorieMargin = 200
) {
  const mealsByTypeAndCategory = {
    Breakfast: { Franchise: [], 'Dining-Halls': [] },
    Lunch: { Franchise: [], 'Dining-Halls': [] },
    Dinner: { Franchise: [], 'Dining-Halls': [] },
  }

  const allMealsByType = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
  }
  ;[
    // Step 1: Organize meals
    breakfastMeals,
    lunchMeals,
    dinnerMeals,
  ]
    .flat()
    .forEach((meal) => {
      const { mealType, restaurantType } = meal

      if (mealsByTypeAndCategory[mealType]?.[restaurantType]) {
        mealsByTypeAndCategory[mealType][restaurantType].push(meal)
      }

      if (allMealsByType[mealType]) {
        allMealsByType[mealType].push(meal)
      }
    })

  const plan = {}
  const issues = []

  for (let day = 1; day <= 7; day++) {
    const category = day <= 3 ? 'Franchise' : 'Dining-Halls'

    let breakfastOptions = mealsByTypeAndCategory.Breakfast[category]
    let lunchOptions = mealsByTypeAndCategory.Lunch[category]
    let dinnerOptions = mealsByTypeAndCategory.Dinner[category]

    let validCombo = null

    // Phase 1: Strict category-based selection
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const breakfast = breakfastOptions[Math.floor(Math.random() * breakfastOptions.length)]
      const lunch = lunchOptions[Math.floor(Math.random() * lunchOptions.length)]
      const dinner = dinnerOptions[Math.floor(Math.random() * dinnerOptions.length)]

      const totalCalories = breakfast?.totalCalories + lunch?.totalCalories + dinner?.totalCalories

      if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
        validCombo = { breakfast, lunch, dinner }
        break
      }
    }

    // Phase 2: Fallback to all meals (any restaurant type)
    if (!validCombo) {
      console.warn(`⚠️ Day ${day}: Relaxing category restriction to include all restaurant types`)
      breakfastOptions = allMealsByType.Breakfast
      lunchOptions = allMealsByType.Lunch
      dinnerOptions = allMealsByType.Dinner

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const breakfast = breakfastOptions[Math.floor(Math.random() * breakfastOptions.length)]
        const lunch = lunchOptions[Math.floor(Math.random() * lunchOptions.length)]
        const dinner = dinnerOptions[Math.floor(Math.random() * dinnerOptions.length)]

        const totalCalories = breakfast.totalCalories + lunch.totalCalories + dinner.totalCalories

        if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = { breakfast, lunch, dinner }
          break
        }
      }
    }

    // Final error if still no combo found
    if (!validCombo) {
      issues.push(`❌ Couldn't find valid meal combination for Day ${day}`)
      continue
    }

    plan[`day${day}`] = {
      breakfast: validCombo.breakfast,
      lunch: validCombo.lunch,
      dinner: validCombo.dinner,
    }
  }

  if (issues.length > 0) {
    throw new Error(`🚫 Meal plan generation failed for the following days:\n${issues.join('\n')}`)
  }
  if (rejectedmealtype == 'Lunch') {
    if (plan.day2?.lunch) delete plan.day2.lunch
    if (plan.day3?.lunch) delete plan.day3.lunch
  }
  if (rejectedmealtype == 'Dinner') {
    if (plan.day2?.dinner) delete plan.day2.dinner
    if (plan.day3?.dinner) delete plan.day3.dinner
  }
  if (rejectedmealtype == 'Breakfast') {
    if (plan.day2?.breakfast) delete plan.day2.breakfast
    if (plan.day3?.breakfast) delete plan.day3.breakfast
  }

  return plan
}

function generate7MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  selectedMealType,
  maxAttempts = 20000,
  calorieMargin = 200
) {
  const mealsByTypeAndCategory = {
    Breakfast: { Franchise: [], 'Dining-Halls': [] },
    Lunch: { Franchise: [], 'Dining-Halls': [] },
    Dinner: { Franchise: [], 'Dining-Halls': [] },
  }

  const allMealsByType = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
  }

  // Step 1: Categorize meals
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    if (meal.restaurantType === 'Franchise') {
      mealsByTypeAndCategory[meal.mealType]?.Franchise.push(meal)
    }
    if (meal.restaurantType === 'Dining-Halls') {
      mealsByTypeAndCategory[meal.mealType]?.['Dining-Halls'].push(meal)
    }
    allMealsByType[meal.mealType]?.push(meal)
  })

  const franchiseMeals = mealsByTypeAndCategory[selectedMealType].Franchise
  const diningHallMeals = mealsByTypeAndCategory[selectedMealType]['Dining-Halls']
  const combineMeals = [...franchiseMeals, ...diningHallMeals]
  console.log('diningmeals', combineMeals)

  const plan = {}
  const issues = []

  for (let day = 1; day <= 7; day++) {
    let selectedMeal = null

    // Phase 1: Franchise only
    if (diningHallMeals.length > 0) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const meal = diningHallMeals[Math.floor(Math.random() * diningHallMeals.length)]
        const totalCalories = meal?.totalCalories
        if (typeof totalCalories === 'number' && Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          selectedMeal = meal
          break
        }
      }
    }

    // Phase 2: Use combined Franchise + Dining-Halls (no restriction)

    if (combineMeals.length > 0) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const meal = combineMeals[Math.floor(Math.random() * combineMeals.length)]
        const totalCalories = meal?.totalCalories
        if (typeof totalCalories === 'number' && Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          selectedMeal = meal
          break
        }
      }
    }

    if (!selectedMeal) {
      issues.push(`❌ Couldn't find valid meal for Day ${day}`)
      continue
    }

    plan[`day${day}`] = {
      meal: selectedMeal,
    }
  }

  if (issues.length > 0) {
    throw new Error(`⚠️ Some days failed:\n${issues.join('\n')}`)
  }

  return plan
}

function generate14MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  preferredMealTypes,
  maxAttempts = 20000,
  calorieMargin = 200
) {
  const mealsByTypeAndCategory = {
    Breakfast: { Franchise: [], 'Dining-Halls': [] },
    Lunch: { Franchise: [], 'Dining-Halls': [] },
    Dinner: { Franchise: [], 'Dining-Halls': [] },
  }

  const allMealsByType = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
  }

  // Preprocess meals
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    const { mealType, restaurantType } = meal
    if (mealsByTypeAndCategory[mealType]?.[restaurantType]) {
      mealsByTypeAndCategory[mealType][restaurantType].push(meal)
    }
    allMealsByType[mealType].push(meal)
  })

  const [firstMealType, secondMealType] = preferredMealTypes
  const plan = {}
  const issues = []

  for (let day = 1; day <= 7; day++) {
    let validCombo = null

    // Phase 1: Try Franchise + Dining-Halls
    const franchiseMeals = mealsByTypeAndCategory[firstMealType].Franchise
    const diningMeals = mealsByTypeAndCategory[secondMealType]['Dining-Halls']

    if (!franchiseMeals.length || !diningMeals.length) {
      console.warn(`⚠️ Day ${day}: Missing Franchise or Dining-Halls meals. Skipping strict mode.`)
    } else {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const franchiseMeal = franchiseMeals[Math.floor(Math.random() * franchiseMeals.length)]
        const diningMeal = diningMeals[Math.floor(Math.random() * diningMeals.length)]

        const totalCalories = franchiseMeal.totalCalories + diningMeal.totalCalories

        if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = { mealA: franchiseMeal, mealB: diningMeal }
          break
        }
      }
    }

    // Phase 2: Relaxed attempt using any category
    if (!validCombo) {
      const anyMealsA = allMealsByType[firstMealType]
      const anyMealsB = allMealsByType[secondMealType]

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const mealA = anyMealsA[Math.floor(Math.random() * anyMealsA.length)]
        const mealB = anyMealsB[Math.floor(Math.random() * anyMealsB.length)]

        const totalCalories = mealA.totalCalories + mealB.totalCalories

        if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = { mealA, mealB }
          console.warn(`⚠️ Day ${day}: Using relaxed category mode (any restaurant type).`)
          break
        }
      }
    }

    // Final fail
    if (!validCombo) {
      issues.push(`❌ Couldn't generate valid meal for Day ${day} even in relaxed mode.`)
      continue
    }

    plan[`day${day}`] = {
      mealTypeA: validCombo.mealA,
      mealTypeB: validCombo.mealB,
    }
  }

  if (issues.length > 0) {
    throw new Error(`⚠️ Some days failed:\n${issues.join('\n')}`)
  }

  return plan
}

module.exports = {
  generate19MealPlan,
  generate14MealPlan,
  generate7MealPlan,
}
