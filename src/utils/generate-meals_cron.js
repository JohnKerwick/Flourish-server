import { schedule } from 'node-cron'
import { CONTROLLER_GENERATE_MEAL, CONTROLLER_SCRAPPER } from '../controllers'
import { GeneratedMeal, GeneratedMealNew } from '../models/generatedMeals'
import { sleep } from './estimateTokens'
import { notifyError } from '../middlewares'

const campuses = ['HPU', 'UMD', 'UNCC']
const mealTypes = ['Breakfast', 'Lunch', 'Dinner']
// const calorieRanges = {
//   Breakfast: { min: 200, max: 800 },
//   Lunch: { min: 600, max: 1200 },
//   Dinner: { min: 800, max: 1500 },
// }
// const calorieRanges = {
//   Breakfast: { min: 200, max: 2000 },
//   Lunch: { min: 200, max: 2000 },
//   Dinner: { min: 200, max: 2000 },
// }
const calorieRanges = {
  Breakfast: { min: 300, max: 1500 },
  Lunch: { min: 300, max: 1600 },
  Dinner: { min: 400, max: 2000 },
}

// 👇 Wrap everything in an async IIFE
;(async () => {
  console.log('📅 Initializing meal generation cron jobs...')
  const jobs = []
  let jobIndex = 0
  let count = 0
  for (const campus of campuses) {
    for (const type of mealTypes) {
      const calorieRange = calorieRanges[type]
      // const baseMinutes = 30 // Start at 00:30
      const baseMinutes = 5 * 60 + 50 // 5:50 AM = 350 minutes
      const totalMinutes = baseMinutes + jobIndex * 6
      const minute = totalMinutes % 60
      const hour = Math.floor(totalMinutes / 60)

      const job = schedule(
        `${minute} ${hour} * * *`,
        async () => {
          const body = {
            campus: [campus],
            types: [type],
            calorieRange,
          }

          console.log(`🔁 [${campus}] [${type}] Starting job at ${hour}:${minute} (ET)`)

          try {
            if (count === 0) {
              // should be new GeneratedMealNew
              console.log('🧹 Deleting old generated meals...')
              await GeneratedMeal.deleteMany({})
              console.log('✅ Old meals deleted.')
            }
            await CONTROLLER_GENERATE_MEAL.generateMeals(body)
            console.log(`✅ Success for ${campus} - ${type}`)
            notifyError(`✅ Meal Generation Success for ${campus} - ${type}`)

            count++
          } catch (err) {
            console.error(`❌ Failed for ${campus} - ${type}`, err)
            notifyError(`❌ Meal Generation Failed for ${campus} - ${type}`, err)
          }
        },
        { timezone: 'America/New_York' }
      )

      jobs.push(job)
      jobIndex++
    }
  }
  console.log('📆 Meal generation cron jobs initialized.')
})()

// Manual trigger function (for testing)
export async function runMealGenerationManually() {
  console.log('🧪 Manually triggering all 9 meal generation jobs...')
  await GeneratedMealNew.deleteMany({})
  console.log('🧹 Deleted all existing generated meals.')
  for (const campus of campuses) {
    for (const type of mealTypes) {
      const calorieRange = calorieRanges[type]
      const body = {
        campus: [campus],
        types: [type],
        calorieRange,
      }

      console.log(`🔁 [Manual] Generating for ${campus} - ${type}`)
      try {
        await CONTROLLER_GENERATE_MEAL.generateMealsTesting(body)
        console.log(`✅ [Manual] Success for ${campus} - ${type}`)
      } catch (err) {
        console.error(`❌ [Manual] Failed for ${campus} - ${type}`, err)
      }

      await new Promise((res) => setTimeout(res, 3 * 60 * 1000)) // 3-minute delay
    }
  }

  console.log('✅ Manual run complete.')
}

// export const mealGenerationTask = schedule(
//   '0 0 0 * * *', // Every midnight
//   async () => {
//     await GeneratedMeal.deleteMany({})
//     console.log('🧹 Deleted all existing generated meals.')
//     for (const campus of campuses) {
//       for (const type of mealTypes) {
//         try {
//           const calorieRange = calorieRanges[type]

//           console.log(`🚀 Starting: ${campus} - ${type}`)
//           await CONTROLLER_GENERATE_MEAL.generateMeals({
//             campus: [campus],
//             types: [type],
//             calorieRange,
//           })
//         } catch (err) {
//           console.error(`🔴 Failed to run generateMeals for ${campus} - ${type}`, err)
//         }
//         await sleep(30000) // wait 30 seconds to stay under TPM
//         console.log(`✅ Finished: ${campus} - ${type}`)
//       }
//     }
//     console.log('🎉 All 9 API calls completed sequentially.')
//   },
//   { timezone: 'America/New_York' }
// )

// export async function runMealGenerationManually() {
//   console.log('🔵 Running manual meal generation...')
//   await GeneratedMeal.deleteMany({})
//   console.log('🧹 Deleted all existing generated meals.')

//   for (const campus of campuses) {
//     for (const type of mealTypes) {
//       const calorieRange = calorieRanges[type]

//       console.log(`🚀 Starting: ${campus} - ${type}`)

//       try {
//         await CONTROLLER_GENERATE_MEAL.generateMeals({
//           campus: [campus],
//           types: [type],
//           calorieRange, // ✅ Correct format
//         })
//         console.log(`✅ Finished: ${campus} - ${type}`)
//       } catch (err) {
//         console.error(`❌ Failed: ${campus} - ${type}`, err)
//       }

//       // ⏳ Wait 3 minutes (180000ms) before next call
//       console.log('🕒 Waiting 3 minutes before next call...')
//       await sleep(180000)
//     }
//   }
//   console.log('🎉 All 9 API calls completed sequentially.')
// }
