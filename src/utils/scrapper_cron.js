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

export const task = schedule(
  '0 0 0 * * *',
  () => {
    CONTROLLER_SCRAPPER.scrapeAllMenus()
  },
  { timezone: 'America/New_York' }
)
