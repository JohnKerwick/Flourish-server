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
  maxAttempts = 20000,
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

  // Check if all dining hall meals are empty
  const allDiningEmptyFranchiseOnly =
    breakfastDiningFastMeals.length === 0 && lunchDiningFastMeals.length === 0 && dinnerDiningFastMeals.length === 0
  if (allDiningEmptyFranchiseOnly && diningCount == 21) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const emptyPlan = {}
    for (let i = 0; i < 7; i++) {
      emptyPlan[daysOfWeek[i]] = { meal: [] } // or { meal: null } or simply []
    }

    console.log('Empty meal plan:', emptyPlan)
    return emptyPlan
  }
  if (allDiningEmptyFranchiseOnly) {
    // Combine all franchise meals
    const allFranchiseMeals = [...breakfastFranchiseFastMeals, ...lunchFranchiseFastMeals, ...dinnerFranchiseFastMeals]
    // Remove duplicates by _id
    const uniqueFranchiseMealsMap = new Map()
    allFranchiseMeals.forEach((meal) => {
      uniqueFranchiseMealsMap.set(meal._id.toString(), meal)
    })
    const uniqueFranchiseMeals = Array.from(uniqueFranchiseMealsMap.values())
    // Sort by calories descending
    uniqueFranchiseMeals.sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))
    // Shuffle the top 30 to add randomness, then pick 21
    const topMeals = uniqueFranchiseMeals.slice(0, 30)
    for (let i = topMeals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[topMeals[i], topMeals[j]] = [topMeals[j], topMeals[i]]
    }
    // Select up to 21 meals, but with restaurant constraint
    const selectedMeals = []
    const restaurantCount = {}
    for (let i = 0; i < topMeals.length && selectedMeals.length < 7; i++) {
      const meal = topMeals[i]
      const name = meal.restaurantName
      if (!name) continue
      if (!restaurantCount[name]) restaurantCount[name] = 0
      if (restaurantCount[name] < 2) {
        selectedMeals.push(meal)
        restaurantCount[name]++
      }
    }
    // Build a plan object with 7 days, each with breakfast, lunch, dinner
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const plan = {}
    for (let i = 0; i < 7; i++) {
      plan[daysOfWeek[i]] = { meal: selectedMeals[i] }
    }
    console.log(
      '[Franchise Only] Selected 7 unique high-calorie franchise meals (max 2 per restaurant):',
      selectedMeals?.map((m) => m.name + ' (' + m.restaurantName + ')')
    )
    console.log('plan', plan)
    return plan
  }

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
  // console.log('mealsByTypeAndCategory keys:', Object.keys(mealsByTypeAndCategory))

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
  // console.log('Initialized mealUsage for', mealUsage.size, 'meals')

  function getCalories(meal) {
    return meal?.totalCalories || 0
  }

  function getHighCalorieMeal(pool) {
    return pool?.length
      ? pool.reduce((max, meal) => (getCalories(meal) > getCalories(max) ? meal : max), pool[0])
      : null
  }

  // Helper to get random meal with constraints
  function getRandomMeal(pool, maxUses = 1, usageMap = mealUsage) {
    const available = pool.filter((meal) => usageMap.get(meal._id) < maxUses)
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

        // Only allow each meal to be used once in Phase 1
        const meal = getRandomMeal(pool, 1, attemptMealUsage)
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
          // console.log(`[Phase 1] Day ${day} calories out of margin:`, dailyCalories)
          break
        }
      }

      if (allDaysValid) {
        finalPlan = plan
        phase1Success = true
        // Copy attemptMealUsage to mealUsage so logging is correct
        attemptMealUsage.forEach((count, id) => mealUsage.set(id, count))
        console.log(`[Phase 1] Success! Franchise: ${franchiseCount}, Dining: ${diningCount}`)
        const usedMeals = Array.from(mealUsage.entries()).filter(([id, count]) => count > 0)
        console.log('[Phase 1] Used meal IDs and counts:', usedMeals)
        break
      }
    }
  }

  if (finalPlan) {
    console.log('[Phase 1] Final plan generated successfully')
    // Log used meal IDs and counts in a clear, structured way
    const usedMealCounts = {}
    Object.values(finalPlan).forEach((dayObj) => {
      ;['breakfast', 'lunch', 'dinner'].forEach((slot) => {
        const meal = dayObj[slot]
        if (meal && meal._id) {
          usedMealCounts[meal._id] = (usedMealCounts[meal._id] || 0) + 1
        }
      })
    })
    console.log('[Phase 1] Used meal IDs and counts:')
    Object.entries(usedMealCounts).forEach(([id, count]) => {
      console.log(`_id: ${id}, count: ${count}`)
    })
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
    const usedMealCounts = {}
    Object.values(phase2Plan).forEach((dayObj) => {
      ;['breakfast', 'lunch', 'dinner'].forEach((slot) => {
        const meal = dayObj[slot]
        if (meal && meal._id) {
          usedMealCounts[meal._id] = (usedMealCounts[meal._id] || 0) + 1
        }
      })
    })
    console.log('[Phase 2] Used meal IDs and counts:')
    Object.entries(usedMealCounts).forEach(([id, count]) => {
      console.log(`_id: ${id}, count: ${count}`)
    })
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
  maxAttempts = 20000,
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

  // Check if all dining hall meals are empty
  const allDiningEmptyFranchiseOnly =
    breakfastDiningFastMeals.length === 0 && lunchDiningFastMeals.length === 0 && dinnerDiningFastMeals.length === 0
  if (allDiningEmptyFranchiseOnly && diningCount == 19) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const emptyPlan = {}
    for (let i = 0; i < 7; i++) {
      emptyPlan[daysOfWeek[i]] = { meal: [] } // or { meal: null } or simply []
    }

    console.log('Empty meal plan:', emptyPlan)
    return emptyPlan
    return plan
  }

  if (allDiningEmptyFranchiseOnly) {
    // Combine all franchise meals
    const allFranchiseMeals = [...breakfastFranchiseFastMeals, ...lunchFranchiseFastMeals, ...dinnerFranchiseFastMeals]
    // Remove duplicates by _id
    const uniqueFranchiseMealsMap = new Map()
    allFranchiseMeals.forEach((meal) => {
      uniqueFranchiseMealsMap.set(meal._id.toString(), meal)
    })
    const uniqueFranchiseMeals = Array.from(uniqueFranchiseMealsMap.values())
    // Sort by calories descending
    uniqueFranchiseMeals.sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))
    // Shuffle the top 30 to add randomness, then pick 21
    const topMeals = uniqueFranchiseMeals.slice(0, 30)
    for (let i = topMeals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[topMeals[i], topMeals[j]] = [topMeals[j], topMeals[i]]
    }
    // Select up to 21 meals, but with restaurant constraint
    const selectedMeals = []
    const restaurantCount = {}
    for (let i = 0; i < topMeals.length && selectedMeals.length < 7; i++) {
      const meal = topMeals[i]
      const name = meal.restaurantName
      if (!name) continue
      if (!restaurantCount[name]) restaurantCount[name] = 0
      if (restaurantCount[name] < 2) {
        selectedMeals.push(meal)
        restaurantCount[name]++
      }
    }
    // Build a plan object with 7 days, each with breakfast, lunch, dinner
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const plan = {}
    for (let i = 0; i < 7; i++) {
      plan[daysOfWeek[i]] = { meal: selectedMeals[i] }
    }
    console.log(
      '[Franchise Only] Selected 7 unique high-calorie franchise meals (max 2 per restaurant):',
      selectedMeals?.map((m) => m.name + ' (' + m.restaurantName + ')')
    )
    console.log('plan', plan)
    return plan
  }

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
  function getRandomMeal(pool, maxUses = 1, usageMap = mealUsage) {
    const available = pool.filter((meal) => usageMap.get(meal._id) < maxUses)
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
    // if (attempt % 100 === 0) console.log(`[Phase 1] Attempt ${attempt}`)
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
          const available = pool.filter((meal) => attemptMealUsage.get(meal._id) < 1)
          meal = available.length
            ? available.reduce((max, m) => (getCalories(m) > getCalories(max) ? m : max), available[0])
            : null
        } else {
          meal = getRandomMeal(pool, 1, attemptMealUsage)
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
    // Log used meal IDs and counts in a clear, structured way
    const usedMealCounts = {}
    Object.values(finalPlan).forEach((dayObj) => {
      ;['breakfast', 'lunch', 'dinner'].forEach((slot) => {
        const meal = dayObj[slot]
        if (meal && meal._id) {
          usedMealCounts[meal._id] = (usedMealCounts[meal._id] || 0) + 1
        }
      })
    })
    console.log('[19 Meal Plan] Used meal IDs and counts:')
    Object.entries(usedMealCounts).forEach(([id, count]) => {
      console.log(`_id: ${id}, count: ${count}`)
    })
    return finalPlan
  }

  // === PHASE 2: Fallback with relaxed constraints ===
  console.log('\n[Phase 2] Falling back to relaxed requirements')

  // Check if all dining meals are empty
  const allDiningEmptyPhase2 =
    breakfastDiningFastMeals.length === 0 && lunchDiningFastMeals.length === 0 && dinnerDiningFastMeals.length === 0

  // If Phase 1 failed or no dining meals, set franchiseCount to 7
  if (!phase1Success || allDiningEmptyPhase2) {
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
    const usedMealCounts = {}
    Object.values(phase2Plan).forEach((dayObj) => {
      ;['breakfast', 'lunch', 'dinner'].forEach((slot) => {
        const meal = dayObj[slot]
        if (meal && meal._id) {
          usedMealCounts[meal._id] = (usedMealCounts[meal._id] || 0) + 1
        }
      })
    })
    console.log('[19 Meal Plan] Used meal IDs and counts:')
    Object.entries(usedMealCounts).forEach(([id, count]) => {
      console.log(`_id: ${id}, count: ${count}`)
    })
    return phase2Plan
  }

  console.error('Failed to generate a valid meal plan after all phases')
  throw new Error('Failed to generate a valid meal plan after all phases')
}

