var mongoose = require('mongoose')
var Schema = mongoose.Schema

import { model } from 'mongoose'

var dietSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  dietplan: [
    {
      day: {
        type: String,
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
      item: [
        {
          mealType: {
            type: String,
          },
          meal: [
            {
              location: {
                type: String,
              },
              meal: {
                type: Schema.Types.ObjectId,
                required: true,
              },
            },
          ],
          status: {
            type: String,
          },
        },
      ],
    },
  ],
  dietOwner: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date, // This will store the expiration date
  },
})
dietSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(this.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // Add 7 days
  }
  next()
})
export const Diet = model('Diet', dietSchema)
