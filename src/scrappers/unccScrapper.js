import axios from 'axios'
import { Agent } from 'https'
import { PricingV2TrunkingCountryInstanceOriginatingCallPrices } from 'twilio/lib/rest/pricing/v2/country'
// import { delay, randomDelay } from '../utils/delay'
// import { notifyError } from '../middlewares/errorHandler'
// import { Meals, Restaurants } from '../models'
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
]

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)]

// export const scrapeUNCC = async () => {
//   const locations = [
//     { id: '587124593191a200db4e68af', name: 'SoVi' },
//     { id: '58711fef3191a200e44e67a1', name: 'Social 704' },
//   ]

//   const today = new Date()
//   const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
//     today.getDate()
//   ).padStart(2, '0')}`

//   console.log('formattedDate', formattedDate)

//   const retryOn526Error = async () => {
//     let response
//     do {
//       try {
//         console.log('Retrying public API...')
//         response = await axios.get('https://api.dineoncampus.com/v1/sites/public', {
//           headers: {
//             'User-Agent': getRandomUserAgent(),
//           },
//         })
//       } catch (error) {
//         console.error('Error during public API retry:', error.message)
//         await delay(1000)
//       }
//     } while (!response || response.status !== 200)

//     console.log('Public API returned 200, resuming scraping...')
//   }

//   const allLocationsData = []

//   for (const location of locations) {
//     let locationData = {
//       restaurant: location.name,
//       campus: ['UNCC'],
//       category: 'Dining-Halls',
//       menu: [],
//       tabItems: [],
//     }

//     while (true) {
//       try {
//         console.log(`Processing location: ${location.name}`)
//         const config = {
//           method: 'get',
//           url: `https://api.dineoncampus.com/v1/location/${location.id}/periods?platform=0&date=${formattedDate}`,
//           httpsAgent: new Agent({ rejectUnauthorized: false }),
//           headers: {
//             'User-Agent': getRandomUserAgent(),
//           },
//         }
//         const { data } = await axios(config)
//         const periods = data.periods

//         for (const period of periods) {
//           while (true) {
//             try {
//               await delay(randomDelay())

//               const periodConfig = {
//                 method: 'get',
//                 url: `https://api.dineoncampus.com/v1/location/${location.id}/periods/${period.id}?platform=0&date=${formattedDate}`,
//                 httpsAgent: new Agent({ rejectUnauthorized: false }),
//                 headers: {
//                   'User-Agent': getRandomUserAgent(),
//                 },
//               }

//               const { data: periodData } = await axios(periodConfig)
//               const categories = periodData.menu.periods.categories

//               const periodMenu = await Promise.all(
//                 categories.map(async (category) => {
//                   const mealCategoryItems = await Promise.all(
//                     category.items.map(async (item) => {
//                       try {
//                         const updatedMeal = await Meals.findOneAndUpdate(
//                           { name: item.name, type: periodData.menu.periods.name },
//                           {
//                             $set: {
//                               ingredients: item.ingredients ? item.ingredients.split(',').map((i) => i.trim()) : [],
//                               allergens: item.filters.filter((f) => f.type === 'allergen').map((f) => f.name),
//                               dieteryPreferences: item.filters.filter((f) => f.type === 'label').map((f) => f.name),
//                               nutrients: {
//                                 calories: item.nutrients.find((f) => f.name === 'Calories')?.value_numeric || 0,
//                                 protein: item.nutrients.find((f) => f.name === 'Protein (g)')?.value_numeric || 0,
//                                 fat: item.nutrients.find((f) => f.name === 'Total Fat (g)')?.value_numeric || 0,
//                                 carbohydrate:
//                                   item.nutrients.find((f) => f.name === 'Total Carbohydrates (g)')?.value_numeric || 0,
//                               },
//                               serving: item.portion || '',
//                             },
//                           },
//                           { new: true, upsert: true, setDefaultsOnInsert: true }
//                         )

//                         return updatedMeal._id
//                       } catch (err) {
//                         console.error('Error processing meal item:', err)
//                         return null
//                       }
//                     })
//                   )

