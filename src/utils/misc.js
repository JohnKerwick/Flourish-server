import mongoose from 'mongoose'

export const toObjectId = (id) => {
  return mongoose.Types.ObjectId(id)
}

export const getLoginLinkByEnv = () => {
  return process.env.CLOUD === 'DEV_CLOUD' ? process.env.DOMAIN_FRONT_DEV : process.env.DOMAIN_PROD
}

export const getMaxCaloriesPerMeal = (mealsPerWeek, mealType, dailyCalories, margin) => {
  const mealsPerDay = mealsPerWeek / 7

  if (mealsPerDay === 1) {
    return dailyCalories + margin
  }

  if (mealsPerDay === 2) {
    return dailyCalories / 2 + margin
  }

  if (mealsPerDay >= 3) {
    if (mealType.includes('Breakfast')) return dailyCalories * 0.4 + margin
    return dailyCalories * 0.3 + margin
  }

  return dailyCalories + margin // fallback
}

export const dietPlanModify = (mealRecommendations, dietPlan) => {
  let modifiedPlan

  // Extract values safely
  const { franchise, diningHall } = dietPlan

  // Check if both Franchise and DiningHall values are provided

  let franchiseCount = 0
  let diningHallCount = 0
  if (franchise > 0 || diningHall >= 0) {
    modifiedPlan = mealRecommendations.map((mealType) => {
      const franchiseMeals = mealType.recommendations.flatMap((item) =>
        item.items.filter((i) => i.restaurantType === 'Franchise')
      )
      const diningHallMeals = mealType.recommendations.flatMap((item) =>
        item.items.filter((i) => i.restaurantType === 'Dining-Halls')
      )

      console.log('franchiseMeals', franchiseMeals)
      console.log('diningHallMeals', diningHallMeals)

      franchiseCount = franchiseCount + franchiseMeals.length
      diningHallCount = diningHallCount + diningHallMeals.length
      return {
        ...mealType,
        franchiseCount: franchiseMeals.length,
        diningHallCount: diningHallMeals.length,
      }
    })

    console.log('franchiseCount', franchiseCount)
    console.log('diningHallCount', diningHallCount)
    // Optionally calculate total count if needed
    // const totalFranchise = modifiedPlan.reduce(
    //   (sum, meal) => sum + meal.franchiseCount,
    //   0
    // );
    // const totalDiningHall = modifiedPlan.reduce(
    //   (sum, meal) => sum + meal.diningHallCount,
    //   0
    // );

    // return {
    //   modifiedPlan,
    //   totalFranchise,
    //   totalDiningHall,
    // };
  }

  return modifiedPlan
}

export const caloriesInMeal = (selectedMeal, totalCalories) => {
  const caloriesPerMeal = {}
  if (selectedMeal.length === 3) {
    if (selectedMeal.includes('Breakfast')) {
      caloriesPerMeal.Breakfast = totalCalories * 0.4
    }
    if (selectedMeal.includes('Lunch')) {
      caloriesPerMeal.Lunch = totalCalories * 0.3
    }
    if (selectedMeal.includes('Dinner')) {
      caloriesPerMeal.Dinner = totalCalories * 0.3
    }
  }
  if (selectedMeal.length === 2) {
    if (selectedMeal.includes('Breakfast')) {
      caloriesPerMeal.Breakfast = totalCalories * 0.5
    }
    if (selectedMeal.includes('Lunch')) {
      caloriesPerMeal.Lunch = totalCalories * 0.5
    }
    if (selectedMeal.includes('Dinner')) {
      caloriesPerMeal.Dinner = totalCalories * 0.5
    }
  }
  if (selectedMeal.length === 1) {
    if (selectedMeal.includes('Breakfast')) {
      caloriesPerMeal.Breakfast = totalCalories
    }
    if (selectedMeal.includes('Lunch')) {
      caloriesPerMeal.Lunch = totalCalories
    }
    if (selectedMeal.includes('Dinner')) {
      caloriesPerMeal.Dinner = totalCalories
    }
  }
  return caloriesPerMeal
}