function generate7MealPlan(
  breakfastFranchiseFastMeals,
  breakfastDiningFastMeals,
  lunchFranchiseFastMeals,
  lunchDiningFastMeals,
  dinnerFranchiseFastMeals,
  dinnerDiningFastMeals,
  targetCaloriesPerDay,
  selectedMealType,
  franchiseMealCount,
  diningHallMealCount,
  maxAttempts = 20000,
  calorieMargin = 200
) {
  let uniqueFranchiseRestaurants = []
  let Restaurantcount = 0
  // console.log('BREAKFAST Franchise:', breakfastFranchiseFastMeals.length)
  // console.log('BREAKFAST Dining:', breakfastDiningFastMeals.length)
  // console.log('LUNCH Franchise:', lunchFranchiseFastMeals.length)
  // console.log('LUNCH Dining:', lunchDiningFastMeals.length)
  // console.log('DINNER Franchise:', dinnerFranchiseFastMeals.length)
  // console.log('DINNER Dining:', dinnerDiningFastMeals.length)

  const allDiningEmptyFranchiseOnly =
    breakfastDiningFastMeals.length === 0 && lunchDiningFastMeals.length === 0 && dinnerDiningFastMeals.length === 0

  if (allDiningEmptyFranchiseOnly && diningHallMealCount == 7) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const emptyPlan = {}
    for (let i = 0; i < 7; i++) {
      emptyPlan[daysOfWeek[i]] = { meal: [] } // or { meal: null } or simply []
    }

    console.log('Empty meal plan:', emptyPlan)
    return emptyPlan
  }

  if (allDiningEmptyFranchiseOnly) {
    if (selectedMealType != 'Breakfast') {
      if (selectedMealType === 'Lunch') {
        lunchFranchiseFastMeals = dinnerFranchiseFastMeals.map((meal) => ({
          ...meal,
          mealType: 'Lunch',
        }))
      }

      if (selectedMealType === 'Dinner') {
        dinnerFranchiseFastMeals = lunchFranchiseFastMeals.map((meal) => ({
          ...meal,
          mealType: 'Dinner',
        }))
      }
    }
    if (selectedMealType == 'Breakfast') {
      uniqueFranchiseRestaurants = new Set(breakfastFranchiseFastMeals.map((meal) => meal.restaurantName))
      Restaurantcount = uniqueFranchiseRestaurants.size
      console.log('✅ Franchise restaurant count:', Restaurantcount)
    }
    if (selectedMealType == 'Dinner') {
      uniqueFranchiseRestaurants = new Set(dinnerFranchiseFastMeals.map((meal) => meal.restaurantName))
      Restaurantcount = uniqueFranchiseRestaurants.size
      console.log('✅ Franchise restaurant count:', Restaurantcount)
    }
    if (selectedMealType == 'Lunch') {
      uniqueFranchiseRestaurants = new Set(lunchFranchiseFastMeals.map((meal) => meal.restaurantName))
      Restaurantcount = uniqueFranchiseRestaurants.size
      console.log('✅ Franchise restaurant count:', Restaurantcount)
    }
    if (Restaurantcount == 1) {
      const allFranchiseMeals = [
        ...breakfastFranchiseFastMeals,
        ...lunchFranchiseFastMeals,
        ...dinnerFranchiseFastMeals,
      ].filter((meal) => meal.mealType === selectedMealType)

      // Sort by calories descending
      allFranchiseMeals.sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))

      // Shuffle top 30 for randomness
      const topMeals = allFranchiseMeals.slice(0, 30)
      for (let i = topMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[topMeals[i], topMeals[j]] = [topMeals[j], topMeals[i]]
      }

      // Just pick the first 7 meals (allowing repetition)
      const selectedMeals = topMeals.slice(0, 7)

      // Build the plan
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const plan = {}
      for (let i = 0; i < 7; i++) {
        plan[daysOfWeek[i]] = { meal: selectedMeals[i] }
      }

      console.log(
        `[Franchise Only] Selected 7 ${selectedMealType} meals (repetition allowed):`,
        selectedMeals?.map((m) => `${m.name} (${m.restaurantName})`)
      )

      return plan
    }
    if (Restaurantcount == 2 || Restaurantcount == 3) {
      // alternate days
      const allFranchiseMeals = [
        ...breakfastFranchiseFastMeals,
        ...lunchFranchiseFastMeals,
        ...dinnerFranchiseFastMeals,
      ].filter((meal) => meal.mealType === selectedMealType)

      // Remove duplicates by _id
      const uniqueFranchiseMealsMap = new Map()
      allFranchiseMeals.forEach((meal) => {
        uniqueFranchiseMealsMap.set(meal._id.toString(), meal)
      })
      const uniqueFranchiseMeals = Array.from(uniqueFranchiseMealsMap.values())

      // Sort by calories descending
      uniqueFranchiseMeals.sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))

      // Shuffle top 30 for randomness, then pick 21
      const topMeals = uniqueFranchiseMeals.slice(0, 30)
      for (let i = topMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[topMeals[i], topMeals[j]] = [topMeals[j], topMeals[i]]
      }

      // Select meals with no back-to-back same restaurant
      const selectedMeals = []
      const usedRestaurants = []

      let i = 0
      while (selectedMeals.length < 7 && i < topMeals.length) {
        const meal = topMeals[i]
        const prevRestaurant = selectedMeals.length > 0 ? selectedMeals[selectedMeals.length - 1].restaurantName : null
        if (meal.restaurantName !== prevRestaurant) {
          selectedMeals.push(meal)
          usedRestaurants.push(meal.restaurantName)
        }
        i++
      }

      // If less than 7 due to constraints, fill remaining with any (not consecutive)
      i = 0
      while (selectedMeals.length < 7 && i < topMeals.length) {
        const meal = topMeals[i]
        const prevRestaurant = selectedMeals.length > 0 ? selectedMeals[selectedMeals.length - 1].restaurantName : null
        if (meal.restaurantName !== prevRestaurant || !selectedMeals.length) {
          selectedMeals.push(meal)
        }
        i++
      }

      // Build the plan
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const plan = {}
      for (let i = 0; i < 7; i++) {
        plan[daysOfWeek[i]] = { meal: selectedMeals[i] }
      }

      console.log(
        `[Franchise Only] Selected 7 ${selectedMealType} meals (no consecutive restaurant):`,
        selectedMeals?.map((m) => `${m.name} (${m.restaurantName})`)
      )

      return plan
    } else {
      const allFranchiseMeals = [
        ...breakfastFranchiseFastMeals,
        ...lunchFranchiseFastMeals,
        ...dinnerFranchiseFastMeals,
      ].filter((meal) => meal.mealType === selectedMealType) // Changed to single meal type check

      // Remove duplicates by _id
      const uniqueFranchiseMealsMap = new Map()
      allFranchiseMeals.forEach((meal) => {
        uniqueFranchiseMealsMap.set(meal._id.toString(), meal)
      })
      const uniqueFranchiseMeals = Array.from(uniqueFranchiseMealsMap.values())

      // Sort by calories descending
      uniqueFranchiseMeals.sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))

      // Shuffle the top 30 to add randomness, then pick 21
      const topMeals = uniqueFranchiseMeals.slice(0, 30)
      for (let i = topMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[topMeals[i], topMeals[j]] = [topMeals[j], topMeals[i]]
      }

      // Select up to 7 meals with restaurant constraint
      const selectedMeals = []
      const restaurantCount = {}
      for (let i = 0; i < topMeals.length && selectedMeals.length < 7; i++) {
        const meal = topMeals[i]
        const name = meal.restaurantName
        if (!name) continue
        if (!restaurantCount[name]) restaurantCount[name] = 0
        if (restaurantCount[name] < 2) {
          selectedMeals.push(meal)
          restaurantCount[name]++
        }
      }

      // Build the plan
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const plan = {}
      for (let i = 0; i < 7; i++) {
        plan[daysOfWeek[i]] = { meal: selectedMeals[i] }
      }

      console.log(
        `[Franchise Only] Selected 7 ${selectedMealType} meals (max 2/restaurant):`,
        selectedMeals?.map((m) => `${m.name} (${m.restaurantName})`)
      )

      return plan
    }
  }
  const franchiseMeals = [...breakfastFranchiseFastMeals, ...lunchFranchiseFastMeals, ...dinnerFranchiseFastMeals]
  const diningHallMeals = [...breakfastDiningFastMeals, ...lunchDiningFastMeals, ...dinnerDiningFastMeals]
  // --- Logging Inputs ---
  console.log('Starting generate7MealPlan...')
  console.log('Input Parameters:')
  console.log(`- franchiseMealCount: ${franchiseMealCount}`)
  console.log(`- diningHallMealCount: ${diningHallMealCount}`)
  console.log(`- selectedMealType: ${selectedMealType}`)
  console.log(`- targetCaloriesPerDay: ${targetCaloriesPerDay}`)
  console.log(`- calorieMargin: ${calorieMargin}`)
  console.log(
    `- franchiseMeals:`,
    franchiseMeals.map((m) => ({
      _id: m._id,
      mealName: m.mealName,
      totalCalories: m.totalCalories,
      mealType: m.mealType,
    }))
  )
  console.log(
    `- diningHallMeals:`,
    diningHallMeals.map((m) => ({
      _id: m._id,
      mealName: m.mealName,
      totalCalories: m.totalCalories,
      mealType: m.mealType,
    }))
  )

  // --- Validate Input ---
  if (franchiseMealCount + diningHallMealCount !== 7) {
    console.error('Validation Error: The sum of franchiseMealCount and diningHallMealCount must equal 7')
    throw new Error('The sum of franchiseMealCount and diningHallMealCount must equal 7')
  }

  // Helper function to shuffle an array
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  // Helper function to build meal usage summary
  function buildMealUsage(plan) {
    const mealUsage = new Map()
    for (let day = 1; day <= 7; day++) {
      const meal = plan[`day${day}`]?.meal
      if (meal) {
        mealUsage.set(meal._id.toString(), (mealUsage.get(meal._id.toString()) || 0) + 1)
      }
    }
    return mealUsage
  }

  // Helper function to try and generate a partial plan
  function tryGeneratePartialPlan(
    mealPool,
    count,
    allowRepeats = false,
    calorieConstrained = true,
    existingPlan = {},
    usedMealIds = new Set()
  ) {
    console.log(`Attempting to generate partial plan for ${count} meals...`)
    console.log(`- Meal pool size: ${mealPool.length}`)
    console.log(`- Allow repeats: ${allowRepeats}`)
    console.log(`- Calorie constrained: ${calorieConstrained}`)
    console.log(`- Existing plan days: ${Object.keys(existingPlan).filter((k) => k.startsWith('day')).length}`)
    console.log(`- Used meal IDs:`, [...usedMealIds])

    const currentPlan = { ...existingPlan }
    const currentUsedMealIds = new Set([...usedMealIds])
    const localIssues = []

    // Filter meals by selectedMealType and (if calorieConstrained) by calorie margin
    let viableMealsInPool = mealPool.filter((meal) => {
      if (meal.mealType !== selectedMealType) return false
      if (!calorieConstrained) return true
      const totalCalories = meal?.totalCalories
      return typeof totalCalories === 'number' && Math.abs(totalCalories - targetCaloriesPerDay) <= calorieMargin
    })

    console.log(
      `- Viable meals after filtering (type: ${selectedMealType}, calorieConstrained: ${calorieConstrained}): ${viableMealsInPool.length}`
    )

    if (viableMealsInPool.length === 0) {
      console.warn(`No viable meals in pool for selectedMealType: ${selectedMealType}`)
      return {
        plan: null,
        issues: [
          `No viable meals in the pool for meal type ${selectedMealType}${
            calorieConstrained ? ` within calorie margin ${calorieMargin}` : ''
          }.`,
        ],
      }
    }

    // Find available days (1-7)
    const availableDays = []
    for (let day = 1; day <= 7; day++) {
      if (!currentPlan[`day${day}`]) {
        availableDays.push(day)
      }
    }

    console.log(`- Available days: ${availableDays}`)

    if (availableDays.length < count) {
      console.warn(`Not enough available days: needed ${count}, found ${availableDays.length}`)
      return {
        plan: null,
        issues: [`Not enough available days for partial plan (needed ${count}, found ${availableDays.length}).`],
      }
    }

    // Shuffle available days
    const shuffledDays = shuffleArray([...availableDays]).slice(0, count)
    console.log(`- Shuffled days to assign: ${shuffledDays}`)

    for (const day of shuffledDays) {
      let selectedMeal = null
      let eligibleMealsForDay = []

      if (!allowRepeats) {
        eligibleMealsForDay = viableMealsInPool.filter((meal) => !currentUsedMealIds.has(meal._id.toString()))
      } else {
        eligibleMealsForDay = [...viableMealsInPool]
      }

      console.log(`- Day ${day}: Eligible meals count: ${eligibleMealsForDay.length}`)

      // Shuffle eligible meals
      eligibleMealsForDay = shuffleArray([...eligibleMealsForDay])

      if (eligibleMealsForDay.length > 0) {
        selectedMeal = eligibleMealsForDay[0]
        currentUsedMealIds.add(selectedMeal._id.toString())
        currentPlan[`day${day}`] = { meal: selectedMeal }
        console.log(`- Assigned meal to Day ${day}:`, {
          _id: selectedMeal._id,
          mealName: selectedMeal.mealName,
          totalCalories: selectedMeal.totalCalories,
        })
      } else {
        localIssues.push(`Could not find a suitable meal for Day ${day} within the current pool and constraints.`)
        console.warn(`- Failed to assign meal for Day ${day}`)
      }
    }

    if (
      Object.keys(currentPlan).filter((k) => k.startsWith('day')).length ===
        Object.keys(existingPlan).filter((k) => k.startsWith('day')).length + count &&
      localIssues.length === 0
    ) {
      console.log(`Successfully generated partial plan for ${count} meals.`)
      return { plan: currentPlan, issues: [], usedMealIds: currentUsedMealIds }
    } else {
      console.warn(`Failed to generate partial plan. Issues:`, localIssues)
      return { plan: null, issues: localIssues }
    }
  }

  // --- Phase 1: Generate plan with franchise/dining counts, no repeats, calorie constraints ---
  console.log('Starting Phase 1: Generating plan with franchise/dining counts, no repeats, and calorie constraints...')
  let finalPlan = {}
  let usedMealIds = new Set()
  let lastAssignedDay = 0

  // Step 1: Assign Franchise meals
  if (franchiseMealCount > 0) {
    console.log(`Attempting to assign ${franchiseMealCount} Franchise meals...`)
    const franchiseResult = tryGeneratePartialPlan(
      franchiseMeals,
      franchiseMealCount,
      false, // no repeats
      true, // calorie constrained
      {},
      usedMealIds
    )

    if (franchiseResult.plan) {
      finalPlan = franchiseResult.plan
      usedMealIds = franchiseResult.usedMealIds
      lastAssignedDay = Math.max(
        ...Object.keys(finalPlan)
          .filter((k) => k.startsWith('day'))
          .map((k) => parseInt(k.replace('day', '')))
      )
      console.log(
        `Phase 1: Successfully assigned ${franchiseMealCount} unique Franchise meals up to Day ${lastAssignedDay}.`
      )
    } else {
      console.warn(
        `Phase 1: Failed to assign ${franchiseMealCount} unique Franchise meals. Issues:`,
        franchiseResult.issues
      )
    }
  }

  // Step 2: Assign Dining Hall meals
  if (diningHallMealCount > 0 && Object.keys(finalPlan).filter((k) => k.startsWith('day')).length < 7) {
    console.log(`Attempting to assign ${diningHallMealCount} Dining Hall meals...`)
    const diningResult = tryGeneratePartialPlan(
      diningHallMeals,
      diningHallMealCount,
      false, // no repeats
      true, // calorie constrained
      finalPlan,
      usedMealIds
    )

    if (diningResult.plan) {
      finalPlan = diningResult.plan
      usedMealIds = diningResult.usedMealIds
      lastAssignedDay = Math.max(
        ...Object.keys(finalPlan)
          .filter((k) => k.startsWith('day'))
          .map((k) => parseInt(k.replace('day', '')))
      )
      console.log(
        `Phase 1: Successfully assigned ${diningHallMealCount} unique Dining Hall meals up to Day ${lastAssignedDay}.`
      )
    } else {
      console.warn(
        `Phase 1: Failed to assign ${diningHallMealCount} unique Dining Hall meals. Issues:`,
        diningResult.issues
      )
    }
  }

  // Check if Phase 1 succeeded
  if (Object.keys(finalPlan).filter((k) => k.startsWith('day')).length === 7) {
    console.log('Phase 1: Successfully generated a complete 7-day plan.')
    // Log used items and their counts
    const usedItems = []
    const mealUsage = buildMealUsage(finalPlan)
    mealUsage.forEach((count, id) => {
      if (count > 0) {
        const meal = [...franchiseMeals, ...diningHallMeals].find((m) => m._id.toString() === id)
        if (meal) {
          usedItems.push({
            _id: id,
            name: meal.mealName,
            count,
            restaurantType: meal.restaurantType,
            totalCalories: meal.totalCalories,
          })
        }
      }
    })
    console.log('Phase 1: Used items and counts:', usedItems)
    console.log(
      `Phase 1: Total franchise meals used: ${usedItems.filter((item) => item.restaurantType === 'Franchise').length}`
    )
    console.log(
      `Phase 1: Total dining hall meals used: ${
        usedItems.filter((item) => item.restaurantType === 'DiningHall').length
      }`
    )
    return finalPlan
  }

  // === PHASE 2: Continue from last assigned day, select highest-calorie unique meals ===
  console.warn(
    `Phase 1 failed to generate a complete plan. Starting Phase 2: Continuing from Day ${
      lastAssignedDay + 1
    } with highest-calorie unique meals, ignoring calorie limits...`
  )
  const remainingDays = 7 - Object.keys(finalPlan).filter((k) => k.startsWith('day')).length
  console.log(`Phase 2: Need to assign ${remainingDays} remaining days.`)

  const combinedMeals = [...franchiseMeals, ...diningHallMeals]
  console.log(`Phase 2: Combined meal pool size: ${combinedMeals.length}`)

  // Sort meals by totalCalories in descending order and filter by mealType and unused meals
  let viableMeals = combinedMeals
    .filter((meal) => meal.mealType === selectedMealType && !usedMealIds.has(meal._id.toString()))
    .sort((a, b) => b.totalCalories - a.totalCalories)

  console.log(`Phase 2: Viable meals after filtering (type: ${selectedMealType}): ${viableMeals.length}`)
  console.log(
    `Phase 2: Top ${Math.min(remainingDays, viableMeals.length)} high-calorie meals:`,
    viableMeals.slice(0, remainingDays).map((m) => ({
      _id: m._id,
      mealName: m.mealName,
      totalCalories: m.totalCalories,
    }))
  )

  if (viableMeals.length < remainingDays) {
    console.error(`Phase 2: Not enough unique meals (${viableMeals.length}) to fill ${remainingDays} days.`)
    throw new Error(
      `🛑 Critical Error: Not enough unique meals (${viableMeals.length}) to fill ${remainingDays} days for meal type ${selectedMealType}.`
    )
  }

  // Assign the top high-calorie meals to remaining days
  const currentPlan = { ...finalPlan }
  const currentUsedMealIds = new Set([...usedMealIds])
  const availableDays = []
  for (let day = 1; day <= 7; day++) {
    if (!currentPlan[`day${day}`]) {
      availableDays.push(day)
    }
  }
  const daysToAssign = availableDays.slice(0, remainingDays)

  for (let i = 0; i < remainingDays; i++) {
    const day = daysToAssign[i]
    const meal = viableMeals[i]
    currentPlan[`day${day}`] = { meal }
    currentUsedMealIds.add(meal._id.toString())
    console.log(`Phase 2: Assigned high-calorie meal to Day ${day}:`, {
      _id: meal._id,
      mealName: meal.mealName,
      totalCalories: meal.totalCalories,
    })
  }

  // Verify the plan is complete
  if (Object.keys(currentPlan).filter((k) => k.startsWith('day')).length === 7) {
    console.log('Phase 2: Successfully generated a complete 7-day plan with high-calorie meals.')
    // Log used items and their counts
    const usedItems = []
    const mealUsage = buildMealUsage(currentPlan)
    mealUsage.forEach((count, id) => {
      if (count > 0) {
        const meal = combinedMeals.find((m) => m._id.toString() === id)
        if (meal) {
          usedItems.push({
            _id: id,
            name: meal.mealName,
            count,
            restaurantType: meal.restaurantType,
            totalCalories: meal.totalCalories,
          })
        }
      }
    })
    console.log('Phase 2: Used items and counts:', usedItems)
    console.log(
      `Phase 2: Total franchise meals used: ${usedItems.filter((item) => item.restaurantType === 'Franchise').length}`
    )
    console.log(
      `Phase 2: Total dining hall meals used: ${
        usedItems.filter((item) => item.restaurantType === 'DiningHall').length
      }`
    )
    return currentPlan
  }

  // --- Failure Case ---
  console.error('Phase 2: Failed to generate a complete 7-day plan.')
  throw new Error(`🛑 Critical Error: Could not generate a 7-day plan with high-calorie meals.`)
}

