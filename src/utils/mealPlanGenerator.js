function generate21MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  rejectedMealType,
  franchiseCount = 7, // User-defined franchise meal count
  diningCount = 14, // User-defined dining meal count (21 total - franchiseCount)
  maxAttempts = 2000,
  calorieMargin = 200
) {
  // Validate input counts
  if (franchiseCount + diningCount !== 21) {
    throw new Error('The sum of franchiseCount and diningCount must equal 21 (7 days × 3 meals)')
  }

  // Calculate target per meal (1/3 of daily target)
  const targetPerMeal = targetCaloriesPerDay / 3

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

  // Track meal usage (max 2 uses per meal_id)
  const mealUsage = new Map()

  // Preprocess meals
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    const { mealType, restaurantType, _id } = meal
    if (mealsByTypeAndCategory[mealType]?.[restaurantType]) {
      mealsByTypeAndCategory[mealType][restaurantType].push(meal)
    }
    if (allMealsByType[mealType]) {
      allMealsByType[mealType].push(meal)
    }
    // Initialize meal usage count
    if (!mealUsage.has(_id)) {
      mealUsage.set(_id, 0)
    }
  })

  function getCalories(meal) {
    return meal?.totalCalories || 0
  }

  // Helper to get random meal with constraints
  function getRandomMeal(pool, maxUses = 2) {
    const available = pool.filter((meal) => mealUsage.get(meal._id) < maxUses)
    return available.length ? available[Math.floor(Math.random() * available.length)] : null
  }

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

  // === PHASE 1: Strict Requirements ===
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Reset tracking for each attempt
    const attemptMealUsage = new Map(mealUsage)
    let attemptFranchiseUsed = 0
    let attemptDiningUsed = 0
    let totalMeals = 0
    const plan = {}

    // Initialize empty plan
    for (const { day } of days) {
      plan[day] = {}
    }

    // Shuffle days for random distribution
    const shuffledDays = [...days].sort(() => Math.random() - 0.5)

    for (const { day, slots } of shuffledDays) {
      // Shuffle slots for random meal assignment
      const shuffledSlots = [...slots].sort(() => Math.random() - 0.5)

      for (const slot of shuffledSlots) {
        if (totalMeals >= 21) break

        const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)

        // Determine pool based on remaining quotas
        let poolType
        if (attemptFranchiseUsed < franchiseCount && attemptDiningUsed < diningCount) {
          poolType = Math.random() < 0.5 ? 'Franchise' : 'Dining-Halls'
        } else if (attemptFranchiseUsed < franchiseCount) {
          poolType = 'Franchise'
        } else {
          poolType = 'Dining-Halls'
        }

        let pool = mealsByTypeAndCategory[mealTypeKey][poolType]
        if (!pool.length) {
          poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
          pool = mealsByTypeAndCategory[mealTypeKey][poolType]
          if (!pool.length) continue
        }

        // Get random meal that hasn't been used twice
        const meal = getRandomMeal(pool)
        if (meal) {
          plan[day][slot] = meal
          attemptMealUsage.set(meal._id, (attemptMealUsage.get(meal._id) || 0) + 1)
          if (poolType === 'Franchise') attemptFranchiseUsed++
          else attemptDiningUsed++
          totalMeals++
        }
      }
    }

    // Check constraints
    if (attemptFranchiseUsed === franchiseCount && attemptDiningUsed === diningCount && totalMeals === 21) {
      // Calculate daily calories
      let allDaysValid = true
      for (const { day, slots } of days) {
        let dailyCalories = 0
        for (const slot of slots) {
          if (plan[day][slot]) dailyCalories += getCalories(plan[day][slot])
        }
        plan[day].totalCalories = dailyCalories

        // Check if daily calories are within margin (using larger margin for daily total)
        if (Math.abs(dailyCalories - targetCaloriesPerDay) > calorieMargin) {
          allDaysValid = false
          break
        }
      }

      if (allDaysValid) {
        finalPlan = plan
        console.log(`[Phase 1] Success! Franchise: ${franchiseCount}, Dining: ${diningCount}`)
        break
      }
    }
  }

  if (finalPlan) {
    return finalPlan
  }

  // === PHASE 2: Relaxed Requirements ===
  console.log('\n[Phase 2] Falling back to relaxed requirements')
  const relaxedPlan = {}
  const relaxedMealUsage = new Map()

  for (const { day, slots } of days) {
    relaxedPlan[day] = {}
    for (const slot of slots) {
      const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)
      const pool = allMealsByType[mealTypeKey]

      // Get random meal that hasn't been used twice
      const meal = getRandomMeal(pool)
      if (meal) {
        relaxedPlan[day][slot] = meal
        relaxedMealUsage.set(meal._id, (relaxedMealUsage.get(meal._id) || 0) + 1)
      }
    }
  }

  // Verify we have 21 meals
  let totalMeals = 0
  for (const day of days) {
    totalMeals += Object.keys(relaxedPlan[day.day]).length
  }

  if (totalMeals === 21) {
    console.log('[Phase 2] Generated plan with relaxed constraints')
    return relaxedPlan
  }

  throw new Error('Failed to generate a valid meal plan after all phases')
}

