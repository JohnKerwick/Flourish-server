var mongoose = require('mongoose')
var Schema = mongoose.Schema

import { model } from 'mongoose'

var restaurantSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  campus: [],
  category: {
    type: String,
    required: true,
  },
  tabItems: [
    {
      type: String,
    },
  ],
  likedBy: [
    {
      type: Array,
    },
  ],
  menu: [
    {
      category: {
        type: String,
      },
      items: [
        {
          type: Schema.Types.ObjectId,
        },
      ],
    },
  ],
})

export const Restaurants = model('Restaurant', restaurantSchema)
