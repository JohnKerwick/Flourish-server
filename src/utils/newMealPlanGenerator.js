function generate21MealPlan(
  breakfastFranchiseFastMeals,
  breakfastDiningFastMeals,
  lunchFranchiseFastMeals,
  lunchDiningFastMeals,
  dinnerFranchiseFastMeals,
  dinnerDiningFastMeals,
  targetCaloriesPerDay,
  rejectedMealType,
  franchiseCount,
  diningCount,
  maxAttempts = 2000,
  calorieMargin = 300
) {
  // Log all input arguments
  console.log('generate21MealPlan called with:', {
    breakfastFranchiseFastMealsLength: breakfastFranchiseFastMeals.length,
    breakfastDiningFastMealsLength: breakfastDiningFastMeals.length,
    lunchFranchiseFastMealsLength: lunchFranchiseFastMeals.length,
    lunchDiningFastMealsLength: lunchDiningFastMeals.length,
    dinnerFranchiseFastMealsLength: dinnerFranchiseFastMeals.length,
    dinnerDiningFastMealsLength: dinnerDiningFastMeals.length,
    targetCaloriesPerDay,
    rejectedMealType,
    franchiseCount,
    diningCount,
    maxAttempts,
    calorieMargin,
  })

  // Validate input counts
  if (franchiseCount + diningCount !== 21) {
    console.error(
      'Invalid franchiseCount + diningCount:',
      franchiseCount,
      '+',
      diningCount,
      '=',
      franchiseCount + diningCount
    )
    throw new Error('The sum of franchiseCount and diningCount must equal 21')
  }

  // Organize meals by type and category
  const mealsByTypeAndCategory = {
    Breakfast: { Franchise: breakfastFranchiseFastMeals, 'Dining-Halls': breakfastDiningFastMeals },
    Lunch: { Franchise: lunchFranchiseFastMeals, 'Dining-Halls': lunchDiningFastMeals },
    Dinner: { Franchise: dinnerFranchiseFastMeals, 'Dining-Halls': dinnerDiningFastMeals },
  }
  console.log('mealsByTypeAndCategory keys:', Object.keys(mealsByTypeAndCategory))

  const allMealsByType = {
    Breakfast: [...breakfastFranchiseFastMeals, ...breakfastDiningFastMeals],
    Lunch: [...lunchFranchiseFastMeals, ...lunchDiningFastMeals],
    Dinner: [...dinnerFranchiseFastMeals, ...dinnerDiningFastMeals],
  }

  // Track meal usage (max 2 uses per meal_id)
  const mealUsage = new Map()

  // Initialize meal usage count
  for (const mealType in allMealsByType) {
    for (const meal of allMealsByType[mealType]) {
      if (!mealUsage.has(meal._id)) {
        mealUsage.set(meal._id, 0)
      }
    }
  }
  console.log('Initialized mealUsage for', mealUsage.size, 'meals')

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

  // Updated days structure for 21 meals (3 meals per day for 7 days)
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
  let phase1Success = false
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt % 100 === 0) console.log(`[Phase 1] Attempt ${attempt}`)
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

    // STEP 1: Fill meals respecting counts and calorie constraints
    let success = true
    for (const { day, slots } of days) {
      for (const slot of slots) {
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
        if (!pool || pool.length === 0) {
          // Try the other pool type if current one is empty
          poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
          pool = mealsByTypeAndCategory[mealTypeKey][poolType]
          if (!pool || pool.length === 0) {
            console.warn(`[Phase 1] No meals available for ${mealTypeKey} ${poolType}`)
            success = false
            break
          }
        }

        const meal = getRandomMeal(pool)
        if (!meal) {
          console.warn(`[Phase 1] No available meal for ${mealTypeKey} ${poolType} (all used up)`)
          success = false
          break
        }

        plan[day][slot] = meal
        attemptMealUsage.set(meal._id, (attemptMealUsage.get(meal._id) || 0) + 1)
        if (poolType === 'Franchise') attemptFranchiseUsed++
        else attemptDiningUsed++
        totalMeals++
      }
      if (!success) break
    }

    // Check if we successfully filled all meals with correct counts
    if (success && attemptFranchiseUsed === franchiseCount && attemptDiningUsed === diningCount && totalMeals === 21) {
      // Calculate daily calories and check constraints
      let allDaysValid = true
      for (const { day, slots } of days) {
        let dailyCalories = 0
        for (const slot of slots) {
          if (plan[day][slot]) dailyCalories += getCalories(plan[day][slot])
        }
        plan[day].totalCalories = dailyCalories

        if (Math.abs(dailyCalories - targetCaloriesPerDay) > calorieMargin) {
          allDaysValid = false
          console.log(`[Phase 1] Day ${day} calories out of margin:`, dailyCalories)
          break
        }
      }

      if (allDaysValid) {
        finalPlan = plan
        phase1Success = true
        console.log(`[Phase 1] Success! Franchise: ${franchiseCount}, Dining: ${diningCount}`)
        // Log used meal IDs and their usage count
        const usedMeals = Array.from(mealUsage.entries()).filter(([id, count]) => count > 0)
        console.log('[Phase 1] Used meal IDs and counts:', usedMeals)
        break
      }
    }
  }

  if (finalPlan) {
    console.log('[Phase 1] Final plan generated successfully')
    return finalPlan
  }

  // === PHASE 2: Fallback with relaxed constraints ===
  console.log('\n[Phase 2] Falling back to relaxed requirements')

  // Check if all dining meals are empty
  const allDiningEmpty =
    breakfastDiningFastMeals.length === 0 && lunchDiningFastMeals.length === 0 && dinnerDiningFastMeals.length === 0

  // If Phase 1 failed or no dining meals, set franchiseCount to 7
  if (!phase1Success || allDiningEmpty) {
    franchiseCount = 7
  }

  // Reset counts for phase 2
  let remainingFranchise = franchiseCount
  let remainingDining = diningCount
  const phase2Plan = {}
  const phase2MealUsage = new Map(mealUsage)

  // Initialize empty plan
  for (const { day } of days) {
    phase2Plan[day] = {}
  }

  // First, try to fulfill franchise and dining counts separately
  for (const { day, slots } of days) {
    for (const slot of slots) {
      const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)

      // Try to fulfill franchise first if needed
      if (remainingFranchise > 0) {
        const franchisePool = mealsByTypeAndCategory[mealTypeKey]['Franchise']
        if (franchisePool && franchisePool.length > 0) {
          const meal = getRandomMeal(franchisePool, 2)
          if (meal) {
            phase2Plan[day][slot] = meal
            phase2MealUsage.set(meal._id, (phase2MealUsage.get(meal._id) || 0) + 1)
            remainingFranchise--
            continue
          }
        }
      }

      // Then try to fulfill dining if needed
      if (remainingDining > 0) {
        const diningPool = mealsByTypeAndCategory[mealTypeKey]['Dining-Halls']
        if (diningPool && diningPool.length > 0) {
          const meal = getRandomMeal(diningPool, 2)
          if (meal) {
            phase2Plan[day][slot] = meal
            phase2MealUsage.set(meal._id, (phase2MealUsage.get(meal._id) || 0) + 1)
            remainingDining--
            continue
          }
        }
      }

      // If we couldn't fulfill either, leave the slot empty
    }
  }

  // Count total meals in phase 2 plan
  let totalMealsPhase2 = 0
  for (const { day, slots } of days) {
    for (const slot of slots) {
      if (phase2Plan[day][slot]) {
        totalMealsPhase2++
      }
    }
  }

  if (totalMealsPhase2 > 0) {
    // Calculate daily calories for the phase 2 plan
    for (const { day, slots } of days) {
      let dailyCalories = 0
      for (const slot of slots) {
        if (phase2Plan[day][slot]) dailyCalories += getCalories(phase2Plan[day][slot])
      }
      phase2Plan[day].totalCalories = dailyCalories
    }

    console.log(
      `[Phase 2] Generated plan with ${totalMealsPhase2} meals (Franchise: ${
        franchiseCount - remainingFranchise
      }, Dining: ${diningCount - remainingDining})`
    )
    // Log used meal IDs and their usage count for phase 2
    const usedMealsPhase2 = Array.from(phase2MealUsage.entries()).filter(([id, count]) => count > 0)
    console.log('[Phase 2] Used meal IDs and counts:', usedMealsPhase2)
    return phase2Plan
  }

  console.error('Failed to generate a valid meal plan after all phases')
  throw new Error('Failed to generate a valid meal plan after all phases')
}

