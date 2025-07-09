// Using ES6 module import syntax
import { schedule } from 'node-cron'
import { scrapeDataMenus } from '../utils/scrapper-util'
import { CONTROLLER_SCRAPPER } from '../controllers'
import { scrapeHPU } from '../scrappers/hpuScrapper'
import { scrapeUMD } from '../scrappers/umdScrapper'
import { scrapeUNCC } from '../scrappers/unccScrapper'
import { notifyError } from '../middlewares/errorHandler'

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
  const hour = 3 // 4 AM
  const minute = 5

  const cronTime = `${minute} ${hour} * * *`

  schedule(
    cronTime,
    // '* * * * *',
    async () => {
      console.log('📆 Scrapper cron job initialized Inside.')

      try {
        notifyError('Scraper Initialized')
        await scrapeHPU()
        // await scrapeUNCC()
        // await scrapeUMD()
        notifyError(' Scraper Succeeded')
      } catch (err) {
        notifyError('❌ Scraper Failed', err)
      }
    },
    {
      timezone: 'America/New_York',
    }
  )
})()
