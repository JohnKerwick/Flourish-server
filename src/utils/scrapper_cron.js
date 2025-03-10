import cron from 'node-cron'
import { CONTROLLER_SCRAPPER } from '../controllers/scrapper'

const scheduleScraper = () => {
  cron.schedule('0 0 * * *', async () => {
    CONTROLLER_SCRAPPER.scrapeAllMenus()
  })
}

export default scheduleScraper
