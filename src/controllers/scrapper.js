import { scrapeHPU } from '../scrappers/hpuScrapper'
import { scrapeUMD } from '../scrappers/umdScrapper'
import { scrapeUNCC } from '../scrappers/unccScrapper'
import { Restaurant } from '../models'

export const CONTROLLER_SCRAPPER = {
  async scrapeAllMenus(req, res) {
    try {
      const allData = []

      console.log('Scraping UMD...')
      const umdData = await scrapeUMD()
      if (umdData) allData.push(...umdData)

      console.log('Scraping HPU...')
      const hpuData = await scrapeHPU()
      if (hpuData) allData.push(...hpuData)

      console.log('Scraping UNCC...')
      const unccData = await scrapeUNCC()
      if (unccData) allData.push(...unccData)

      res.status(200).json({
        message: 'Scraping completed and data saved to MongoDB successfully',
        data: allData,
      })
    } catch (error) {
      console.error('Error during scraping:', error)
      res.status(500).json({ message: 'Scraping failed', error: error.message })
    }
  },
}
