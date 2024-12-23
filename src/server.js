import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import routes from './routes'
import { errorHandler, decodeRoleTokenMiddleware } from './middlewares'
import { connectMongoDB } from './config/dbConnection'
import { corsConfig } from './config/cors'
import passport from 'passport'
import session from 'express-session'
// import passport.js
import './utils/passport.js'
// import sse from './config/sse'
import { CONTROLLER_PAYMENT } from './controllers'
import fs from 'fs'
// import secretsManager from './config/secretsManager'
import dotenv from 'dotenv'
import configSwagger from './config/swagger'

import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { init } from './socket'
import { setupSocketEventHandlers } from './socketEvents'
import { task } from './utils/cron'
import { challengeTask } from './utils/challenge-cron'
import { initializeFirebase } from './utils/firebase'
import { preferences } from 'joi'
const axios = require('axios')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')
const https = require('https')

// For Socket.io
global.serverRoot = path.resolve(__dirname)

const app = express()

// For Socket.io
const server = createServer(app)
init(server)
// Setup Socket.IO event handlers
setupSocketEventHandlers()
initializeFirebase()
const PORT = process.env.PORT || 3000
const PUBLIC_PATH = path.join(__dirname, 'public')
connectMongoDB()

app.use(express.static(PUBLIC_PATH))
app.use(logger('dev'))
app.use(cookieParser())
app.use(cors(corsConfig))
app.post(
  '/api/payment/stripe/webhook',
  express.raw({ type: 'application/json' }),
  CONTROLLER_PAYMENT.stripeWebhookSecure
)
app.use(express.json({ limit: '50mb', extended: true }))
app.use(decodeRoleTokenMiddleware)
app.use(
  session({
    secret: process.env.SESSION_SECRET, // session secret
    resave: false,
    saveUninitialized: false,
  })
)
// initialize passport and session
app.use(passport.initialize())
app.use(passport.session())

app.use('/api-docs', configSwagger)
app.use('/api', routes)
app.use(errorHandler)

app.get('/ping', (req, res) => res.send('Ping Successfulls 😄'))

server.listen(PORT, async () => {
  // app.listen(PORT, '0.0.0.0', '0', async () => {
  task.start()
  challengeTask.start()
  console.log(`[⚡️ server]: Server running on port ${PORT} | Environment: ${process.env.NODE_ENV}`)
})

app.get('/restaurants', async (req, res) => {
  try {
    // Call the Nutritionix API
    const options = {
      method: 'GET',
      url: 'https://trackapi.nutritionix.com/v2/search/instant/',
      params: { query: 'subway' },
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': '35363ffd', // Your app ID here
        'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
      },
    }

    // Fetch data from the Nutritionix API
    const response = await axios(options)

    // Send the response as JSON
    res.json(response.data) // This will return the data in JSON format
  } catch (error) {
    console.error('Error fetching data from Nutritionix API:', error)
    res.status(500).json({ error: 'Failed to fetch data from Nutritionix API' })
  }
})

app.get('/restaurants/:', async (req, res) => {
  try {
    // Call the Nutritionix API
    const options = {
      method: 'GET',
      url: 'https://trackapi.nutritionix.com/v2/search/instant/',
      params: { query: 'subway' },
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': '35363ffd', // Your app ID here
        'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
      },
    }

    // Fetch data from the Nutritionix API
    const response = await axios(options)

    // Send the response as JSON
    res.json(response.data) // This will return the data in JSON format
  } catch (error) {
    console.error('Error fetching data from Nutritionix API:', error)
    res.status(500).json({ error: 'Failed to fetch data from Nutritionix API' })
  }
})

app.get('/item/:itemId', async (req, res) => {
  const itemId = req.params.itemId // Extract the nix_item_id from the URL

  try {
    // Send GET request to Nutritionix API for the item details
    const response = await axios.get(`https://trackapi.nutritionix.com/v2/search/item/`, {
      params: {
        nix_item_id: itemId, // Use the dynamic item ID in the query
      },
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': '35363ffd', // Your app ID here
        'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
      },
    })

    // Send the response from Nutritionix API as JSON
    res.json(response.data) // Return the Nutritionix API response as JSON
  } catch (error) {
    // Handle errors (e.g., network issues, API errors)
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to fetch data from Nutritionix API' })
  }
})

