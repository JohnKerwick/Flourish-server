import { Meals } from '../models'
import { scrapeHPU } from '../scrappers/hpuScrapper'
import { scrapeUMD } from '../scrappers/umdScrapper'
import { scrapeUNCC } from '../scrappers/unccScrapper'

export const scrapeDataMenus = async (data) => {
  const allData = []
  await Meals.deleteMany({ restaurantType: { $ne: 'Franchise' } })

  console.log('Scraping HPU...')
  const hpuData = await scrapeHPU()
  if (hpuData) allData.push(...hpuData)

  console.log('Scraping UNCC...')
  const unccData = await scrapeUNCC()
  if (unccData) allData.push(...unccData)

  console.log('Scraping UMD...')
  const umdData = await scrapeUMD()
  if (umdData) allData.push(...umdData)
}
