function generate21MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  rejectedMealType,
  maxAttempts = 2000,
  calorieMargin = 200
) {
  // Organize meals by type and category
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

  function getCalories(meal) {
    return meal?.totalCalories || 0
  }

  function getHighCalorieMeal(pool) {
    return pool?.length
      ? pool.reduce((max, meal) => (getCalories(meal) > getCalories(max) ? meal : max), pool[0])
      : null
  }

  // Updated day structure for 21 meals (3 meals/day for all days)
  const days = [
    { day: 'Monday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Tuesday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Wednesday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Thursday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Friday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Saturday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Sunday', slots: ['breakfast', 'lunch', 'dinner'] },
  ]

  let finalPlan = null

  // === PHASE 1: Optimized balanced distribution ===
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let plan = {}
    let franchiseCount = 0
    let diningCount = 0
    let totalMeals = 0

    // Initialize empty plan
    for (const { day } of days) {
      plan[day] = {}
    }

    // STEP 1: Pre-fill high calorie meals for dinner slots
    for (const { day } of days) {
      const mealSlot = 'dinner' // Now always filling dinner slots first
      const mealTypeKey = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)

      // Balance between franchise and dining (7 franchise, 14 dining total)
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

    // STEP 2: Randomly fill remaining slots
    const allSlots = []
    for (const { day, slots } of days) {
      for (const slot of slots) {
        if (!plan[day][slot]) {
          // Only add unfilled slots
          allSlots.push({ day, slot })
        }
      }
    }

    // Shuffle the slot list
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]]
    }

    for (const { day, slot } of allSlots) {
      if (totalMeals >= 21) break

      let poolType
      if (franchiseCount < 7 && diningCount < 14) {
        // Prefer dining halls for breakfast/lunch
        if (slot === 'breakfast' || slot === 'lunch') {
          poolType = Math.random() < 0.7 ? 'Dining-Halls' : 'Franchise'
        } else {
          poolType = Math.random() < 0.5 ? 'Franchise' : 'Dining-Halls'
        }
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

    // STEP 3: Check constraints
    if (franchiseCount === 7 && diningCount === 14 && totalMeals === 21) {
      // Calculate daily calories
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
    console.log('Generated plan in Phase 1')
    return finalPlan
  }

  // === PHASE 2: Fallback with strict category distribution ===
  const plan = {}
  const issues = []

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const dayKey = `day${dayNum}`
    plan[dayKey] = {}

    // First 3 days get 1 franchise meal, rest dining
    const franchiseSlots = dayNum <= 3 ? 1 : 0
    let franchiseUsed = 0

    const slots = ['breakfast', 'lunch', 'dinner']
    const shuffledSlots = [...slots].sort(() => Math.random() - 0.5)

    for (const slot of shuffledSlots) {
      const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)
      let poolType

      if (franchiseUsed < franchiseSlots) {
        poolType = 'Franchise'
      } else {
        poolType = 'Dining-Halls'
      }

      let pool = mealsByTypeAndCategory[mealTypeKey][poolType]
      if (!pool.length) {
        // Fallback to other type if pool is empty
        poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
        pool = mealsByTypeAndCategory[mealTypeKey][poolType]
      }

      if (pool.length) {
        const meal = pool[Math.floor(Math.random() * pool.length)]
        plan[dayKey][slot] = meal
        if (poolType === 'Franchise') franchiseUsed++
      }
    }

    // Apply rejected meal type filtering
  }

  // === PHASE 3: Final fallback - any restaurant type ===
  // (Same as original but ensures 21 meals)
  if (Object.keys(plan).length < 7) {
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const dayKey = `day${dayNum}`
      if (!plan[dayKey] || Object.keys(plan[dayKey]).length < 3) {
        const breakfast = allMealsByType.Breakfast[Math.floor(Math.random() * allMealsByType.Breakfast.length)]
        const lunch = allMealsByType.Lunch[Math.floor(Math.random() * allMealsByType.Lunch.length)]
        const dinner = allMealsByType.Dinner[Math.floor(Math.random() * allMealsByType.Dinner.length)]

        plan[dayKey] = { breakfast, lunch, dinner }
      }
    }
  }

  // Verify we have 21 meals (7 days × 3 meals)
  let totalMeals = 0
  let franchiseCount = 0
  let diningCount = 0

  for (const dayKey in plan) {
    for (const slot in plan[dayKey]) {
      if (slot !== 'totalCalories') {
        totalMeals++
        const meal = plan[dayKey][slot]
        if (meal.restaurantType === 'Franchise') {
          franchiseCount++
        } else {
          diningCount++
        }
      }
    }
  }

  if (totalMeals < 21 || diningCount < 14) {
    issues.push(`Could only generate ${totalMeals} meals (${franchiseCount} franchise, ${diningCount} dining)`)
  }

  if (issues.length > 0) {
    console.warn('Meal plan generation issues:', issues)
  }

  return plan
}

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
  maxAttempts = 20000, // Max attempts for finding a single day's meal within a pool
  calorieMargin = 200
) {
  const mealsByTypeAndCategory = {
    Breakfast: { Franchise: [], 'Dining-Halls': [] },
    Lunch: { Franchise: [], 'Dining-Halls': [] },
    Dinner: { Franchise: [], 'Dining-Halls': [] },
  }

  // Step 1: Categorize meals
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    if (meal.restaurantType === 'Franchise') {
      mealsByTypeAndCategory[meal.mealType]?.Franchise.push(meal)
    }
    if (meal.restaurantType === 'Dining-Halls') {
      mealsByTypeAndCategory[meal.mealType]?.['Dining-Halls'].push(meal)
    }
  })

  const franchiseMeals = mealsByTypeAndCategory[selectedMealType].Franchise
  const diningHallMeals = mealsByTypeAndCategory[selectedMealType]['Dining-Halls']
  const combinedMeals = [...franchiseMeals, ...diningHallMeals]

  // Helper function to try and generate a plan with given constraints
  function tryGeneratePlan(
    mealPool,
    allowRepeats = false,
    allowConsecutiveRepeats = true, // New parameter for consecutive repeats
    daysToPlan = 7
  ) {
    const currentPlan = {}
    const currentUsedMealIds = new Set()
    let lastMealId = null // To track for consecutive repeats
    const localIssues = []

    let viableMealsInPool = mealPool.filter((meal) => {
      const totalCalories = meal?.totalCalories
      return typeof totalCalories === 'number' && Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin
    })

    if (viableMealsInPool.length === 0) {
      return { plan: null, issues: [`No viable meals in the pool for ${selectedMealType} within calorie margin.`] }
    }

    for (let day = 1; day <= daysToPlan; day++) {
      let selectedMeal = null
      let eligibleMealsForDay = []

      if (!allowRepeats) {
        // No repeats allowed: filter out already used meals
        eligibleMealsForDay = viableMealsInPool.filter((meal) => !currentUsedMealIds.has(meal._id.toString()))
      } else {
        // Repeats allowed, but check for consecutive if restricted
        eligibleMealsForDay = viableMealsInPool.filter((meal) => {
          if (!allowConsecutiveRepeats && meal._id.toString() === lastMealId) {
            return false // Skip if it's the same as the last day's meal
          }
          return true
        })
      }

      // Shuffle eligible meals to add randomness to selection
      for (let i = eligibleMealsForDay.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[eligibleMealsForDay[i], eligibleMealsForDay[j]] = [eligibleMealsForDay[j], eligibleMealsForDay[i]]
      }

      if (eligibleMealsForDay.length > 0) {
        selectedMeal = eligibleMealsForDay[0]
        currentUsedMealIds.add(selectedMeal._id.toString())
        lastMealId = selectedMeal._id.toString()
      }

      if (!selectedMeal) {
        localIssues.push(`Could not find a suitable meal for Day ${day} within the current pool and constraints.`)
        break // This attempt failed for this day
      }

      currentPlan[`day${day}`] = {
        meal: selectedMeal,
      }
    }

    if (Object.keys(currentPlan).length === daysToPlan && localIssues.length === 0) {
      return { plan: currentPlan, issues: [] } // Success
    } else {
      return { plan: null, issues: localIssues } // Failure
    }
  }

  // --- Attempt 1: Franchise Only, No Repeats ---
  if (franchiseMeals.length >= 7) {
    const result1 = tryGeneratePlan(franchiseMeals, false, true, 7) // allowConsecutiveRepeats is true, but no repeats means it's irrelevant
    if (result1.plan) {
      console.log('Successfully generated plan: Franchise Only, No Repeats.')
      return result1.plan
    } else {
      console.warn('Attempt 1 failed (Franchise Only, No Repeats):', result1.issues.join(', '))
    }
  } else {
    console.warn('Skipping Attempt 1: Not enough unique Franchise meals to cover 7 days.')
  }

  // --- Attempt 2: Franchise Only, With Repeats (but not on consecutive days) ---
  // This attempt should only proceed if Attempt 1 failed.
  if (franchiseMeals.length > 0) {
    // Must have some franchise meals to attempt this
    const result2 = tryGeneratePlan(franchiseMeals, true, false, 7) // allowRepeats=true, allowConsecutiveRepeats=false
    if (result2.plan) {
      console.log('Successfully generated plan: Franchise Only, With Non-Consecutive Repeats.')
      return result2.plan
    } else {
      console.warn('Attempt 2 failed (Franchise Only, Non-Consecutive Repeats):', result2.issues.join(', '))
    }
  } else {
    console.warn('Skipping Attempt 2: No Franchise meals available for this meal type.')
  }

  // --- Attempt 3: Combined Meals (Franchise + Dining-Halls), No Repeats (Last Resort) ---
  // This attempt should only proceed if Attempt 1 and Attempt 2 failed.
  if (combinedMeals.length >= 7) {
    // Must have enough unique combined meals
    console.warn('Attempting final fallback: Combined Meals, No Repeats.')
    const result3 = tryGeneratePlan(combinedMeals, false, true, 7) // allowRepeats=false, allowConsecutiveRepeats=true (irrelevant)
    if (result3.plan) {
      console.log('Successfully generated plan: Combined Meals, No Repeats (Fallback).')
      return result3.plan
    } else {
      // If even this fails, something is seriously wrong
      throw new Error(
        `🛑 Critical Error: Could not generate a 7-day plan even with combined meals and no repetitions. Issues: ${result3.issues.join(
          '\n'
        )}`
      )
    }
  } else {
    throw new Error(
      `🛑 Critical Error: Not enough unique combined meals to cover 7 days for the last fallback attempt.`
    )
  }
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
  generate21MealPlan,
}
