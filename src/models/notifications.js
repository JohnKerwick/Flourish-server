import mongoose, { Schema, model } from 'mongoose'
export const notificationsSchema = new Schema(
  {
    title: String,
    body: String,
    payload: {
      dietId: String,
      mealType: String,
      day: String,
    },
    type: String,
    userId: Schema.Types.ObjectId,
    isUpdated: Boolean,
  },
  { versionKey: false, timestamps: true }
)

export const Notification = model('Notification ', notificationsSchema)