function generate19MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  rejectedmealtype,
  franchiseCount = 7, // User-defined franchise meal count
  diningCount = 12, // User-defined dining meal count (19 total - franchiseCount)
  maxAttempts = 2000,
  calorieMargin = 200
) {
  // Validate input counts
  if (franchiseCount + diningCount !== 19) {
    throw new Error('The sum of franchiseCount and diningCount must equal 19')
  }

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

  // Track meal usage (max 2 uses per meal_id)
  const mealUsage = new Map()

  // Preprocess meals
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    const { mealType, restaurantType, _id } = meal
    if (mealsByTypeAndCategory[mealType]?.[restaurantType]) {
      mealsByTypeAndCategory[mealType][restaurantType].push(meal)
    }
    if (allMealsByType[mealType]) {
      allMealsByType[mealType].push(meal)
    }
    // Initialize meal usage count
    if (!mealUsage.has(_id)) {
      mealUsage.set(_id, 0)
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

  // Helper to get random meal with constraints
  function getRandomMeal(pool, maxUses = 2) {
    const available = pool.filter((meal) => mealUsage.get(meal._id) < maxUses)
    return available.length ? available[Math.floor(Math.random() * available.length)] : null
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

  // === PHASE 1: Strict Requirements ===
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Reset tracking for each attempt
    const attemptMealUsage = new Map(mealUsage)
    let attemptFranchiseUsed = 0
    let attemptDiningUsed = 0
    let totalMeals = 0
    const plan = {}

    // Initialize empty plan
    for (const { day } of days) {
      plan[day] = {}
    }

    // STEP 1: Pre-fill high calorie meals
    for (const { day } of days) {
      const mealSlot = day === 'Monday' || day === 'Tuesday' ? 'lunch' : 'dinner'
      const mealTypeKey = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)

      // Determine pool based on remaining quotas
      let poolType = attemptFranchiseUsed < franchiseCount ? 'Franchise' : 'Dining-Halls'
      let pool = mealsByTypeAndCategory[mealTypeKey][poolType]

      // Fallback if pool empty
      if (!pool.length) {
        poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
        pool = mealsByTypeAndCategory[mealTypeKey][poolType]
      }

      // Get highest calorie meal that hasn't been used twice
      const meal = getHighCalorieMeal(pool.filter((m) => attemptMealUsage.get(m._id) < 2))
      if (meal) {
        plan[day][mealSlot] = meal
        attemptMealUsage.set(meal._id, (attemptMealUsage.get(meal._id) || 0) + 1)
        if (poolType === 'Franchise') attemptFranchiseUsed++
        else attemptDiningUsed++
        totalMeals++
      }
    }

    // STEP 2: Fill remaining slots
    const allSlots = []
    for (const { day, slots } of days) {
      for (const slot of slots) {
        if (!plan[day][slot]) {
          allSlots.push({ day, slot })
        }
      }
    }

    // Shuffle slots for random distribution
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]]
    }

    for (const { day, slot } of allSlots) {
      if (totalMeals >= 19) break

      const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)

      // Determine pool based on remaining quotas
      let poolType
      if (attemptFranchiseUsed < franchiseCount && attemptDiningUsed < diningCount) {
        poolType = Math.random() < 0.5 ? 'Franchise' : 'Dining-Halls'
      } else if (attemptFranchiseUsed < franchiseCount) {
        poolType = 'Franchise'
      } else {
        poolType = 'Dining-Halls'
      }

      let pool = mealsByTypeAndCategory[mealTypeKey][poolType]
      if (!pool.length) {
        poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
        pool = mealsByTypeAndCategory[mealTypeKey][poolType]
      }

      // Get random meal that hasn't been used twice
      const meal = getRandomMeal(pool)
      if (meal) {
        plan[day][slot] = meal
        attemptMealUsage.set(meal._id, (attemptMealUsage.get(meal._id) || 0) + 1)
        if (poolType === 'Franchise') attemptFranchiseUsed++
        else attemptDiningUsed++
        totalMeals++
      }
    }

    // STEP 3: Check constraints
    if (attemptFranchiseUsed === franchiseCount && attemptDiningUsed === diningCount && totalMeals === 19) {
      // Calculate daily calories
      let allDaysValid = true
      for (const { day, slots } of days) {
        let dailyCalories = 0
        for (const slot of slots) {
          if (plan[day][slot]) dailyCalories += getCalories(plan[day][slot])
        }
        plan[day].totalCalories = dailyCalories

        // Check if daily calories are within margin (using larger margin for daily total)
        if (Math.abs(dailyCalories - targetCaloriesPerDay) > calorieMargin) {
          allDaysValid = false
          break
        }
      }

      if (allDaysValid) {
        finalPlan = plan
        console.log(`[Phase 1] Success! Franchise: ${franchiseCount}, Dining: ${diningCount}`)
        break
      }
    }
  }

  if (finalPlan) {
    return finalPlan
  }

  // === PHASE 2: Relaxed Requirements ===
  console.log('\n[Phase 2] Falling back to relaxed requirements')
  const relaxedPlan = {}
  const relaxedMealUsage = new Map()

  for (const { day, slots } of days) {
    relaxedPlan[day] = {}
    for (const slot of slots) {
      const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)
      const pool = allMealsByType[mealTypeKey]

      // Get random meal that hasn't been used twice
      const meal = getRandomMeal(pool)
      if (meal) {
        relaxedPlan[day][slot] = meal
        relaxedMealUsage.set(meal._id, (relaxedMealUsage.get(meal._id) || 0) + 1)
      }
    }
  }

  // Verify we have 19 meals
  let totalMeals = 0
  for (const day of days) {
    totalMeals += Object.keys(relaxedPlan[day.day]).length
  }

  if (totalMeals === 19) {
    console.log('[Phase 2] Generated plan with relaxed constraints')
    return relaxedPlan
  }

  throw new Error('Failed to generate a valid meal plan after all phases')
}

