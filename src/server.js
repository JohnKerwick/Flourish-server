import express from 'express'
import path from 'path'
import http from 'http'
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
import { initializeFirebase } from './utils/firebase'
import dotenv from 'dotenv'
import { task } from './utils/scrapper_cron'
import { setupSocketEventHandlers } from './socketEvents'

import { init as initSocket } from './socket.js'
// For Socket.io
// global.serverRoot = path.resolve(__dirname)
// setupSocketEventHandlers()
import './utils/generate-meals_cron.js' // Import the cron job setup (GENERATE_MEAL_CRON)

const app = express()
const server = http.createServer(app)
dotenv.config()

const io = initSocket(server)
setupSocketEventHandlers(io)
// For Socket.io
// const server = createServer(app)
// init(server)
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
  // task.start()
  console.log(`[⚡️ server]: Server running on port ${PORT} | Environment: ${process.env.NODE_ENV}`)
})