// Route to handle fetching and saving the data at /get-data
app.get('/get-data', async (req, res) => {
  try {
    const brands = [
      'Subway',
      'Barberitos',
      'Chick-Fil-A',
      'Starbucks',
      'Jamba Juice',
      'Taco Bell',
      'Chick-Fil-A',
      'Qdoba',
      'Panera Bread',
      'SaladWorks',
      'Panda Express',
      'Bojangles',
      'Auntie Annes',
    ]

    // Step 1: Get data from the first API (search/instant)
    for (let brand of brands) {
      // Step 1: Get data from the first API (search/instant) for the current brand
      const response1 = await axios.get('https://trackapi.nutritionix.com/v2/search/instant/', {
        params: { query: brand },
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': '35363ffd', // Your app ID here
          'x-app-key': '8eefc543e6aad468d802ec77048d74c1', // Your app key here
          'x-remote-user-id': 0,
        },
      })

      // Filter the response to include only items from "Subway"
      const brandedItems = response1.data.branded.filter((item) => item.brand_name === brand)

      // Initialize an array to hold the final processed data
      const processedData = []

      // Step 2: Loop through each item and fetch detailed information from API 2 (search/item)
      for (let item of brandedItems) {
        const itemId = item.nix_item_id

        // Fetch the detailed item data
        const response2 = await axios.get('https://trackapi.nutritionix.com/v2/search/item/', {
          params: {
            nix_item_id: itemId, // Use the dynamic item ID in the query
          },
          headers: {
            'Content-Type': 'application/json',
            'x-app-id': '35363ffd', // Your app ID here
            'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
            'x-remote-user-id': 0,
          },
        })

        // Extract the relevant data (calories, protein, fat, carbs, and serving)
        const itemData = {
          restaurant: brand,
          menu: {
            mealName: response2.data.foods[0].food_name,
            calories: response2.data.foods[0].nf_calories,
            protein: response2.data.foods[0].nf_protein,
            fat: response2.data.foods[0].nf_total_fat,
            carbohydrate: response2.data.foods[0].nf_total_carbohydrate,
            serving_unit: response2.data.foods[0].serving_unit,
            serving_qty: response2.data.foods[0].serving_qty,
          },
        }

        // Push the item data into the final array
        processedData.push(itemData)
      }
    }
    // Step 3: Save the processed data into 'test.json'
    fs.writeFileSync('test21.json', JSON.stringify(processedData, null, 2))

    // Send a success response
    res.status(200).json({ message: 'Data fetched and saved to test.json successfully!' })
  } catch (error) {
    console.error('Error fetching or processing data:', error)
    res.status(500).json({ message: 'An error occurred while fetching data.' })
  }
})

// app.get('/get-hpu-menu', async (req, res) => {
//   const urls = [
//     'https://dining.highpoint.edu/locations/purple-pie/',
//     'https://dining.highpoint.edu/locations/the-cafe/',
//     'https://dining.highpoint.edu/locations/the-farmers-market/',
//     'https://dining.highpoint.edu/locations/great-day-bakery/',
//     'https://dining.highpoint.edu/locations/144/',
//     'https://dining.highpoint.edu/locations/butterfly-cafe/',
//     'https://dining.highpoint.edu/locations/point-sports-grille/',
//     'https://dining.highpoint.edu/locations/the-grille-at-the-village/',
//   ]
//   const allData = []
//   for (const url of urls) {
//     console.log(`Processing: ${url}`)
//     const data = await scrapeNutritionData(url)
//     if (data) {
//       allData.push(data)
//     }
//   }

//   // Save to a JSON file
//   fs.writeFileSync('menuData-hpu.json', JSON.stringify(allData, null, 2), 'utf-8')
//   console.log('Data saved to menuData.json')

//   res.json(allData) // Respond with the combined data
// })
// async function scrapeNutritionData(url) {
//   try {
//     const { data: html } = await axios.get(url)
//     const $ = cheerio.load(html)

//     // Extract restaurant name
//     const restaurantName = $('#location-header-content h1').text().trim()

//     // Static data
//     const campus = 'HPU'
//     const category = 'Dining Hall'