function generate7MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  selectedMealType,
  franchiseMealCount = 4, // New parameter: number of meals from Franchise
  diningHallMealCount = 3, // New parameter: number of meals from Dining-Halls
  maxAttempts = 20000,
  calorieMargin = 200
) {
  // Validate input counts
  if (franchiseMealCount + diningHallMealCount !== 7) {
    throw new Error('The sum of franchiseMealCount and diningHallMealCount must equal 7')
  }

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

  // Helper function to try and generate a partial plan for a specific meal pool
  function tryGeneratePartialPlan(
    mealPool,
    count,
    allowRepeats = false,
    allowConsecutiveRepeats = true,
    existingPlan = {},
    usedMealIds = new Set()
  ) {
    const currentPlan = { ...existingPlan }
    const currentUsedMealIds = new Set([...usedMealIds])
    let lastMealId = null
    const localIssues = []

    let viableMealsInPool = mealPool.filter((meal) => {
      const totalCalories = meal?.totalCalories
      return typeof totalCalories === 'number' && Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin
    })

    if (viableMealsInPool.length === 0) {
      return { plan: null, issues: [`No viable meals in the pool within calorie margin.`] }
    }

    // Find available days (1-7) that haven't been assigned yet
    const availableDays = []
    for (let day = 1; day <= 7; day++) {
      if (!currentPlan[`day${day}`]) {
        availableDays.push(day)
      }
    }

    if (availableDays.length < count) {
      return {
        plan: null,
        issues: [`Not enough available days for partial plan (needed ${count}, found ${availableDays.length}).`],
      }
    }

    // Shuffle available days to add randomness
    for (let i = availableDays.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[availableDays[i], availableDays[j]] = [availableDays[j], availableDays[i]]
    }

    // Take the first 'count' days from the shuffled array
    const daysToAssign = availableDays.slice(0, count)

    for (const day of daysToAssign) {
      let selectedMeal = null
      let eligibleMealsForDay = []

      if (!allowRepeats) {
        eligibleMealsForDay = viableMealsInPool.filter((meal) => !currentUsedMealIds.has(meal._id.toString()))
      } else {
        eligibleMealsForDay = viableMealsInPool.filter((meal) => {
          if (!allowConsecutiveRepeats && meal._id.toString() === lastMealId) {
            return false
          }
          return true
        })
      }

      // Shuffle eligible meals
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
        break
      }

      currentPlan[`day${day}`] = {
        meal: selectedMeal,
      }
    }

    if (
      Object.keys(currentPlan).filter((k) => k.startsWith('day')).length ===
        Object.keys(existingPlan).filter((k) => k.startsWith('day')).length + count &&
      localIssues.length === 0
    ) {
      return { plan: currentPlan, issues: [], usedMealIds: currentUsedMealIds }
    } else {
      return { plan: null, issues: localIssues }
    }
  }

  // --- Phase 1: Generate partial plans for each restaurant type ---
  // First try to get franchise meals
  let finalPlan = {}
  let usedMealIds = new Set()

  if (franchiseMealCount > 0) {
    const franchiseResult = tryGeneratePartialPlan(
      franchiseMeals,
      franchiseMealCount,
      false, // no repeats
      true,
      {},
      usedMealIds
    )

    if (franchiseResult.plan) {
      finalPlan = franchiseResult.plan
      usedMealIds = franchiseResult.usedMealIds
      console.log(`Successfully generated ${franchiseMealCount} Franchise meals.`)
    } else {
      console.warn(`Failed to generate ${franchiseMealCount} Franchise meals:`, franchiseResult.issues.join(', '))
      // Fallback: try with fewer franchise meals
      for (let reducedCount = franchiseMealCount - 1; reducedCount >= 0; reducedCount--) {
        const fallbackResult = tryGeneratePartialPlan(franchiseMeals, reducedCount, false, true, {}, usedMealIds)
        if (fallbackResult.plan) {
          finalPlan = fallbackResult.plan
          usedMealIds = fallbackResult.usedMealIds
          console.warn(`Fallback: Using ${reducedCount} Franchise meals instead of ${franchiseMealCount}.`)
          franchiseMealCount = reducedCount
          diningHallMealCount = 7 - reducedCount
          break
        }
      }
    }
  }

  // Then try to get dining hall meals
  if (diningHallMealCount > 0) {
    const diningResult = tryGeneratePartialPlan(
      diningHallMeals,
      diningHallMealCount,
      false, // no repeats
      true,
      finalPlan,
      usedMealIds
    )

    if (diningResult.plan) {
      finalPlan = diningResult.plan
      usedMealIds = diningResult.usedMealIds
      console.log(`Successfully generated ${diningHallMealCount} Dining-Hall meals.`)
    } else {
      console.warn(`Failed to generate ${diningHallMealCount} Dining-Hall meals:`, diningResult.issues.join(', '))
      // Fallback: try with fewer dining hall meals
      for (let reducedCount = diningHallMealCount - 1; reducedCount >= 0; reducedCount--) {
        const fallbackResult = tryGeneratePartialPlan(
          diningHallMeals,
          reducedCount,
          false,
          true,
          finalPlan,
          usedMealIds
        )
        if (fallbackResult.plan) {
          finalPlan = fallbackResult.plan
          usedMealIds = fallbackResult.usedMealIds
          console.warn(`Fallback: Using ${reducedCount} Dining-Hall meals instead of ${diningHallMealCount}.`)
          diningHallMealCount = reducedCount
          franchiseMealCount = 7 - reducedCount
          break
        }
      }
    }
  }

  // Verify we have a complete plan
  if (Object.keys(finalPlan).filter((k) => k.startsWith('day')).length === 7) {
    return finalPlan
  }

  // --- Phase 2: Fallback strategies if Phase 1 failed ---
  // Try allowing repeats if we couldn't find enough unique meals
  console.warn('Phase 1 failed to generate complete plan, attempting fallback strategies...')

  // Reset
  finalPlan = {}
  usedMealIds = new Set()

  // First try franchise meals with repeats allowed
  if (franchiseMealCount > 0) {
    const franchiseResult = tryGeneratePartialPlan(
      franchiseMeals,
      franchiseMealCount,
      true, // allow repeats
      false, // but not consecutive
      {},
      usedMealIds
    )

    if (franchiseResult.plan) {
      finalPlan = franchiseResult.plan
      usedMealIds = franchiseResult.usedMealIds
      console.log(`Fallback: Generated ${franchiseMealCount} Franchise meals with repeats allowed.`)
    }
  }

  // Then try dining hall meals with repeats allowed
  if (diningHallMealCount > 0) {
    const diningResult = tryGeneratePartialPlan(
      diningHallMeals,
      diningHallMealCount,
      true, // allow repeats
      false, // but not consecutive
      finalPlan,
      usedMealIds
    )

    if (diningResult.plan) {
      finalPlan = diningResult.plan
      usedMealIds = diningResult.usedMealIds
      console.log(`Fallback: Generated ${diningHallMealCount} Dining-Hall meals with repeats allowed.`)
    }
  }

  // Verify we have a complete plan
  if (Object.keys(finalPlan).filter((k) => k.startsWith('day')).length === 7) {
    return finalPlan
  }

  // --- Phase 3: Final desperate fallback ---
  // If we still don't have enough meals, combine all meals and try to get 7
  console.warn('All other attempts failed, trying combined pool as last resort...')
  const combinedMeals = [...franchiseMeals, ...diningHallMeals]
  const combinedResult = tryGeneratePartialPlan(
    combinedMeals,
    7,
    true, // allow repeats
    false, // but not consecutive
    {},
    new Set()
  )

  if (combinedResult.plan) {
    return combinedResult.plan
  }

  throw new Error(
    `🛑 Critical Error: Could not generate a 7-day plan with ${franchiseMealCount} Franchise and ${diningHallMealCount} Dining-Hall meals. Issues: ${combinedResult.issues.join(
      '\n'
    )}`
  )
}

