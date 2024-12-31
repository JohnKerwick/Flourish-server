import { Schema, model } from 'mongoose'

export const totpSchema = new Schema(
  {
    token: String,
    email: String,
  },
  { versionKey: false, timestamps: true }
)

export const TOTP = model('TOTP', totpSchema)
