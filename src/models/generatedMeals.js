// models/generatedMeal.js
import mongoose from 'mongoose'

const generatedMealSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Optional name e.g. "Combo 1"
  mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner'], required: true },
  items: [
    {
      _id: false,
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
      name: String,
      calories: Number,
      restaurantName: String,
      restaurantType: String,
      ingredients: [String], // List of ingredients
      campus: [String], // List of campus
    },
  ],
  campus: [String], // List of campus
  totalCalories: Number,
  restaurantName: String,
  restaurantType: String,
})

export const GeneratedMeal = mongoose.model('GeneratedMeal', generatedMealSchema)
export const GeneratedMealNew = mongoose.model('GeneratedMealNew', generatedMealSchema)