function generate14MealPlan(
  breakfastFranchiseFastMeals,
  breakfastDiningFastMeals,
  lunchFranchiseFastMeals,
  lunchDiningFastMeals,
  dinnerFranchiseFastMeals,
  dinnerDiningFastMeals,
  targetCaloriesPerDay,
  preferredMealTypes,
  franchiseCount,
  diningCount,
  maxAttempts = 20000,
  calorieMargin = 300
) {
  console.log('BREAKFAST Franchise:', breakfastFranchiseFastMeals.length)
  console.log('BREAKFAST Dining:', breakfastDiningFastMeals.length)
  console.log('LUNCH Franchise:', lunchFranchiseFastMeals.length)
  console.log('LUNCH Dining:', lunchDiningFastMeals.length)
  console.log('DINNER Franchise:', dinnerFranchiseFastMeals.length)
  console.log('DINNER Dining:', dinnerDiningFastMeals.length)
  const allDiningEmptyFranchiseOnly =
    breakfastDiningFastMeals.length === 0 && lunchDiningFastMeals.length === 0 && dinnerDiningFastMeals.length === 0

  if (allDiningEmptyFranchiseOnly && diningCount == 14) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const emptyPlan = {}
    for (let i = 0; i < 7; i++) {
      emptyPlan[daysOfWeek[i]] = { meal: [] } // or { meal: null } or simply []
    }

    console.log('Empty meal plan:', emptyPlan)
    return emptyPlan
  }
  if (allDiningEmptyFranchiseOnly) {
    // Combine all franchise meals and filter by preferredMealTypes
    const allFranchiseMeals = [
      ...(Array.isArray(breakfastFranchiseFastMeals) && breakfastFranchiseFastMeals.length > 0
        ? breakfastFranchiseFastMeals
        : []),
      ...(Array.isArray(lunchFranchiseFastMeals) && lunchFranchiseFastMeals.length > 0 ? lunchFranchiseFastMeals : []),
      ...(Array.isArray(dinnerFranchiseFastMeals) && dinnerFranchiseFastMeals.length > 0
        ? dinnerFranchiseFastMeals
        : []),
    ].filter((meal) => preferredMealTypes.includes(meal.mealType))

    const uniqueFranchiseRestaurants = new Set(allFranchiseMeals.map((meal) => meal.restaurantName))
    const Restaurantcount = uniqueFranchiseRestaurants.size
    console.log('✅ Franchise restaurant count:', Restaurantcount)

    if (Restaurantcount == 2 || Restaurantcount == 3) {
      const uniqueFranchiseMealsMap = new Map()
      allFranchiseMeals.forEach((meal) => {
        uniqueFranchiseMealsMap.set(meal._id.toString(), meal)
      })

      const uniqueFranchiseMeals = Array.from(uniqueFranchiseMealsMap.values())

      // Sort by calories descending
      uniqueFranchiseMeals.sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))

      // Shuffle the top 30 to add randomness
      const topMeals = uniqueFranchiseMeals.slice(0, 30)
      for (let i = topMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[topMeals[i], topMeals[j]] = [topMeals[j], topMeals[i]]
      }

      // Select 7 meals ensuring restaurant doesn't repeat on consecutive days
      const selectedMeals = []
      let lastRestaurant = null

      for (let i = 0; i < topMeals.length && selectedMeals.length < 7; i++) {
        const meal = topMeals[i]
        const currentRestaurant = meal.restaurantName
        if (!currentRestaurant) continue

        // Ensure not same as previous day's restaurant
        if (
          selectedMeals.length === 0 ||
          currentRestaurant !== selectedMeals[selectedMeals.length - 1].restaurantName
        ) {
          selectedMeals.push(meal)
        }
      }

      // If still less than 7, fill remaining with any meal that doesn't break the alternate rule
      for (let i = 0; i < topMeals.length && selectedMeals.length < 7; i++) {
        const meal = topMeals[i]
        const currentRestaurant = meal.restaurantName
        if (!currentRestaurant) continue

        const lastIndex = selectedMeals.length - 1
        const lastRestaurant = selectedMeals[lastIndex]?.restaurantName
        const secondLastRestaurant = selectedMeals[lastIndex - 1]?.restaurantName

        if (
          currentRestaurant !== lastRestaurant &&
          !(currentRestaurant === secondLastRestaurant && lastRestaurant === currentRestaurant)
        ) {
          selectedMeals.push(meal)
        }
      }

      // Build the plan
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const plan = {}
      for (let i = 0; i < 7; i++) {
        plan[daysOfWeek[i]] = { meal: selectedMeals[i] || null }
      }

      console.log(
        `[Franchise Only] Selected 7 meals (no consecutive repeats):`,
        selectedMeals?.map((m) => `${m.name} (${m.restaurantName})`)
      )

      return plan
    } else {
      // Remove duplicates by _id
      const uniqueFranchiseMealsMap = new Map()
      allFranchiseMeals.forEach((meal) => {
        uniqueFranchiseMealsMap.set(meal._id.toString(), meal)
      })

      const uniqueFranchiseMeals = Array.from(uniqueFranchiseMealsMap.values())

      // Sort by calories descending
      uniqueFranchiseMeals.sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))

      // Shuffle the top 30 to add randomness, then pick 21
      const topMeals = uniqueFranchiseMeals.slice(0, 30)
      for (let i = topMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[topMeals[i], topMeals[j]] = [topMeals[j], topMeals[i]]
      }

      // Select up to 7 meals with restaurant constraint
      const selectedMeals = []
      const restaurantCount = {}
      for (let i = 0; i < topMeals.length && selectedMeals.length < 7; i++) {
        const meal = topMeals[i]
        const name = meal.restaurantName
        if (!name) continue
        if (!restaurantCount[name]) restaurantCount[name] = 0
        if (restaurantCount[name] < 2) {
          selectedMeals.push(meal)
          restaurantCount[name]++
        }
      }

      // Build the plan
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const plan = {}
      for (let i = 0; i < 7; i++) {
        plan[daysOfWeek[i]] = { meal: selectedMeals[i] }
      }

      console.log(
        '[Franchise Only] Selected 7 meals (types: ${preferredMealTypes.join(", ")}, max 2/restaurant):',
        selectedMeals?.map((m) => `${m.name} (${m.restaurantName})`)
      )

      console.log('hehe')
      return plan
    }
  }
  const breakfastMeals = [...breakfastFranchiseFastMeals, ...breakfastDiningFastMeals]

  const lunchMeals = [...lunchFranchiseFastMeals, ...lunchDiningFastMeals]

  const dinnerMeals = [...dinnerFranchiseFastMeals, ...dinnerDiningFastMeals]
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
    console.log(
      '[Franchise Only] Selected 7 unique high-calorie franchise meals:',
      fallbackFranchise.map((m) => m.name)
    )
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
      tryCombinations.push({
        aList: getAvailableMeals(firstMealType, 'Dining-Halls'),
        bList: getAvailableMeals(secondMealType, 'Franchise'),
        source: ['Dining-Halls', 'Franchise'],
      })
      tryCombinations.push({
        aList: getAvailableMeals(firstMealType, 'Franchise'),
        bList: getAvailableMeals(secondMealType, 'Dining-Halls'),
        source: ['Franchise', 'Dining-Halls'],
      })
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

    // === Phase 2: Fill with random meals to meet franchise and dining counts, ignoring calories ===
    if (!validCombo) {
      // Try combinations prioritizing remaining franchise and dining counts
      const tryPhase2Combinations = []

      // Define available meal pools with maxUses = 2
      const aDiningList = allMealsByType[firstMealType].filter(
        (m) => m.restaurantType === 'Dining-Halls' && mealUsage.get(m._id) < 1
      )
      const aFranchiseList = allMealsByType[firstMealType].filter(
        (m) => m.restaurantType === 'Franchise' && mealUsage.get(m._id) < 1
      )
      const bDiningList = allMealsByType[secondMealType].filter(
        (m) => m.restaurantType === 'Dining-Halls' && mealUsage.get(m._id) < 1
      )
      const bFranchiseList = allMealsByType[secondMealType].filter(
        (m) => m.restaurantType === 'Franchise' && mealUsage.get(m._id) < 1
      )

      // Prioritize combinations based on remaining counts
      if (diningMealsUsed + 2 <= diningCount) {
        tryPhase2Combinations.push({
          aList: aDiningList,
          bList: bDiningList,
          source: ['Dining-Halls', 'Dining-Halls'],
        })
      }
      if (franchiseMealsUsed + 2 <= franchiseCount) {
        tryPhase2Combinations.push({
          aList: aFranchiseList,
          bList: bFranchiseList,
          source: ['Franchise', 'Franchise'],
        })
      }
      if (diningMealsUsed + 1 <= diningCount && franchiseMealsUsed + 1 <= franchiseCount) {
        tryPhase2Combinations.push({
          aList: aDiningList,
          bList: bFranchiseList,
          source: ['Dining-Halls', 'Franchise'],
        })
        tryPhase2Combinations.push({
          aList: aFranchiseList,
          bList: bDiningList,
          source: ['Franchise', 'Dining-Halls'],
        })
      }

      for (const { aList, bList, source } of tryPhase2Combinations) {
        if (!aList.length || !bList.length) continue

        // Randomly select meals without checking calories
        const a = getRandomMeal(aList, 2)
        const b = getRandomMeal(bList, 2)
        if (!a || !b || (a._id === b._id && firstMealType === secondMealType)) continue

        validCombo = {
          a,
          b,
          source,
          method: 'Phase 2: Random fill ignoring calories',
        }
        break
      }
    }

    // Final fallback fail
    if (!validCombo) {
      issues.push(`❌ Day ${day} failed to find a valid meal combination.`)
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
    throw new Error('Failed:\n' + issues.join('\n'))
  }

  // Summary log
  const usedMealCounts = {}
  let franchiseMealsUsedFinal = 0
  let diningMealsUsedFinal = 0
  mealUsage.forEach((count, id) => {
    if (count > 0) {
      usedMealCounts[id] = count
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

  console.log('[14 Meal Plan] Used meal IDs and counts:')
  Object.entries(usedMealCounts).forEach(([id, count]) => {
    console.log(`_id: ${id}, count: ${count}`)
  })
  console.log('Meal usage summary:', usedMealCounts)
  console.log('Total franchise meals used:', franchiseMealsUsedFinal)
  console.log('Total dining meals used:', diningMealsUsedFinal)

  return plan
}

// Helper to build meal usage map from a plan
function buildMealUsage(plan) {
  const mealUsage = new Map()
  Object.values(plan).forEach(({ meal }) => {
    const id = meal._id
    mealUsage.set(id, (mealUsage.get(id) || 0) + 1)
  })
  return mealUsage
}

module.exports = {
  generate19MealPlan,
  generate14MealPlan,
  generate7MealPlan,
  generate21MealPlan,
}