function generate19MealPlan(
  breakfastFranchiseFastMeals,
  breakfastDiningFastMeals,
  lunchFranchiseFastMeals,
  lunchDiningFastMeals,
  dinnerFranchiseFastMeals,
  dinnerDiningFastMeals,
  targetCaloriesPerDay,
  rejectedMealType,
  franchiseCount,
  diningCount,
  maxAttempts = 2000,
  calorieMargin = 300
) {
  // Log all input arguments
  console.log('generate19MealPlan called with:', {
    breakfastFranchiseFastMealsLength: breakfastFranchiseFastMeals.length,
    breakfastDiningFastMealsLength: breakfastDiningFastMeals.length,
    lunchFranchiseFastMealsLength: lunchFranchiseFastMeals.length,
    lunchDiningFastMealsLength: lunchDiningFastMeals.length,
    dinnerFranchiseFastMealsLength: dinnerFranchiseFastMeals.length,
    dinnerDiningFastMealsLength: dinnerDiningFastMeals.length,
    targetCaloriesPerDay,
    rejectedMealType,
    franchiseCount,
    diningCount,
    maxAttempts,
    calorieMargin,
  })

  // Validate input counts
  if (franchiseCount + diningCount !== 19) {
    console.error(
      'Invalid franchiseCount + diningCount:',
      franchiseCount,
      '+',
      diningCount,
      '=',
      franchiseCount + diningCount
    )
    throw new Error('The sum of franchiseCount and diningCount must equal 19')
  }

  // Organize meals by type and category
  const mealsByTypeAndCategory = {
    Breakfast: { Franchise: breakfastFranchiseFastMeals, 'Dining-Halls': breakfastDiningFastMeals },
    Lunch: { Franchise: lunchFranchiseFastMeals, 'Dining-Halls': lunchDiningFastMeals },
    Dinner: { Franchise: dinnerFranchiseFastMeals, 'Dining-Halls': dinnerDiningFastMeals },
  }
  console.log('mealsByTypeAndCategory keys:', Object.keys(mealsByTypeAndCategory))

  const allMealsByType = {
    Breakfast: [...breakfastFranchiseFastMeals, ...breakfastDiningFastMeals],
    Lunch: [...lunchFranchiseFastMeals, ...lunchDiningFastMeals],
    Dinner: [...dinnerFranchiseFastMeals, ...dinnerDiningFastMeals],
  }

  // Track meal usage (max 2 uses per meal_id)
  const mealUsage = new Map()

  // Initialize meal usage count
  for (const mealType in allMealsByType) {
    for (const meal of allMealsByType[mealType]) {
      if (!mealUsage.has(meal._id)) {
        mealUsage.set(meal._id, 0)
      }
    }
  }
  console.log('Initialized mealUsage for', mealUsage.size, 'meals')

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
    // Log available meal IDs for debugging
    // console.log('getRandomMeal available IDs:', available.map(m => m._id))
    return available.length ? available[Math.floor(Math.random() * available.length)] : null
  }

  const days = [
    { day: 'Monday', slots: ['breakfast', 'dinner'] },
    { day: 'Tuesday', slots: ['breakfast', 'dinner'] },
    { day: 'Wednesday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Thursday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Friday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Saturday', slots: ['breakfast', 'lunch', 'dinner'] },
    { day: 'Sunday', slots: ['breakfast', 'lunch', 'dinner'] },
  ]

  let finalPlan = null

  // === PHASE 1: Strict Requirements ===
  let phase1Success = false
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt % 100 === 0) console.log(`[Phase 1] Attempt ${attempt}`)
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

    // STEP 1: Fill meals respecting counts and calorie constraints
    let success = true
    for (const { day, slots } of days) {
      for (const slot of slots) {
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
        if (!pool || pool.length === 0) {
          // Try the other pool type if current one is empty
          poolType = poolType === 'Franchise' ? 'Dining-Halls' : 'Franchise'
          pool = mealsByTypeAndCategory[mealTypeKey][poolType]
          if (!pool || pool.length === 0) {
            console.warn(`[Phase 1] No meals available for ${mealTypeKey} ${poolType}`)
            success = false
            break
          }
        }

        // For Monday and Tuesday, pick the highest calorie meal available
        let meal
        if (day === 'Monday' || day === 'Tuesday') {
          const available = pool.filter((meal) => attemptMealUsage.get(meal._id) < 2)
          meal = available.length
            ? available.reduce((max, m) => (getCalories(m) > getCalories(max) ? m : max), available[0])
            : null
        } else {
          meal = getRandomMeal(pool)
        }
        if (!meal) {
          console.warn(`[Phase 1] No available meal for ${mealTypeKey} ${poolType} (all used up)`)
          success = false
          break
        }

        plan[day][slot] = meal
        attemptMealUsage.set(meal._id, (attemptMealUsage.get(meal._id) || 0) + 1)
        if (poolType === 'Franchise') attemptFranchiseUsed++
        else attemptDiningUsed++
        totalMeals++
      }
      if (!success) break
    }

    // Check if we successfully filled all meals with correct counts
    if (success && attemptFranchiseUsed === franchiseCount && attemptDiningUsed === diningCount && totalMeals === 19) {
      // Calculate daily calories and check constraints
      let allDaysValid = true
      for (const { day, slots } of days) {
        let dailyCalories = 0
        for (const slot of slots) {
          if (plan[day][slot]) dailyCalories += getCalories(plan[day][slot])
        }
        plan[day].totalCalories = dailyCalories

        // Ignore calorie margin for Monday and Tuesday
        if (day !== 'Monday' && day !== 'Tuesday') {
          if (Math.abs(dailyCalories - targetCaloriesPerDay) > calorieMargin) {
            allDaysValid = false
            console.log(`[Phase 1] Day ${day} calories out of margin:`, dailyCalories)
            break
          }
        }
      }

      if (allDaysValid) {
        finalPlan = plan
        phase1Success = true
        console.log(`[Phase 1] Success! Franchise: ${franchiseCount}, Dining: ${diningCount}`)
        // Log used meal IDs and their usage count
        const usedMeals = Array.from(mealUsage.entries()).filter(([id, count]) => count > 0)
        console.log('[Phase 1] Used meal IDs and counts:', usedMeals)
        break
      }
    }
  }

  if (finalPlan) {
    console.log('[Phase 1] Final plan generated successfully')
    return finalPlan
  }

  // === PHASE 2: Fallback with relaxed constraints ===
  console.log('\n[Phase 2] Falling back to relaxed requirements')

  // Check if all dining meals are empty
  const allDiningEmpty =
    breakfastDiningFastMeals.length === 0 && lunchDiningFastMeals.length === 0 && dinnerDiningFastMeals.length === 0

  // If Phase 1 failed or no dining meals, set franchiseCount to 7
  if (!phase1Success || allDiningEmpty) {
    franchiseCount = 7
  }

  // Reset counts for phase 2
  let remainingFranchise = franchiseCount
  let remainingDining = diningCount
  const phase2Plan = {}
  const phase2MealUsage = new Map(mealUsage)

  // Initialize empty plan
  for (const { day } of days) {
    phase2Plan[day] = {}
  }

  // First, try to fulfill franchise and dining counts separately
  for (const { day, slots } of days) {
    for (const slot of slots) {
      const mealTypeKey = slot.charAt(0).toUpperCase() + slot.slice(1)

      // Try to fulfill franchise first if needed
      if (remainingFranchise > 0) {
        const franchisePool = mealsByTypeAndCategory[mealTypeKey]['Franchise']
        if (franchisePool && franchisePool.length > 0) {
          const meal = getRandomMeal(franchisePool, 2)
          if (meal) {
            phase2Plan[day][slot] = meal
            phase2MealUsage.set(meal._id, (phase2MealUsage.get(meal._id) || 0) + 1)
            remainingFranchise--
            continue
          }
        }
      }

      // Then try to fulfill dining if needed
      if (remainingDining > 0) {
        const diningPool = mealsByTypeAndCategory[mealTypeKey]['Dining-Halls']
        if (diningPool && diningPool.length > 0) {
          const meal = getRandomMeal(diningPool, 2)
          if (meal) {
            phase2Plan[day][slot] = meal
            phase2MealUsage.set(meal._id, (phase2MealUsage.get(meal._id) || 0) + 1)
            remainingDining--
            continue
          }
        }
      }

      // If we couldn't fulfill either, leave the slot empty
    }
  }

  // Count total meals in phase 2 plan
  let totalMealsPhase2 = 0
  for (const { day, slots } of days) {
    for (const slot of slots) {
      if (phase2Plan[day][slot]) {
        totalMealsPhase2++
      }
    }
  }

  if (totalMealsPhase2 > 0) {
    // Calculate daily calories for the phase 2 plan
    for (const { day, slots } of days) {
      let dailyCalories = 0
      for (const slot of slots) {
        if (phase2Plan[day][slot]) dailyCalories += getCalories(phase2Plan[day][slot])
      }
      phase2Plan[day].totalCalories = dailyCalories
    }

    console.log(
      `[Phase 2] Generated plan with ${totalMealsPhase2} meals (Franchise: ${
        franchiseCount - remainingFranchise
      }, Dining: ${diningCount - remainingDining})`
    )
    // Log used meal IDs and their usage count for phase 2
    const usedMealsPhase2 = Array.from(phase2MealUsage.entries()).filter(([id, count]) => count > 0)
    console.log('[Phase 2] Used meal IDs and counts:', usedMealsPhase2)
    return phase2Plan
  }

  console.error('Failed to generate a valid meal plan after all phases')
  throw new Error('Failed to generate a valid meal plan after all phases')
}