//                   return {
//                     category: category.name,
//                     items: mealCategoryItems.filter((item) => item !== null),
//                   }
//                 })
//               )

//               locationData.menu.push(...periodMenu)
//               locationData.tabItems.push(periodData.menu.periods.name)

//               break
//             } catch (error) {
//               if (error.response && error.response.status === 526) {
//                 console.error('Error 526 encountered. Retrying with public API...')
//                 await retryOn526Error()
//               } else {
//                 console.error('Error scraping period data:', error)
//                 notifyError(error)
//                 break
//               }
//             }
//           }
//         }

//         await Restaurants.findOneAndUpdate(
//           { name: location.name },
//           {
//             $set: {
//               campus: 'UNCC',
//               category: 'Dining Halls',
//               menu: locationData.menu,
//               tabItems: locationData.tabItems,
//             },
//           },
//           { new: true, upsert: true, setDefaultsOnInsert: true }
//         )

//         allLocationsData.push(locationData)
//         break
//       } catch (error) {
//         if (error.response && error.response.status === 526) {
//           console.error('Error 526 encountered for location. Retrying...')
//           await retryOn526Error()
//         } else {
//           console.error(`Error scraping location ${location.name}:`, error)
//           // notifyError(error)
//           break
//         }
//       }
//     }
//   }

//   return allLocationsData
// }

const puppeteer = require('puppeteer')

export const scrapeUNCC = async () => {
  // const browser = await puppeteer.launch({
  //   headless: false, // Set to false to visualize the process
  //   args: [
  //     '--no-sandbox',
  //     '--disable-setuid-sandbox',
  //     '--disable-blink-features=AutomationControlled', // Helps prevent detection
  //   ],
  // })

  // const page = await browser.newPage()

  // // Mimic real browser headers and behavior
  // await page.setUserAgent(
  //   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
  // )

  // await page.setExtraHTTPHeaders({
  //   'Accept-Language': 'en-US,en;q=0.9',
  // })

  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  await page.setUserAgent(getRandomUserAgent())
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://dineoncampus.com/',
  })

  await page.goto(
    `https://api.dineoncampus.com/v1/location/58714ea33191a200db4e6cea/periods?platform=0&date=2025-3-6`,
    {
      waitUntil: 'networkidle2',
    }
  )

  const body = await page.evaluate(() => document.body.innerText)
  const response = JSON.parse(body) // Parse it into an object

  // for(var i in response.menu.periods.categories){}
  response.menu.periods.categories.forEach((category) => {
    category.items.forEach((item) => {
      console.log(item.name)
    })
  })
  // const updatedMeal = [
  //   { name: item.name, type: periodData.menu.periods.name },
  //   {
  //     $set: {
  //       ingredients: item.ingredients ? item.ingredients.split(',').map((i) => i.trim()) : [],
  //       allergens: item.filters.filter((f) => f.type === 'allergen').map((f) => f.name),
  //       dieteryPreferences: item.filters.filter((f) => f.type === 'label').map((f) => f.name),
  //       nutrients: {
  //         calories: item.nutrients.find((f) => f.name === 'Calories')?.value_numeric || 0,
  //         protein: item.nutrients.find((f) => f.name === 'Protein (g)')?.value_numeric || 0,
  //         fat: item.nutrients.find((f) => f.name === 'Total Fat (g)')?.value_numeric || 0,
  //         carbohydrate: item.nutrients.find((f) => f.name === 'Total Carbohydrates (g)')?.value_numeric || 0,
  //       },
  //       serving: item.portion || '',
  //     },
  //   },
  //   { new: true, upsert: true, setDefaultsOnInsert: true },
  // ]
  await browser.close()
  // await page.goto(
  //   'https://api.dineoncampus.com/v1/location/58714d363191a200db4e6cda/periods?platform=0&date=2025-3-6',
  //   {
  //     waitUntil: 'networkidle2',
  //     timeout: 60000,
  //   }
  // )

  // Extract content after potential Cloudflare challenges
  // await page.waitForTimeout(5000) // Wait in case Cloudflare has JavaScript challenges

  // const content = await page.evaluate(() => document.body.innerHTML)
  // console.log(content)

  // await browser.close()
}
