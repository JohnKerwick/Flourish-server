import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import routes from './routes'
import { errorHandler, decodeRoleTokenMiddleware } from './middlewares'
import { connectMongoDB } from './config/dbConnection'
import { corsConfig } from './config/cors'
import session from 'express-session'
import configSwagger from './config/swagger'

import { createServer } from 'node:http'
import { init } from './socket'
import { endMealCron, mealTimeCron } from './utils'
import { initializeFirebase } from './utils/firebase'
import dotenv from 'dotenv'

// import { setupSocketEventHandlers } from './socketEvents'
// For Socket.io
// global.serverRoot = path.resolve(__dirname)
// setupSocketEventHandlers()

const app = express()
dotenv.config()

// For Socket.io
const server = createServer(app)
init(server)
// Setup Socket.IO event handlers
initializeFirebase()
const PORT = process.env.PORT || 3000
const PUBLIC_PATH = path.join(__dirname, 'public')
connectMongoDB()

app.use(express.static(PUBLIC_PATH))
app.use(logger('dev'))
app.use(cookieParser())
app.use(cors(corsConfig))
app.use(express.json({ limit: '50mb', extended: true }))
app.use(decodeRoleTokenMiddleware)
app.use(
  session({
    secret: process.env.SESSION_SECRET, // session secret
    resave: false,
    saveUninitialized: false,
  })
)
app.use('/api-docs', configSwagger)
app.use('/api', routes)
app.use(errorHandler)

app.get('/ping', (req, res) => res.send('Ping Successfulls 😄'))

server.listen(PORT, async () => {
  endMealCron.start()
  mealTimeCron.start()
  console.log(`[⚡️ server]: Server running on port ${PORT} | Environment: ${process.env.NODE_ENV}`)
})

// app.get('/restaurants', async (req, res) => {
//   try {
//     // Call the Nutritionix API
//     const options = {
//       method: 'GET',
//       url: 'https://trackapi.nutritionix.com/v2/search/instant/',
//       params: { query: 'subway' },
//       headers: {
//         'Content-Type': 'application/json',
//         'x-app-id': '35363ffd', // Your app ID here
//         'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
//       },
//     }

//     // Fetch data from the Nutritionix API
//     const response = await axios(options)

//     // Send the response as JSON
//     res.json(response.data) // This will return the data in JSON format
//   } catch (error) {
//     console.error('Error fetching data from Nutritionix API:', error)
//     res.status(500).json({ error: 'Failed to fetch data from Nutritionix API' })
//   }
// })

// app.get('/restaurants/:', async (req, res) => {
//   try {
//     // Call the Nutritionix API
//     const options = {
//       method: 'GET',
//       url: 'https://trackapi.nutritionix.com/v2/search/instant/',
//       params: { query: 'subway' },
//       headers: {
//         'Content-Type': 'application/json',
//         'x-app-id': '35363ffd', // Your app ID here
//         'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
//       },
//     }

//     // Fetch data from the Nutritionix API
//     const response = await axios(options)

//     // Send the response as JSON
//     res.json(response.data) // This will return the data in JSON format
//   } catch (error) {
//     console.error('Error fetching data from Nutritionix API:', error)
//     res.status(500).json({ error: 'Failed to fetch data from Nutritionix API' })
//   }
// })

// app.get('/item/:itemId', async (req, res) => {
//   const itemId = req.params.itemId // Extract the nix_item_id from the URL

//   try {
//     // Send GET request to Nutritionix API for the item details
//     const response = await axios.get(`https://trackapi.nutritionix.com/v2/search/item/`, {
//       params: {
//         nix_item_id: itemId, // Use the dynamic item ID in the query
//       },
//       headers: {
//         'Content-Type': 'application/json',
//         'x-app-id': '35363ffd', // Your app ID here
//         'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
//       },
//     })

//     // Send the response from Nutritionix API as JSON
//     res.json(response.data) // Return the Nutritionix API response as JSON
//   } catch (error) {
//     // Handle errors (e.g., network issues, API errors)
//     console.error('Error:', error)
//     res.status(500).json({ error: 'Failed to fetch data from Nutritionix API' })
//   }
// })

// // Route to handle fetching and saving the data at /get-data
// app.get('/get-data', async (req, res) => {
//   try {
//     const brands = [
//       'Subway',
//       'Barberitos',
//       'Chick-Fil-A',
//       'Starbucks',
//       'Jamba Juice',
//       'Taco Bell',
//       'Chick-Fil-A',
//       'Qdoba',
//       'Panera Bread',
//       'SaladWorks',
//       'Panda Express',
//       'Bojangles',
//       'Auntie Annes',
//     ]

//     // Step 1: Get data from the first API (search/instant)
//     for (let brand of brands) {
//       // Step 1: Get data from the first API (search/instant) for the current brand
//       const response1 = await axios.get('https://trackapi.nutritionix.com/v2/search/instant/', {
//         params: { query: brand },
//         headers: {
//           'Content-Type': 'application/json',
//           'x-app-id': '35363ffd', // Your app ID here
//           'x-app-key': '8eefc543e6aad468d802ec77048d74c1', // Your app key here
//           'x-remote-user-id': 0,
//         },
//       })

//       // Filter the response to include only items from "Subway"
//       const brandedItems = response1.data.branded.filter((item) => item.brand_name === brand)

//       // Initialize an array to hold the final processed data
//       const processedData = []

//       // Step 2: Loop through each item and fetch detailed information from API 2 (search/item)
//       for (let item of brandedItems) {
//         const itemId = item.nix_item_id

//         // Fetch the detailed item data
//         const response2 = await axios.get('https://trackapi.nutritionix.com/v2/search/item/', {
//           params: {
//             nix_item_id: itemId, // Use the dynamic item ID in the query
//           },
//           headers: {
//             'Content-Type': 'application/json',
//             'x-app-id': '35363ffd', // Your app ID here
//             'x-app-key': '56633048ecdeb2b2c6678242decf3012', // Your app key here
//             'x-remote-user-id': 0,
//           },
//         })

//         // Extract the relevant data (calories, protein, fat, carbs, and serving)
//         const itemData = {
//           restaurant: brand,
//           menu: {
//             mealName: response2.data.foods[0].food_name,
//             calories: response2.data.foods[0].nf_calories,
//             protein: response2.data.foods[0].nf_protein,
//             fat: response2.data.foods[0].nf_total_fat,
//             carbohydrate: response2.data.foods[0].nf_total_carbohydrate,
//             serving_unit: response2.data.foods[0].serving_unit,
//             serving_qty: response2.data.foods[0].serving_qty,
//           },
//         }

//         // Push the item data into the final array
//         processedData.push(itemData)
//       }
//     }
//     // Step 3: Save the processed data into 'test.json'
//     fs.writeFileSync('test21.json', JSON.stringify(processedData, null, 2))

//     // Send a success response
//     res.status(200).json({ message: 'Data fetched and saved to test.json successfully!' })
//   } catch (error) {
//     console.error('Error fetching or processing data:', error)
//     res.status(500).json({ message: 'An error occurred while fetching data.' })
//   }
// })