export const promptSentence = (meals) => {
  const entries = Object.entries(meals)

  const sentence =
    'Total calories for ' +
    entries
      .map(([meal, cal], index) => {
        const mealName = index === 0 ? meal : meal.toLowerCase()
        return `${mealName} should be ${cal}`
      })
      .join(entries.length === 2 ? ' and ' : ', ')
      .replace(/, ([^,]*)$/, ' and $1') +
    ' You are strictly ordered not to exceed the calories limit.'

  return sentence
}
export const generateMealPlan = (
  mealRecommendations,
  desiredFranchise,
  desiredDining,
  selectedMealTypes = ['Breakfast', 'Lunch', 'Dinner']
) => {
  const mealsPerType = 7
  const result = {
    possible: true,
    adjustedSplit: {},
    test: {},
  }

  // Helper to flatten nested structure
  const flattenItems = (recommendations) => recommendations.flatMap((group) => group.items || [])

  const franchisePerMeal = Math.floor(desiredFranchise / selectedMealTypes.length)
  const diningPerMeal = Math.floor(desiredDining / selectedMealTypes.length)
  const franchiseRemainder = desiredFranchise % selectedMealTypes.length
  const diningRemainder = desiredDining % selectedMealTypes.length

  selectedMealTypes.forEach((mealType, index) => {
    const mealEntries = mealRecommendations.filter((m) => m.mealType === mealType)
    const allRecommendations = mealEntries.flatMap((entry) => entry.recommendations)
    const allItems = flattenItems(allRecommendations)

    const franchiseItems = allItems.filter((i) => i.restaurantType === 'Franchise')
    const diningItems = allItems.filter((i) => i.restaurantType === 'Dining-Halls')

    let desiredF = franchisePerMeal + (index < franchiseRemainder ? 1 : 0)
    let desiredD = diningPerMeal + (index < diningRemainder ? 1 : 0)

    const selectedFranchise = franchiseItems.slice(0, desiredF)
    const selectedDining = diningItems.slice(0, desiredD)

    let combined = [...selectedFranchise, ...selectedDining]
    let total = combined.length

    const remainingFranchise = franchiseItems.slice(desiredF)
    const remainingDining = diningItems.slice(desiredD)

    while (total < mealsPerType) {
      if (remainingFranchise.length > 0) {
        combined.push(remainingFranchise.shift())
        total++
      } else if (remainingDining.length > 0) {
        combined.push(remainingDining.shift())
        total++
      } else {
        break
      }
    }

    if (combined.length < mealsPerType) result.possible = false

    result[mealType] = combined
    result.adjustedSplit[mealType] = {
      franchise: combined.filter((i) => i.restaurantType === 'Franchise').length,
      diningHall: combined.filter((i) => i.restaurantType === 'Dining-Halls').length,
    }
    result.test = { franchiseItems, diningItems }
  })

  return result
}

export function compressRecommendations(data) {
  const result = {}

  for (const key in data) {
    if (!result[key]) {
      result[key] = []
    }
    data[key].forEach((item) => {
      result[key].push({
        id: item._id,
        name: item.name,
        calories: item.calories,
        resturantName: item.restaurantName,
      })
    })
  }
  return result
}

// export function compressRecommendations(data) {
//   console.log('Data is:', data)
//   const result = {}

//   for(let i = 0; i < data.length; i++) {
//     const category = data[i]._id
//     if (!result[mealType]) {
//       result[mealType] = []
//     }
//     data[i].recommendations.forEach((item) => {
//       item.items.forEach((i) => {
//         result[mealType].push({
//           id: i._id,
//           name: i.name,
//           calories: i.calories,
//           resturantName: i.restaurantName,
//         })
//       })
//     })
//   }
//   // for (const key in data) {
//   //   if (!result[key]) {
//   //     result[key] = []
//   //   }
//   //   data[key].forEach((item) => {
//   //     result[key].push({
//   //       id: item._id,
//   //       name: item.name,
//   //       calories: item.calories,
//   //       resturantName: item.restaurantName,
//   //     })
//   //   })
//   // }
//   return result
// }
