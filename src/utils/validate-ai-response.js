export function validateAiResponse(example) {
  if (example.length === 7) {
    return example
  }
  if (example.length > 7) {
    return example.slice(0, 7)
  }
  if (example.length < 7) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const result = []

    while (result.length < 7) {
      const nextItem = { ...example[result.length % example.length] }
      nextItem.day = daysOfWeek[result.length]
      result.push(nextItem)
    }

    return result
  }
}

export function validateRestaurantUniformality(weeklyMealData) {
  const cleanedMealData = []
  for (const dayEntry of weeklyMealData) {
    // const cleanedDay = { day: dayEntry.day }
    const cleanedDay = { ...dayEntry }
    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
      const mealItems = dayEntry[mealType]
      if (Array.isArray(mealItems)) {
        const restaurantCount = {}
        // Count number of items per restaurant
        for (const item of mealItems) {
          const restaurant = item.restaurantName
          restaurantCount[restaurant] = (restaurantCount[restaurant] || 0) + 1
        }
        // Determine most frequent restaurant
        const [topRestaurant] = Object.entries(restaurantCount).reduce(
          (maxEntry, currEntry) => (currEntry[1] > maxEntry[1] ? currEntry : maxEntry),
          ['', 0]
        )
        // Keep only items from the top restaurant
        const filteredItems = mealItems.filter((item) => item.restaurantName === topRestaurant)
        // Optionally: log removed items
        const removedItems = mealItems.filter((item) => item.restaurantName !== topRestaurant)
        if (removedItems.length > 0) {
          console.log(`\n:date: Day: ${dayEntry.day} | :knife_fork_plate: Meal: ${mealType}`)
          console.log(`:white_check_mark: Keeping restaurant: ${topRestaurant}`)
          console.log(`:x: Removed ${removedItems.length} item(s):`)
          for (const item of removedItems) {
            console.log(`   - ${item.name} (from: ${item.restaurantName})`)
          }
        }
        cleanedDay[mealType] = filteredItems
      }
    }
    cleanedMealData.push(cleanedDay)
  }
  return cleanedMealData
}