function generate14MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  preferredMealTypes,
  franchiseCount = 10,
  diningCount = 4,
  maxAttempts = 20000,
  calorieMargin = 200
) {
  const totalDays = 7

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

  // Track used meals to ensure uniqueness
  const usedMeals = {
    Breakfast: new Set(),
    Lunch: new Set(),
    Dinner: new Set(),
  }

  // Preprocess meals
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    const { mealType, restaurantType } = meal
    // Use MongoDB _id for unique identity
    if (mealsByTypeAndCategory[mealType]?.[restaurantType]) {
      mealsByTypeAndCategory[mealType][restaurantType].push(meal)
    }
    allMealsByType[mealType].push(meal)
  })

  const [firstMealType, secondMealType] = preferredMealTypes
  const plan = {}
  const issues = []

  // Track meal counts by restaurant type
  let franchiseMealsUsed = 0
  let diningMealsUsed = 0

  for (let day = 1; day <= totalDays; day++) {
    let validCombo = null

    // Phase 1: Try to meet franchise/dining requirements with unused meals
    const A = firstMealType
    const B = secondMealType

    // Get available meals (not used yet) for each restaurant type
    const getAvailableMeals = (mealType, restaurantType) => {
      const meals = mealsByTypeAndCategory[mealType]?.[restaurantType] || []
      return meals.filter((meal) => !usedMeals[mealType].has(meal._id))
    }

    // Determine what restaurant types we can use based on remaining counts
    const canUseFranchise = franchiseMealsUsed < franchiseCount
    const canUseDining = diningMealsUsed < diningCount

    const tryCombinations = []

    // If we can use both types, try mixed combinations first
    if (canUseFranchise && canUseDining) {
      tryCombinations.push(
        {
          mealAList: getAvailableMeals(A, 'Franchise'),
          mealBList: getAvailableMeals(B, 'Dining-Halls'),
          franchiseCount: 1,
          diningCount: 1,
          description: `${A}(Franchise) + ${B}(Dining-Halls)`,
        },
        {
          mealAList: getAvailableMeals(A, 'Dining-Halls'),
          mealBList: getAvailableMeals(B, 'Franchise'),
          franchiseCount: 1,
          diningCount: 1,
          description: `${A}(Dining-Halls) + ${B}(Franchise)`,
        }
      )
    }

    // If we need 2 franchise meals and have the quota
    if (franchiseMealsUsed + 2 <= franchiseCount) {
      tryCombinations.push({
        mealAList: getAvailableMeals(A, 'Franchise'),
        mealBList: getAvailableMeals(B, 'Franchise'),
        franchiseCount: 2,
        diningCount: 0,
        description: `${A}(Franchise) + ${B}(Franchise)`,
      })
    }

    // If we need 2 dining meals and have the quota
    if (diningMealsUsed + 2 <= diningCount) {
      tryCombinations.push({
        mealAList: getAvailableMeals(A, 'Dining-Halls'),
        mealBList: getAvailableMeals(B, 'Dining-Halls'),
        franchiseCount: 0,
        diningCount: 2,
        description: `${A}(Dining-Halls) + ${B}(Dining-Halls)`,
      })
    }

    for (const {
      mealAList,
      mealBList,
      franchiseCount: comboFranchiseCount,
      diningCount: comboDiningCount,
      description,
    } of tryCombinations) {
      if (!mealAList.length || !mealBList.length) continue

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const mealA = mealAList[Math.floor(Math.random() * mealAList.length)]
        const mealB = mealBList[Math.floor(Math.random() * mealBList.length)]

        // Ensure we don't pick the same meal twice (if same meal type)
        if (A === B && mealA._id === mealB._id) continue

        const totalCalories = mealA.totalCalories + mealB.totalCalories

        if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = {
            mealA,
            mealB,
            franchiseCount: comboFranchiseCount,
            diningCount: comboDiningCount,
            description,
          }
          break
        }
      }

      if (validCombo) break
    }

    if (!validCombo) {
      console.warn(`⚠️ Day ${day}: Couldn't find valid combination meeting franchise/dining quotas with unused meals.`)
    }

    // Phase 2: Relaxed attempt using any available unused meals
    if (!validCombo) {
      const getAvailableAnyCategory = (mealType) => {
        return allMealsByType[mealType].filter((meal) => !usedMeals[mealType].has(meal._id))
      }

      const anyMealsA = getAvailableAnyCategory(firstMealType)
      const anyMealsB = getAvailableAnyCategory(secondMealType)

      if (anyMealsA.length && anyMealsB.length) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const mealA = anyMealsA[Math.floor(Math.random() * anyMealsA.length)]
          const mealB = anyMealsB[Math.floor(Math.random() * anyMealsB.length)]

          // Ensure we don't pick the same meal twice (if same meal type)
          if (firstMealType === secondMealType && mealA._id === mealB._id) continue

          const totalCalories = mealA.totalCalories + mealB.totalCalories

          if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
            validCombo = { mealA, mealB, description: 'Relaxed mode (any unused meals)' }
            console.warn(`⚠️ Day ${day}: Using relaxed mode with unused meals.`)
            break
          }
        }
      }
    }

    // Phase 3: Last resort - allow reusing meals
    if (!validCombo) {
      const anyMealsA = allMealsByType[firstMealType]
      const anyMealsB = allMealsByType[secondMealType]

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const mealA = anyMealsA[Math.floor(Math.random() * anyMealsA.length)]
        const mealB = anyMealsB[Math.floor(Math.random() * anyMealsB.length)]

        // Ensure we don't pick the same meal twice (if same meal type)
        if (firstMealType === secondMealType && mealA._id === mealB._id) continue

        const totalCalories = mealA.totalCalories + mealB.totalCalories

        if (Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = { mealA, mealB, description: 'Last resort (allowing reused meals)' }
          console.warn(`⚠️ Day ${day}: Using last resort mode (reusing meals).`)
          break
        }
      }
    }

    // Final fail
    if (!validCombo) {
      issues.push(`❌ Couldn't generate valid meal for Day ${day} (target: ${targetRestaurantType}).`)
      continue
    }

    // Mark meals as used and update counts
    usedMeals[firstMealType].add(validCombo.mealA._id)
    usedMeals[secondMealType].add(validCombo.mealB._id)

    // Update franchise/dining counts
    franchiseMealsUsed += validCombo.franchiseCount
    diningMealsUsed += validCombo.diningCount

    plan[`day${day}`] = {
      mealTypeA: validCombo.mealA,
      mealTypeB: validCombo.mealB,
      selectionMethod: validCombo.description,
    }

    console.log(
      `✅ Day ${day}: ${validCombo.description} - ${
        validCombo.mealA.totalCalories + validCombo.mealB.totalCalories
      } calories (F: ${franchiseMealsUsed}/${franchiseCount}, D: ${diningMealsUsed}/${diningCount})`
    )
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
