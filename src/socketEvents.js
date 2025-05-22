import { getIO } from './socket.js'

export const setupSocketEventHandlers = () => {
  const io = getIO()

  io.on('connection', (socket) => {
    console.log('A user connected')

    // Handling "joinAuction" event
    socket.on('weekly_plan', (weeklyPlan) => {
      console.log(`User `)
      socket.join(weeklyPlan)
    })

    // Add more event handlers here
  })
}
