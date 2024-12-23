import { StatusCodes } from 'http-status-codes'
const axios = require('axios')
import dotenv from 'dotenv'
import { calculateBMR } from '../services'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

dotenv.config()

import { User, Restaurants, Diet } from '../models'

import { asyncMiddleware } from '../middlewares'

export const CONTROLLER_DIET = {
  getWeeklyDietPlan: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    const user = await User.findByIdAndUpdate(userId, { lastActive: new Date() })
      .select(
        '-password -userTypes -name -email -file -role -eatOptions -appGoal -exerciseTypes -phone -refreshTokens -createdAt -updatedAt -exercise'
      )
      .lean()

    const campus = user.student.school
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    const { allergy, allergyTypes } = user

    const allMenuItems = await Restaurants.aggregate([
      { $match: { campus } },

      { $unwind: '$menu' },
      { $unwind: '$menu.items' },

      {
        $lookup: {
          from: 'meals',
          localField: 'menu.items',
          foreignField: '_id',
          as: 'mealDetails',
        },
      },
      { $unwind: '$mealDetails' },
      { $match: { 'mealDetails.nutrients.calories': { $gt: 0 } } },
      ...(allergy
        ? [
            {
              $match: {
                'mealDetails.allergens': { $nin: allergyTypes },
              },
            },
          ]
        : []),
      {
        $project: {
          mealName: '$mealDetails.name',
          mealType: '$mealDetails.type',
          ingredients: '$mealDetails.ingredients',
          allergens: '$mealDetails.allergens',
          dietaryPreferences: '$mealDetails.dietaryPreferences',
          serving: '$mealDetails.serving',
          calories: '$mealDetails.nutrients.calories',
          protein: '$mealDetails.nutrients.protein',
          fat: '$mealDetails.nutrients.fat',
          carbohydrate: '$mealDetails.nutrients.carbohydrate',
          restaurantName: '$name',
          restaurantId: '$_id',
          mealId: '$mealDetails._id',
        },
      },

      { $sort: { 'mealDetails.nutrients.calories': -1 } },
    ])

    const mealItemsByType = {
      breakfast: allMenuItems.filter((item) => item.mealType === 'Breakfast'),
      lunch: allMenuItems.filter((item) => item.mealType === 'Lunch'),
      dinner: allMenuItems.filter((item) => item.mealType === 'Dinner'),
    }

    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }

    const totalCalories = calculateBMR(user)
    const calorieDistribution = {
      breakfast: Math.round(totalCalories * 0.3),
      lunch: Math.round(totalCalories * 0.4),
      dinner: Math.round(totalCalories * 0.3),
    }

    const weeklyPlan = []
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const usedMeals = new Set()

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayPlan = { day: daysOfWeek[dayIndex] }
      let totalProvidedCalories = 0
      let totalProtein = 0
      let totalFat = 0
      let totalCarbs = 0

      for (const mealType of ['breakfast', 'lunch', 'dinner']) {
        const availableMeals = sortedMealItemsByType[mealType].filter((meal) => !usedMeals.has(meal.mealName))

        if (availableMeals.length === 0) {
          dayPlan[mealType] = []
          continue
        }

        const dailyMeals = []
        let caloriesRemaining = calorieDistribution[mealType]

        while (availableMeals.length > 0 && caloriesRemaining > 0) {
          const meal = availableMeals.shift()

          if (meal.calories <= caloriesRemaining) {
            dailyMeals.push(meal)
            usedMeals.add(meal.mealName)
            caloriesRemaining -= meal.calories
            totalProvidedCalories += meal.calories
            totalProtein += meal.protein
            totalFat += meal.fat
            totalCarbs += meal.carbohydrate
          }
        }

        dayPlan[mealType] = dailyMeals
      }

      const calorieShortfall = totalCalories - totalProvidedCalories
      if (calorieShortfall > 0) {
        const adjustment = Math.ceil(calorieShortfall / 3)
        for (const mealType of ['breakfast', 'lunch', 'dinner']) {
          if (dayPlan[mealType].length > 0) {
            dayPlan[mealType][0].calories += adjustment
            totalProvidedCalories += adjustment

            if (totalProvidedCalories >= totalCalories) break
          }
        }
      }

      dayPlan.caloriesBMR = Math.trunc(totalCalories)
      dayPlan.caloriesProvided = Math.trunc(totalProvidedCalories)
      dayPlan.proteinProvided = Math.trunc(totalProtein)
      dayPlan.fatProvided = Math.trunc(totalFat)
      dayPlan.carbsProvided = Math.trunc(totalCarbs)

      weeklyPlan.push(dayPlan)
    }

    return res.status(StatusCodes.OK).json({
      message: 'Weekly diet plan generated successfully.',
      weeklyPlan,
      statusCode: 200,
    })
  }),

  createWeeklyDietPlan: asyncMiddleware(async (req, res) => {
    const dietPlanData = req.body
    let currentDate = new Date()
    dietPlanData.dietplan.forEach((dayPlan) => {
      dayPlan.date = new Date(currentDate)
      currentDate.setDate(currentDate.getDate() + 1)
    })
    const newDietPlan = await new Diet({ ...dietPlanData }).save()
    return res.status(StatusCodes.OK).json({
      message: 'Diet plan created successfully.',
      statusCode: StatusCodes.OK,
      dietPlan: newDietPlan,
    })
  }),

  getWeeklydietPlanDetails: asyncMiddleware(async (req, res) => {
    const dietId = req.query.id
    const dietPlanDetails = await Diet.findById(dietId)
      .populate({
        path: 'dietplan.item.meal.meal',
        model: 'Meal',
      })
      .lean()

    return res.status(StatusCodes.OK).json({
      dietPlanDetails,
      message: 'Diet plan details fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  getDietHistory: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id

    const date = Date.now()
    const dietPlans = await Diet.find({
      dietOwner: userId,
      expiresAt: { $lt: date },
    })
      .select('name _id')
      .lean()

    return res.status(StatusCodes.OK).json({
      dietPlans,
      message: 'Diet History fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),
}
