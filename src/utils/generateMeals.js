const _ = require('lodash')
const { isForbiddenCombo } = require('./isForbiddenCombo')

// Simulated calorie-safe threshold
const CALORIE_TOLERANCE = 100

export const generateMealSuggestions = (items, mealType, targetCalories) => {
  const categorizedItems = items.reduce((acc, group) => {
    acc[group._id] = group.items
    return acc
  }, {})

  const mains = categorizedItems['Main'] || []
  const sides = categorizedItems['Side'] || []
  const drinks = categorizedItems['Drink'] || []
  const desserts = categorizedItems['Dessert'] || []
  const fruits = categorizedItems['Fruit'] || []
  const vegetables = categorizedItems['Vegetable'] || []

  console.log('Mains:', mains.length)
  console.log('Sides:', sides.length)
  console.log('Drinks:', drinks.length)
  console.log('Desserts:', desserts.length)
  console.log('Fruits:', fruits.length)
  console.log('Vegetables:', vegetables.length)

  const suggestions = []

  for (const main of mains) {
    console.log('Main:', main)
    for (const side of sides) {
      for (const drink of drinks) {
        for (const fruit of fruits) {
          const baseCombo = [main, side, drink, fruit]

          // Optionally add dessert
          const dessert = _.sample(desserts)
          const meal = dessert ? [...baseCombo, dessert] : baseCombo

          if (isForbiddenCombo(meal)) continue

          const totalCalories = meal.reduce((sum, item) => sum + (item.nutrients?.calories || 0), 0)

          if (Math.abs(totalCalories - targetCalories) <= CALORIE_TOLERANCE) {
            suggestions.push({ mealType, items: meal, totalCalories })
          }

          if (suggestions.length >= 10) return suggestions
        }
      }
    }
  }

  return suggestions
}
