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
const axios = require('axios')
const fs = require('fs')
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

import { Meals, Restaurants } from './models'

app.get('/get-data', async (req, res) => {
  try {
    const brands = [
      { name: 'Subway', id: '513fbc1283aa2dc80c000005', campus: ['HPU', 'UMD'] },
      { name: 'Barberitos', id: '521b95434a56d006cae297f3', campus: ['HPU'] },
      { name: 'Jamba', id: '513fbc1283aa2dc80c000040', campus: ['HPU'] },
      { name: 'Chick-Fil-A', id: '513fbc1283aa2dc80c000025', campus: ['HPU', 'UMD', 'UNCC'] },
      { name: 'Starbucks', id: '513fbc1283aa2dc80c00001f', campus: ['HPU', 'UNCC'] },
      { name: 'Taco Bell', id: '513fbc1283aa2dc80c000020', campus: ['UMD'] },
      { name: 'Panera Bread', id: '513fbc1283aa2dc80c00000c', campus: ['UMD'] },
      { name: 'SaladWorks', id: '521b95444a56d006cae29993', campus: ['UMD'] },
      { name: 'Panda Express', id: '513fbc1283aa2dc80c00002e', campus: ['UMD'] },
      { name: 'Qdoba', id: '513fbc1283aa2dc80c00003a', campus: ['UMD'] },
      { name: "Auntie Anne's", id: '513fbc1283aa2dc80c00013e', campus: ['UNCC'] },
      { name: 'Bojangles', id: '513fbc1283aa2dc80c0002eb', campus: ['UNCC'] },
    ]

    for (let brand of brands) {
      console.log(`Processing brand: ${brand.name}, ID: ${brand.id}`)
      try {
        const response1 = await axios.get(`https://www.nutritionix.com/nixapi/brands/${brand.id}/items/1?limit=3900`, {
          headers: { 'Content-Type': 'application/json' },
        })

        const brandedItems = response1.data.items

        for (let item of brandedItems) {
          try {
            const response2 = await axios.get('https://trackapi.nutritionix.com/v2/search/item/', {
              params: { nix_item_id: item.item_id },
              headers: {
                'Content-Type': 'application/json',
                'x-app-id': '35363ffd',
                'x-app-key': '56633048ecdeb2b2c6678242decf3012',
              },
            })
            console.log(response2.data.foods[0].food_name)
            const menuData = {
              mealName: response2.data.foods[0].food_name,
              calories: response2.data.foods[0].nf_calories,
              protein: response2.data.foods[0].nf_protein,
              fat: response2.data.foods[0].nf_total_fat,
              carbohydrate: response2.data.foods[0].nf_total_carbohydrate,
              serving: `${response2.data.foods[0].serving_qty} ${response2.data.foods[0].serving_unit}`,
            }

            // Check if the meal already exists
            const existingMeal = await Meals.findOne({ name: menuData.mealName })

            let meal
            if (existingMeal) {
              // Update the existing meal
              meal = await Meals.findOneAndUpdate(
                { name: menuData.mealName },
                {
                  $set: {
                    'nutrients.calories': menuData.calories,
                    'nutrients.protein': menuData.protein,
                    'nutrients.fat': menuData.fat,
                    'nutrients.carbohydrate': menuData.carbohydrate,
                    serving: menuData.serving,
                  },
                },
                { new: true }
              )
              console.log(`Updated meal: ${menuData.mealName}`)
            } else {
              // Insert a new meal
              meal = new Meals({
                name: menuData.mealName,
                nutrients: {
                  calories: menuData.calories,
                  protein: menuData.protein,
                  fat: menuData.fat,
                  carbohydrate: menuData.carbohydrate,
                },
                serving: menuData.serving,
                isAvailable: true,
              })
              await meal.save()
              console.log(`Inserted new meal: ${menuData.mealName}`)
            }

            // Link the meal to the restaurant
            await Restaurants.findOneAndUpdate(
              { name: brand.name },
              {
                $set: {
                  campus: 'UMD',
                  category: 'Franchises',
                },
                $addToSet: {
                  'menu.items': meal._id, // Use $addToSet to avoid duplicates
                },
              },
              { new: true, upsert: true }
            )

            console.log(`Linked meal "${menuData.mealName}" to restaurant "${brand.name}"`)
          } catch (itemError) {
            console.error(`Error processing item for brand "${brand.name}":`, itemError)
          }
        }
      } catch (brandError) {
        console.error(`Error fetching brand data for "${brand.name}":`, brandError)
      }
    }

    res.status(200).json({ message: 'Data fetched and uploaded to MongoDB successfully!' })
  } catch (error) {
    console.error('Error during data fetching:', error)
    res.status(500).json({ message: 'An error occurred while fetching data.' })
  }
})
