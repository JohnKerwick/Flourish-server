import mongoose from 'mongoose'
import { Meals, Restaurants } from '../models'
mongoose.set('strictQuery', true)

export const mongodbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // connectTimeoutMS: 20000,
  serverSelectionTimeoutMS: 5000,
  autoIndex: true,
  maxPoolSize: 1000,
}

// const updateMeals = async () => {
//   console.log('[🌱 updating-meals]')

//   const meals = await Meals.find({})

//   const franchiseRestaurants = new Set([
//     'Jamba',
//     'Bojangles',
//     "Auntie Anne's",
//     'Qdoba',
//     'Purple Pie',
//     'The Great Day Bakery',
//     'Butterfly Cafe',
//     'The Point Sports Grille',
//     'Subway',
//     'Barberitos',
//     'Jamba Juice',
//     'Chick-Fil-A',
//     'Starbucks',
//     'Taco Bell',
//     'Panda Express',
//     'SaladWorks',
//     'Panera Bread',
//   ])

//   for (const meal of meals) {
//     const type = franchiseRestaurants.has(meal.restaurantName)
//       ? 'Franchise'
//       : 'Dining-Halls'

//     await Meals.updateOne({ _id: meal._id }, { $set: { restaurantType: type } })
//   }

//   console.log('[✅ meals updated]')
// }

export const seedData = async () => {
  console.log('[🌱 seeding]')

  // await updateMeals()

  console.log('[🌱 seeded successfully]')
}

export const insertRestaurants = async (data) => {
  console.log('[🌱 seeding-restaurants]')
  // await Restaurant.insertMany(data)
  // console.log(data)
}

export const connectMongoDB = () => {
  mongoose.connect(
    process.env.MONGO_URI,
    mongodbOptions
    // , {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    // // server: { sslCA: certFileBuf }
    // }
  )
  const db = mongoose.connection

  db.on('error', console.error.bind(console, '[❌ database] Connection error'))
  db.once('open', async function () {
    console.log('[🔌 database] Connected')
    // await seedData()
    try {
    } catch (error) {
      console.error('[🌱 seeding] Error', error)
    }
  })
}
