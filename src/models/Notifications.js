import mongoose, { Schema, model } from 'mongoose'
export const notificationsSchema = new Schema(
  {
    title: String,
    body: String,
    payload: {
      dietId: String,
    },
    type: String,
    userId: Schema.Types.ObjectId,
  },
  { versionKey: false, timestamps: true }
)

// notifications.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

export const Notification = model('Notification ', notificationsSchema)