function generate7MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  selectedMealType,
  franchiseMealCount, // New parameter: number of meals from Franchise
  diningHallMealCount, // New parameter: number of meals from Dining-Halls
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

  // --- Phase 1: Generate unique meals with franchise/dining count constraints ---
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
      console.log(`Successfully generated ${franchiseMealCount} unique Franchise meals.`)
    } else {
      console.warn(
        `Failed to generate ${franchiseMealCount} unique Franchise meals:`,
        franchiseResult.issues.join(', ')
      )
      // Don't fall back to fewer meals yet - we'll try Phase 2 first
    }
  }

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
      console.log(`Successfully generated ${diningHallMealCount} unique Dining-Hall meals.`)
    } else {
      console.warn(
        `Failed to generate ${diningHallMealCount} unique Dining-Hall meals:`,
        diningResult.issues.join(', ')
      )
    }
  }

  // Verify we have a complete plan with unique meals
  if (Object.keys(finalPlan).filter((k) => k.startsWith('day')).length === 7) {
    // Log used items and their counts, and franchise/dining counts
    const usedItems = []
    mealUsage.forEach((count, id) => {
      if (count > 0) {
        // Find the meal object by id
        let meal = null
        for (const type in allMealsByType) {
          meal = allMealsByType[type].find((m) => m._id === id)
          if (meal) break
        }
        if (meal) {
          usedItems.push({ _id: id, name: meal.mealName, count, restaurantType: meal.restaurantType })
        }
      }
    })
    console.log('Used items and counts:', usedItems)
    console.log('Total franchise meals used:', franchiseMealCount, 'Total dining meals used:', diningHallMealCount)
    return finalPlan
  }

  // --- Phase 2: Generate unique meals ignoring franchise/dining count constraints ---
  console.warn(
    'Phase 1 failed to generate complete plan with unique meals, attempting Phase 2 (ignoring franchise/dining counts)...'
  )

  // Reset
  finalPlan = {}
  usedMealIds = new Set()

  // Combine all meals and try to get 7 unique ones
  const combinedMeals = [...franchiseMeals, ...diningHallMeals]
  const combinedResult = tryGeneratePartialPlan(
    combinedMeals,
    7,
    false, // still no repeats
    true,
    {},
    new Set()
  )

  if (combinedResult.plan) {
    console.log('Phase 2 succeeded with 7 unique meals from combined pool')
    // Log used items and their counts, and franchise/dining counts
    const usedItems = []
    mealUsage.forEach((count, id) => {
      if (count > 0) {
        // Find the meal object by id
        let meal = null
        for (const type in allMealsByType) {
          meal = allMealsByType[type].find((m) => m._id === id)
          if (meal) break
        }
        if (meal) {
          usedItems.push({ _id: id, name: meal.mealName, count, restaurantType: meal.restaurantType })
        }
      }
    })
    console.log('Used items and counts:', usedItems)
    console.log('Total franchise meals used:', franchiseMealCount, 'Total dining meals used:', diningHallMealCount)
    return combinedResult.plan
  }

  // --- Phase 3: Allow repeats if we still can't find enough unique meals ---
  console.warn('Phase 2 failed to generate complete plan with unique meals, attempting Phase 3 (allowing repeats)...')

  // Try with repeats allowed (but not consecutive)
  const repeatResult = tryGeneratePartialPlan(
    combinedMeals,
    7,
    true, // allow repeats
    false, // but not consecutive
    {},
    new Set()
  )

  if (repeatResult.plan) {
    console.log('Phase 3 succeeded with some meal repeats')
    // Log used items and their counts, and franchise/dining counts
    const usedItems = []
    mealUsage.forEach((count, id) => {
      if (count > 0) {
        // Find the meal object by id
        let meal = null
        for (const type in allMealsByType) {
          meal = allMealsByType[type].find((m) => m._id === id)
          if (meal) break
        }
        if (meal) {
          usedItems.push({ _id: id, name: meal.mealName, count, restaurantType: meal.restaurantType })
        }
      }
    })
    console.log('Used items and counts:', usedItems)
    console.log('Total franchise meals used:', franchiseMealCount, 'Total dining meals used:', diningHallMealCount)
    return repeatResult.plan
  }

  throw new Error(`🛑 Critical Error: Could not generate a 7-day plan. Issues: ${repeatResult.issues.join('\n')}`)
}

