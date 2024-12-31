import mongoose from 'mongoose'
mongoose.set('strictQuery', true)

export const mongodbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // connectTimeoutMS: 20000,
  serverSelectionTimeoutMS: 5000,
  autoIndex: true,
  maxPoolSize: 1000,
}

export const seedData = async () => {
  console.log('[🌱 seeding]')

  // await insertRestaurants(restaurants)

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
    try {
    } catch (error) {
      console.error('[🌱 seeding] Error', error)
    }
  })
}