//     // Extract meal types
//     const mealTypes = []
//     $('.c-tabs-nav__link-inner').each((_, element) => {
//       const mealType = $(element).text().trim()
//       mealTypes.push(mealType)
//     })

//     // Extract menu items for each meal type
//     const menu = []
//     $('.c-tab').each((index, element) => {
//       const mealType = mealTypes[index] // Match meal type

//       $(element)
//         .find('[id^="recipe-nutrition-"]')
//         .each((_, subElement) => {
//           const rawData = $(subElement).text()
//           if (rawData) {
//             try {
//               const parsedData = JSON.parse(rawData)

//               const menuItem = {
//                 mealName: parsedData.name,
//                 mealType: mealType,
//                 calories: parsedData.facts.find((f) => f.label === 'Calories')?.value || 0,
//                 protein: parsedData.facts.find((f) => f.label === 'Protein')?.value || 0,
//                 fat: parsedData.facts.find((f) => f.label === 'Total Fat')?.value || 0,
//                 carbohydrate: parsedData.facts.find((f) => f.label === 'Total Carbohydrate')?.value || 0,
//                 servingUnit: parsedData.serving_size || '',
//                 allergens: parsedData.allergens_list || '',
//                 preferences: parsedData.preferences_list || [],
//                 ingredients: parsedData.ingredients_list || '',
//               }

//               menu.push(menuItem)
//             } catch (err) {
//               console.error('Error parsing JSON:', err)
//             }
//           }
//         })
//     })

//     return {
//       restaurant: restaurantName,
//       campus,
//       category,
//       menu,
//       tabItems: mealTypes,
//     }
//   } catch (error) {
//     console.error(`Error fetching or processing data from ${url}:`, error)
//     return null // Return null if there's an error for this URL
//   }
// }

// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// const randomDelay = () => Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000

// app.get('/get-umd-menu', async (req, res) => {
//   try {
//     const urls = ['51', '19', '16']
//     const allMenuData = []

//     for (const url of urls) {
//       console.log(`Scraping data for location ${url}...`)

//       // Delay before sending a request to the main page
//       await delay(randomDelay()) // 2-second delay (adjust as needed)

//       const mainPageResponse = await axios.get(`https://nutrition.umd.edu/?locationNum=${url}`, {
//         headers: { 'User-Agent': userAgent },
//       })
//       const $ = cheerio.load(mainPageResponse.data)

//       const selectedOption = $('#location-select-menu option').filter(function () {
//         return $(this).val() === `${url}`
//       })
//       const restaurantName = selectedOption.text().trim()
//       console.log('Selected Restaurant:', restaurantName)
//       const campus = 'UMD'
//       const category = 'Dining Hall'

//       const mealTypes = []
//       $('.nav-link').each((_, element) => {
//         mealTypes.push({
//           name: $(element).text().trim(),
//           isActive: $(element).hasClass('active'),
//         })
//       })
//       const menuItems = []
//       $('.tab-pane.fade').each((index, element) => {
//         const mealType = mealTypes[index] ? mealTypes[index].name : 'Unknown'
//         $(element)
//           .find('.menu-item-name')
//           .each((_, mealElement) => {
//             const mealName = $(mealElement).text().trim()
//             const detailsUrl = $(mealElement).attr('href')
//             menuItems.push({ mealName, detailsUrl, mealType })
//           })
//       })

//       const menu = await Promise.all(
//         menuItems.map(async (item) => {
//           // Delay before sending a request for each meal's details page
//           await delay(randomDelay()) // 1.5-second delay (adjust as needed)

//           const detailsResponse = await axios.get(`https://nutrition.umd.edu/${item.detailsUrl}`)
//           const detailsPage = cheerio.load(detailsResponse.data)
//           const servingSize = detailsPage('.nutfactsservsize').text().trim()
//           const calories = parseFloat(detailsPage('td:contains("Calories") p').last().text().trim()) || 0
//           const fat = parseFloat(detailsPage('span:contains("Total Fat")').next().text().trim()) || 0
//           const carbs = parseFloat(detailsPage('span:contains("Total Carbohydrate")').next().text().trim()) || 0
//           const protein = parseFloat(detailsPage('span:contains("Protein")').next().text().trim()) || 0
//           const ingredients = detailsPage('.labelingredientsvalue').text().trim()
//           const allergens = detailsPage('.labelallergensvalue').text().trim()
//           return {
//             mealName: item.mealName,
//             mealType: item.mealType,
//             servingSize,
//             calories,
//             fat,
//             carbs,
//             protein,
//             ingredients,
//             allergens,
//           }
//         })
//       )

