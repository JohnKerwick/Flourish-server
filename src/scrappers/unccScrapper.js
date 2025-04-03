import { notifyError } from '../middlewares/errorHandler'
const puppeteer = require('puppeteer')
import { Meals, Restaurants } from '../models'
import { delay, randomDelay } from '../utils/delay'
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
]

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)]
const createBrowser = async () => {
  // Check if running on Heroku (process.env.DYNO is set on Heroku)
  const isHeroku = process.env.DYNO
  return await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920x1080',
      // Additional args for Heroku
      isHeroku ? '--disable-software-rasterizer' : null,
      isHeroku ? '--disable-extensions' : null,
    ].filter(Boolean), // Remove null values
    // Specify executable path for Heroku
    executablePath: isHeroku ? process.env.PUPPETEER_EXECUTABLE_PATH : null,
  })
}
export const scrapeUNCC = async () => {
  const locations = [
    { id: '587124593191a200db4e68af', name: 'SoVi' },
    { id: '58711fef3191a200e44e67a1', name: 'Social 704' },
  ]

  const today = new Date()
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  const isHeroku = process.env.DYNO

  const browser = await createBrowser()

  const page = await browser.newPage()

  await page.setUserAgent(getRandomUserAgent())
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://dineoncampus.com/',
  })

  const allLocationsData = []

  for (const location of locations) {
    let locationData = {
      restaurant: location.name,
      campus: ['UNCC'],
      category: 'Dining-Halls',
      menu: [],
      tabItems: [],
    }

    while (true) {
      try {
        console.log(`Processing location: ${location.name}`)
        await page.goto(
          `https://api.dineoncampus.com/v1/location/${location.id}/periods?platform=0&date=${formattedDate}`,
          { waitUntil: 'networkidle2' }
        )
        await delay(randomDelay())
        const body = await page.evaluate(() => document.body.innerText)
        const data = JSON.parse(body)
        const periods = data.periods

        for (const period of periods) {
          while (true) {
            try {
              await delay(randomDelay())
              await page.goto(
                `https://api.dineoncampus.com/v1/location/${location.id}/periods/${period.id}?platform=0&date=${formattedDate}`,
                { waitUntil: 'networkidle2' }
              )

              const periodBody = await page.evaluate(() => document.body.innerText)
              const periodData = JSON.parse(periodBody)
              const categories = periodData.menu.periods.categories

              const periodMenu = await Promise.all(
                categories.map(async (category) => {
                  const mealCategoryItems = await Promise.all(
                    category.items.map(async (item) => {
                      try {
                        const updatedMeal = await Meals.findOneAndUpdate(
                          { name: item.name, type: periodData.menu.periods.name },
                          {
                            $set: {
                              ingredients: item.ingredients ? item.ingredients.split(',').map((i) => i.trim()) : [],
                              allergens: item.filters.filter((f) => f.type === 'allergen').map((f) => f.name),
                              dieteryPreferences: item.filters.filter((f) => f.type === 'label').map((f) => f.name),
                              nutrients: {
                                calories: (
                                  item.nutrients.find((f) => f.name === 'Calories')?.value_numeric || 0
                                ).toFixed(2),
                                protein: (
                                  item.nutrients.find((f) => f.name === 'Protein (g)')?.value_numeric || 0
                                ).toFixed(2),
                                fat: (
                                  item.nutrients.find((f) => f.name === 'Total Fat (g)')?.value_numeric || 0
                                ).toFixed(2),
                                carbohydrate: (
                                  item.nutrients.find((f) => f.name === 'Total Carbohydrates (g)')?.value_numeric || 0
                                ).toFixed(2),
                              },
                              serving: item.portion || '',
                            },
                          },
                          { new: true, upsert: true, setDefaultsOnInsert: true }
                        )

                        return updatedMeal._id
                      } catch (err) {
                        console.error('Error processing meal item:', err)
                        return null
                      }
                    })
                  )

                  return {
                    category: category.name,
                    items: mealCategoryItems.filter((item) => item !== null),
                  }
                })
              )

              locationData.menu.push(...periodMenu)
              locationData.tabItems.push(periodData.menu.periods.name)
              console.log(periodData.menu.periods.name)
              break
            } catch (error) {
              if (error.message.includes('526')) {
                console.error('Error 526 encountered. Retrying...')
                await delay(1000)
              } else {
                console.error('Error scraping period data:', error)
                notifyError(error)
                break
              }
            }
          }
        }

        await Restaurants.findOneAndUpdate(
          { name: location.name },
          {
            $set: {
              campus: 'UNCC',
              category: 'Dining-Halls',
              menu: locationData.menu,
              tabItems: locationData.tabItems,
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        )

        allLocationsData.push(locationData)

        break
      } catch (error) {
        if (error.message.includes('526')) {
          console.error('Error 526 encountered for location. Retrying...')
          await delay(1000)
        } else {
          console.error(`Error scraping location ${location.name}:`, error)
          break
        }
      }
    }
  }

  await browser.close()
  return allLocationsData
}
