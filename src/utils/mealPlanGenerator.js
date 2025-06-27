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

  // Organize meals by type and category
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    const { mealType, restaurantType } = meal
    if (mealsByTypeAndCategory[mealType]?.[restaurantType]) {
      mealsByTypeAndCategory[mealType][restaurantType].push(meal)
    }
    if (allMealsByType[mealType]) {
      allMealsByType[mealType].push(meal)
    }
  })

  function getCalories(meal) {
    return meal?.totalCalories || 0
  }

  function getHighCalorieMeal(pool) {
    return pool?.length
      ? pool.reduce((max, meal) => (getCalories(meal) > getCalories(max) ? meal : max), pool[0])
      : null
  }

  const days = [
    { day: 'Monday', slots: ['breakfast', 'lunch'] },
    { day: 'Tuesday', slots: ['breakfast', 'lunch'] },
    { day: 'Wednesday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Thursday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Friday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Saturday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Sunday', slots: ['breakfast', 'lunch', 'dinner'] },
  ]

  let finalPlan = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let plan = {}
    let franchiseCount = 0
    let diningCount = 0
    let totalMeals = 0

    // Initialize empty plan
    for (const { day } of days) {
      plan[day] = {}
    }

    // === STEP 1: Pre-fill high calorie meals ===
    for (const { day } of days) {
      const mealSlot = day === 'Monday' || day === 'Tuesday' ? 'lunch' : 'dinner'
      const mealTypeKey = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)

      let poolType = franchiseCount < 7 ? 'Franchise' : 'Dining-Halls'
      let pool = mealsByTypeAndCategory[mealTypeKey][poolType]

      // Fallback if pool empty
      if (!pool.length) {
        poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
        pool = mealsByTypeAndCategory[mealTypeKey][poolType]
      }

      const meal = getHighCalorieMeal(pool)
      if (meal) {
        plan[day][mealSlot] = meal
        if (poolType === 'Franchise') franchiseCount++
        else diningCount++
        totalMeals++
      }
    }

    // === STEP 2: Randomly fill remaining slots ===

    const allSlots = []
    for (const { day, slots } of days) {
      for (const slot of slots) {
        allSlots.push({ day, slot })
      }
    }

    // Shuffle the slot list
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]]
    }

    for (const { day, slot } of allSlots) {
      if (totalMeals >= 19) break
      if (plan[day][slot]) continue // already filled by high-calorie meal

      let poolType
      if (franchiseCount < 7 && diningCount < 12) {
        poolType = Math.random() < 0.5 ? 'Franchise' : 'Dining-Halls'
      } else if (franchiseCount < 7) {
        poolType = 'Franchise'
      } else {
        poolType = 'Dining-Halls'
      }

      const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)
      let pool = mealsByTypeAndCategory[mealTypeKey][poolType]

      if (!pool.length) {
        poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
        pool = mealsByTypeAndCategory[mealTypeKey][poolType]
        if (!pool.length) continue
      }

      const meal = pool[Math.floor(Math.random() * pool.length)]
      plan[day][slot] = meal
      if (poolType === 'Franchise') franchiseCount++
      else diningCount++
      totalMeals++
    }

    // === STEP 3: Check constraints ===
    if (franchiseCount === 7 && diningCount === 12 && totalMeals === 19) {
      for (const { day, slots } of days) {
        let dailyCalories = 0
        for (const slot of slots) {
          if (plan[day][slot]) dailyCalories += getCalories(plan[day][slot])
        }
        plan[day].totalCalories = dailyCalories
      }
      finalPlan = plan
      break
    }
  }

  if (finalPlan) {
    console.log('phase 1')
    return finalPlan
  }

  // === PHASE 2: Strict category-based selection (3 meals/day) ===
  const plan = {}
  const issues = []

  for (let day = 1; day <= 7; day++) {
    const category = day <= 3 ? 'Franchise' : 'Dining-Halls' // First 3 days: Franchise

    let breakfastOptions = mealsByTypeAndCategory.Breakfast[category]
    let lunchOptions = mealsByTypeAndCategory.Lunch[category]
    let dinnerOptions = mealsByTypeAndCategory.Dinner[category]

    let validCombo = null

    // Try to find a valid meal combo within calorie margin
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

    // === PHASE 3: Fallback to all meals (any restaurant type) ===
    if (!validCombo) {
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

    if (!validCombo) {
      issues.push(`Couldn't find valid meals for Day ${day}`)
      continue
    }

    // Apply rejectedmealtype filtering ONLY in Phase 2/3
    const dayKey = `day${day}`
    plan[dayKey] = { ...validCombo }

    if (rejectedmealtype === 'Lunch') delete plan[dayKey].lunch
    if (rejectedmealtype === 'Dinner') delete plan[dayKey].dinner
    if (rejectedmealtype === 'Breakfast') delete plan[dayKey].breakfast
  }

  if (issues.length > 0) {
    throw new Error(`Meal plan generation failed:\n${issues.join('\n')}`)
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
    const A = firstMealType
    const B = secondMealType

    const tryCombinations = [
      {
        mealAList: mealsByTypeAndCategory[A]?.Franchise || [],
        mealBList: mealsByTypeAndCategory[B]?.['Dining-Halls'] || [],
      },
      {
        mealAList: mealsByTypeAndCategory[A]?.['Dining-Halls'] || [],
        mealBList: mealsByTypeAndCategory[B]?.Franchise || [],
      },
    ]

    for (const { mealAList, mealBList } of tryCombinations) {
      if (!mealAList.length || !mealBList.length) continue

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const mealA = mealAList[Math.floor(Math.random() * mealAList.length)]
        const mealB = mealBList[Math.floor(Math.random() * mealBList.length)]

        const totalCalories = mealA.totalCalories + mealB.totalCalories

        if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = { mealA, mealB }
          break
        }
      }

      if (validCombo) break
    }

    if (!validCombo) {
      console.warn(`⚠️ Day ${day}: Couldn't find valid Franchise + Dining combo in strict mode.`)
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