//       allMenuData.push({
//         restaurant: restaurantName,
//         campus,
//         category,
//         menu,
//         tabItems: mealTypes.map((type) => type.name),
//       })
//     }

//     fs.writeFileSync('menuData-umd.json', JSON.stringify(allMenuData, null, 2), 'utf-8')
//     console.log('Data saved to menuData-umd.json')
//     res.json(allMenuData)
//   } catch (error) {
//     console.error('Error:', error)
//     res.status(500).send('Error scraping the menu')
//   }
// })

// app.get('/get-uncc-menu', async (req, res) => {
//   let config = {
//     method: 'get',
//     maxBodyLength: Infinity,
//     url: 'https://api.dineoncampus.com/v1/location/58711fef3191a200e44e67a1/periods?platform=0&date=2024-12-6',
//     headers: {},
//     httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Disable SSL verification
//   }

//   try {
//     const response = await axios.request(config)
//     const periods = response.data.periods

//     // Initialize allItems array outside the loop to collect data
//     const allItems = []
//     await delay(30000) // 2-second delay between requests

//     // Loop over periods to fetch details for each period
//     for (let i = 0; i < periods.length; i++) {
//       console.log(`Processing period: ${periods[i].id}`)

//       await delay(30000) // 2-second delay between requests

//       let periodConfig = {
//         method: 'get',
//         maxBodyLength: Infinity,
//         url: `https://api.dineoncampus.com/v1/location/58711fef3191a200e44e67a1/periods/${periods[i].id}?platform=0&date=2024-12-6`,
//         headers: {},
//         httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Disable SSL verification
//       }

//       try {
//         const periodResponse = await axios.request(periodConfig)
//         const categories = periodResponse.data.menu.periods.categories

//         // Process each category and item within that category
//         categories.forEach((category) => {
//           if (category.items && Array.isArray(category.items)) {
//             category.items.forEach((item) => {
//               // Extract relevant data for each item
//               const extractedItem = {
//                 mealName: item.name,
//                 ingredients: item.ingredients ? item.ingredients.split(',').map((ingredient) => ingredient.trim()) : [],
//                 allergens: item.filters
//                   .filter((filter) => filter.type === 'allergen') // Only include allergens
//                   .map((filter) => filter.name),
//                 calories: item.calories,
//                 carbohydrate: null,
//                 protein: null,
//                 fat: null,
//                 mealType: periodResponse.data.menu.periods.name,
//                 serving: item.portion,
//               }

//               // Find relevant nutrient values (Carbs, Protein, Fat)
//               item.nutrients.forEach((nutrient) => {
//                 switch (nutrient.name) {
//                   case 'Total Carbohydrates (g)':
//                     extractedItem.carbohydrate = nutrient.value
//                     break
//                   case 'Protein (g)':
//                     extractedItem.protein = nutrient.value
//                     break
//                   case 'Total Fat (g)':
//                     extractedItem.fat = nutrient.value
//                     break
//                 }
//               })

//               allItems.push(extractedItem) // Add item to allItems array
//             })
//           }
//         })
//       } catch (error) {
//         notifyError(error)
//         console.log(`Error fetching details for period ${periods[i].id}:`, error.message)
//       }

//       // Delay to prevent rate-limiting or getting banned (e.g., 2 seconds between calls)
//       await delay(30000) // 2-second delay between requests
//     }

//     // Prepare the data for saving
//     const itemsData = {
//       restaurant: 'Social 704',
//       campus: 'UNCC',
//       category: 'Dining Hall',
//       items: allItems,
//     }

//     // Save the items data to a JSON file
//     fs.writeFileSync('menuData-uncc.json', JSON.stringify(itemsData, null, 2), 'utf-8')
//     console.log('Menu items saved to menuData-uncc.json')

//     // Send the response with the scraped data
//     res.status(200).send('Success fetching data')
//   } catch (error) {
//     notifyError(error)
//     console.log('Error Fetching API:', error)
//     res.status(500).send('Error fetching data')
//   }
// })

export default server
