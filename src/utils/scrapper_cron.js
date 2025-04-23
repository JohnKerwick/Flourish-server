import cron from 'node-cron'
import { scrapeHPU } from '../scrappers/hpuScrapper'
import { scrapeUMD } from '../scrappers/umdScrapper'
import { scrapeUNCC } from '../scrappers/unccScrapper'
import { CONTROLLER_SCRAPPER } from '../controllers/index'
// "0 0 * * 0", Every sunday at 00:00 - Required
// "59 14 * * 1", Every monday at 14:59
// "* * * * * *", Every second
// "* * * * *", Every minute
// 0 0 0 * * *, Every Midnight
// 0 0 * * *, every 24 hour
// 0 0 * * *, every 24 hour

export const scheduleScraper = cron.schedule(
  '* * * * *',
  async () => {
    // CONTROLLER_SCRAPPER.scrapeAllMenus()
    console.log('ME CHAL RHA HO')
  },
  { timezone: 'America/New_York' }
)
// try {
//   const allData = []
//   console.log('Scraping HPU...')
//   const hpuData = await scrapeHPU()
//   if (hpuData) allData.push(...hpuData)
//   console.log('Scraping UNCC...')
//   const unccData = await scrapeUNCC()
//   if (unccData) allData.push(...unccData)
//   console.log('Scraping UMD...')
//   const umdData = await scrapeUMD()
//   if (umdData) allData.push(...umdData)
//   notifyError('Scrapper Sucess')
// } catch (error) {
//   console.error('Error during scraping:', error)
//   notifyError(error)
//   res.status(500).json({ message: 'Scraping failed', error: error.message })
// }
