// Using ES6 module import syntax
import { schedule } from 'node-cron'
import { CONTROLLER_SCRAPPER } from '../controllers'
// "0 0 * * 0", Every sunday at 00:00 - Required
// "59 14 * * 1", Every monday at 14:59
// "* * * * * *", Every second
// "* * * * *", Every minute
// 0 0 0 * * *, Every Midnight
// 0 0 * * *, every 24 hour
// Define the task using ES6 arrow function syntax

// export const task = schedule(
//   '0 0 0 * * *',
//   () => {
//     CONTROLLER_SCRAPPER.scrapeAllMenus()
//   },
//   { timezone: 'America/New_York' }
// )
;(async () => {
  console.log('📅 Initializing meal generation cron job...')

  // Set job start time: 00:00 AM

  const hour = 5 // 4 AM
  const minute = 20

  const cronTime = `${minute} ${hour} * * *` // daily at calculated time
  console.log(`⏰ Scheduling job at ${cronTime} (America/New_York)`)

  schedule(
    cronTime,
    async () => {
      try {
        notifyError('Scraper Initialized')
        await CONTROLLER_SCRAPPER.scrapeAllMenus()
        console.log('✅ Scraper Succeeded')
      } catch (err) {
        notifyError('❌ Scraper Failed', err)
      }
    },
    {
      timezone: 'America/New_York',
    }
  )

  console.log('📆 Meal generation cron job initialized.')
})()
