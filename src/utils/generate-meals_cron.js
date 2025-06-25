import { schedule } from 'node-cron'
import { CONTROLLER_GENERATE_MEAL } from '../controllers'
import { GeneratedMeal } from '../models/generatedMeals'
import { sleep } from './estimateTokens'

const campuses = ['HPU', 'UMD', 'UNCC']
const mealTypes = ['Breakfast', 'Lunch', 'Dinner']
const calorieRanges = {
  Breakfast: { min: 200, max: 800 },
  Lunch: { min: 600, max: 1200 },
  Dinner: { min: 800, max: 1500 },
}

export const mealGenerationTask = schedule(
  '0 0 0 * * *', // Every midnight
  async () => {
    await GeneratedMeal.deleteMany({})
    console.log('🧹 Deleted all existing generated meals.')
    for (const campus of campuses) {
      for (const type of mealTypes) {
        try {
          console.log(`🟢 Running generateMeals for ${campus} - ${type}`)
          await CONTROLLER_GENERATE_MEAL.generateMeals({
            campus: [campus],
            types: [type],
            calorieRange: {
              [type]: calorieRanges[type],
            },
          })
          await sleep(30000) // wait 30 seconds to stay under TPM
        } catch (err) {
          console.error(`🔴 Failed to run generateMeals for ${campus} - ${type}`, err)
        }
      }
    }
  },
  { timezone: 'America/New_York' }
)

export async function runMealGenerationManually() {
  console.log('🔵 Running manual meal generation...')
  await GeneratedMeal.deleteMany({})
  console.log('🧹 Deleted all existing generated meals.')

  for (const campus of campuses) {
    for (const type of mealTypes) {
      await CONTROLLER_GENERATE_MEAL.generateMeals({
        campus: [campus],
        types: [type],
        calorieRange: { [type]: calorieRanges[type] },
      })
      await sleep(30000) // wait 30 seconds to stay under TPM
    }
  }
}
