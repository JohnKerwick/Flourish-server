import { model } from 'mongoose'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var mealSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
  },
  ingredients: {
    type: Array,
  },
  allergens: {
    type: Array,
  },
  dieteryPreferences: {
    type: Array,
  },
  serving: {
    type: String,
  },
  nutrients: {
    calories: {
      type: Number,
    },
    protein: {
      type: Number,
    },
    carbohydrate: {
      type: Number,
    },
    fat: {
      type: Number,
    },
  },
  likedBy: [
    {
      type: Schema.Types.ObjectId,
    },
  ],
  isAvailable: {
    type: Boolean,
  },
})

export const Meals = model('Meal', mealSchema)