function generate14MealPlan(
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  targetCaloriesPerDay,
  preferredMealTypes,
  franchiseCount,
  diningCount,
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

  const mealUsage = new Map()

  // Preprocess meals
  ;[breakfastMeals, lunchMeals, dinnerMeals].flat().forEach((meal) => {
    const { mealType, restaurantType, _id } = meal
    if (mealsByTypeAndCategory[mealType]?.[restaurantType]) {
      mealsByTypeAndCategory[mealType][restaurantType].push(meal)
    }
    allMealsByType[mealType].push(meal)
    if (!mealUsage.has(_id)) mealUsage.set(_id, 0)
  })

  const [firstMealType, secondMealType] = preferredMealTypes
  const plan = {}
  const issues = []
  let franchiseMealsUsed = 0
  let diningMealsUsed = 0

  // Helper
  const getRandomMeal = (pool, maxUses = 2) => {
    const available = pool.filter((meal) => mealUsage.get(meal._id) < maxUses)
    return available.length ? available[Math.floor(Math.random() * available.length)] : null
  }

  // Special fallback if no dining meals exist
  const totalDining =
    mealsByTypeAndCategory.Breakfast['Dining-Halls'].length +
    mealsByTypeAndCategory.Lunch['Dining-Halls'].length +
    mealsByTypeAndCategory.Dinner['Dining-Halls'].length

  if (totalDining === 0) {
    const fallbackFranchise = [
      ...mealsByTypeAndCategory.Breakfast.Franchise,
      ...mealsByTypeAndCategory.Lunch.Franchise,
      ...mealsByTypeAndCategory.Dinner.Franchise,
    ].filter((m, i, arr) => arr.findIndex((x) => x._id === m._id) === i)

    if (fallbackFranchise.length < totalDays) {
      throw new Error('Not enough unique franchise meals to fallback')
    }
    for (let day = 1; day <= totalDays; day++) {
      const meal = fallbackFranchise[day - 1]
      plan[`day${day}`] = {
        mealTypeA: meal,
        mealTypeB: null,
        selectionMethod: 'Franchise-only fallback mode',
      }
    }
    return plan
  }

  // === Phase 1: Strict constraints ===
  for (let day = 1; day <= totalDays; day++) {
    let validCombo = null

    const tryCombinations = []
    const getAvailableMeals = (mealType, source) => {
      return mealsByTypeAndCategory[mealType][source].filter((m) => mealUsage.get(m._id) < 1)
    }

    // Phase 1 logic: Prioritize dining hall meals first
    if (diningMealsUsed + 2 <= diningCount) {
      tryCombinations.push({
        aList: getAvailableMeals(firstMealType, 'Dining-Halls'),
        bList: getAvailableMeals(secondMealType, 'Dining-Halls'),
        source: ['Dining-Halls', 'Dining-Halls'],
      })
    }
    if (franchiseMealsUsed + 2 <= franchiseCount) {
      tryCombinations.push({
        aList: getAvailableMeals(firstMealType, 'Franchise'),
        bList: getAvailableMeals(secondMealType, 'Franchise'),
        source: ['Franchise', 'Franchise'],
      })
    }
    if (diningMealsUsed + 1 <= diningCount && franchiseMealsUsed + 1 <= franchiseCount) {
      tryCombinations.push(
        {
          aList: getAvailableMeals(firstMealType, 'Dining-Halls'),
          bList: getAvailableMeals(secondMealType, 'Franchise'),
          source: ['Dining-Halls', 'Franchise'],
        },
        {
          aList: getAvailableMeals(firstMealType, 'Franchise'),
          bList: getAvailableMeals(secondMealType, 'Dining-Halls'),
          source: ['Franchise', 'Dining-Halls'],
        }
      )
    }

    for (const { aList, bList, source } of tryCombinations) {
      if (!aList.length || !bList.length) continue

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const a = getRandomMeal(aList, 1)
        const b = getRandomMeal(bList, 1)
        if (!a || !b || (a._id === b._id && firstMealType === secondMealType)) continue

        const totalCals = (a.totalCalories || 0) + (b.totalCalories || 0)
        if (Math.abs(totalCals - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = {
            a,
            b,
            source,
            method: 'Strict Phase 1',
          }
          break
        }
      }
      if (validCombo) break
    }

    // === Phase 2: Relaxed constraints on unfilled ===
    if (!validCombo) {
      const aList = allMealsByType[firstMealType].filter((m) => mealUsage.get(m._id) < 2)
      const bList = allMealsByType[secondMealType].filter((m) => mealUsage.get(m._id) < 2)

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const a = getRandomMeal(aList)
        const b = getRandomMeal(bList)
        if (!a || !b || (a._id === b._id && firstMealType === secondMealType)) continue

        // Count how many franchise meals would be used if we pick this combo
        let tempFranchiseCount = franchiseMealsUsed
        if (a.restaurantType === 'Franchise') tempFranchiseCount++
        if (b.restaurantType === 'Franchise') tempFranchiseCount++
        if (tempFranchiseCount > 7) continue

        const totalCals = (a.totalCalories || 0) + (b.totalCalories || 0)
        if (Math.abs(totalCals - targetCaloriesPerDay) <= calorieMargin) {
          validCombo = {
            a,
            b,
            source: [a.restaurantType, b.restaurantType],
            method: 'Relaxed Phase 2',
          }
          break
        }
      }
    }

    // Final fallback fail
    if (!validCombo) {
      issues.push(`❌ Day ${day} failed.`)
      continue
    }

    plan[`day${day}`] = {
      mealTypeA: validCombo.a,
      mealTypeB: validCombo.b,
      selectionMethod: validCombo.method,
    }

    mealUsage.set(validCombo.a._id, mealUsage.get(validCombo.a._id) + 1)
    mealUsage.set(validCombo.b._id, mealUsage.get(validCombo.b._id) + 1)

    if (validCombo.source[0] === 'Franchise') franchiseMealsUsed++
    else diningMealsUsed++
    if (validCombo.source[1] === 'Franchise') franchiseMealsUsed++
    else diningMealsUsed++
  }
  if (issues.length > 0) {
    throw new Error('Failed:' + issues.join('\n'))
  }
  // Summary log: used meal ids and counts, and total franchise/dining meals
  const usedMealCounts = {}
  let franchiseMealsUsedFinal = 0
  let diningMealsUsedFinal = 0
  mealUsage.forEach((count, id) => {
    if (count > 0) {
      usedMealCounts[id] = count
      // Find the meal object by id to check restaurantType
      let meal = null
      for (const type in allMealsByType) {
        meal = allMealsByType[type].find((m) => m._id === id)
        if (meal) break
      }
      if (meal) {
        if (meal.restaurantType === 'Franchise') franchiseMealsUsedFinal += count
        else if (meal.restaurantType === 'Dining-Halls') diningMealsUsedFinal += count
      }
    }
  })
  console.log('Meal usage summary:', usedMealCounts)
  console.log('Total franchise meals used:', franchiseMealsUsedFinal)
  console.log('Total dining meals used:', diningMealsUsedFinal)
  return plan
}

module.exports = {
  generate19MealPlan,
  generate14MealPlan,
  generate7MealPlan,
  generate21MealPlan,
}
