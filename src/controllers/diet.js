import { StatusCodes } from 'http-status-codes'
import fs, { readFile } from 'fs/promises'
import {
  calculateBMR,
  getUserById,
  getAllMenuItems,
  createWeeklyDietPlanService,
  saveDietPlan,
  getDietDetails,
  getDietHistoryService,
  getFranchiseItems as getCafeteriaItems,
} from '../services'
import jwt from 'jsonwebtoken'
import { asyncMiddleware } from '../middlewares'
import { Diet, Meals, Notification } from '../models'
import { OpenAI } from 'openai'
import dotenv from 'dotenv'
import {
  caloriesInMeal,
  compressRecommendations,
  dietPlanModify,
  generateMealPlan,
  getMaxCaloriesPerMeal,
  promptSentence,
} from '../utils/misc'
import { cloneDeep, max } from 'lodash'
import { processMealRecommendations } from '../utils/chat-gpt'
import { exampleJson } from '../utils/prompt-json'
import { validateAiResponse, validateRestaurantUniformality } from '../utils/validate-ai-response'
import { getIO } from '../socket'
import { deepSeekRes } from '../utils/deepseek'
import { GeneratedMeal } from '../models/generatedMeals'

import { parseGeneratedMeals } from '../utils/generate-meals'
import { writeFile } from 'fs/promises'
import mealPlanGenerators from '../utils/mealPlanGenerator.js'
const { generate14MealPlan, generate7MealPlan, generate19MealPlan } = mealPlanGenerators

const categories = [
  'Main',
  'Side',
  'Dessert',
  'Drink',
  'Snack',
  'Condiment',
  'Fruit',
  'Vegetable',
  'Dairy',
  'Plant-Based',
  'Seafood',
  'Alcoholic Beverage',
]

const breakfastCategories = ['Main', 'Side', 'Drink', 'Dairy', 'Fruit', 'Vegetable']
const lunchCategories = ['Main', 'Dessert', 'Drink', 'Condiment', 'Plant-Based', 'Seafood', 'Side']
const dinnerCategories = ['Main', 'Seafood', 'Dessert', 'Drink', 'Snack', 'Condiment', 'Alcoholic Beverage']

dotenv.config()

export const CONTROLLER_DIET = {
  getWeeklyDietPlanOld: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await getUserById(userId)
    const goal = user.goal
    const campus = user.student.school
    // const allMenuItems = await getAllMenuItems(campus)
    const { dietPlan, selectedMeals } = req.body
    const totalCalories = calculateBMR(user)

    // Function to normalize meal types
    const normalizeMealType = (mealType) => {
      const normalized = mealType?.trim().toLowerCase()
      const mealVariants = {
        breakfast: ['breakfast', 'morning meal'],
        lunch: ['lunch', 'midday meal'],
        dinner: ['dinner', 'supper', 'evening meal'],
      }

      for (const [key, values] of Object.entries(mealVariants)) {
        if (values.includes(normalized)) return key
      }
      return 'unknown'
    }

    const normalizeRestaurantName = (name) => name?.trim().toLowerCase()
    const mealOptions = {
      breakfast: ['starbucks', 'jamba juice', 'village juice', 'taco bell'],
      lunch: ['barberitos', 'qdoba', 'saladworks', 'bojangles'],
      dinner: ['subway', 'chick-fil-a', 'panera bread', 'panda express'],
    }
    const isValidCalorieRange = (calories) => calories >= 50 && calories <= 9000
    const bestChipsNachosMeal = new Map()
    const filteredMenuItems = []
    const seenKeywords = new Set() // Track keywords like "chips" and "nachos"

    allMenuItems.forEach((item) => {
      const mealName = item.mealName.toLowerCase()
      const containsKeyword = ['chips', 'nachos', 'tortilla', 'smoothies', 'cookies', 'burrito', 'quesadillas'].find(
        (word) => mealName.includes(word)
      )

      if (containsKeyword) {
        if (!seenKeywords.has(containsKeyword)) {
          console.log('First occurrence added:', mealName) // ✅ Log only first time
          seenKeywords.add(containsKeyword)
          filteredMenuItems.push(item) // ✅ Add first occurrence only
        }
      } else {
        filteredMenuItems.push(item) // ✅ Always add non-chips/nachos meals
      }
    })

    filteredMenuItems.push(...bestChipsNachosMeal.values())

    // Organize meals by type
    const mealItemsByType = { breakfast: [], lunch: [], dinner: [] }
    filteredMenuItems.forEach((item) => {
      if (!item?.mealName || typeof item.mealName !== 'string') return

      const normalizedMealType = normalizeMealType(item.mealType)
      const normalizedRestaurant = normalizeRestaurantName(item.restaurantName)

      if (!isValidCalorieRange(item.calories)) return

      let finalMealType = normalizedMealType
      if (finalMealType === 'unknown') {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(normalizedRestaurant)) {
            finalMealType = mealType
            break
          }
        }
      }

      if (finalMealType !== 'unknown') {
        mealItemsByType[finalMealType].push(item)
      }
    })

    // Return error if no meals available for one or more types
    if (
      mealItemsByType.breakfast.length === 0 ||
      mealItemsByType.lunch.length === 0 ||
      mealItemsByType.dinner.length === 0
    ) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No menu items available for one or more meal types.',
        statusCode: StatusCodes.NOT_FOUND,
      })
    }

    // Sort meals by calories
    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }

    // Normalize and fix meal calories (if needed) before using them
    const normalizedBreakfast = normalizeMealCalories_Maintain(sortedMealItemsByType.breakfast, true)
    const normalizedLunch = normalizeMealCalories_Maintain(sortedMealItemsByType.lunch, true)
    const normalizedDinner = normalizeMealCalories_Maintain(sortedMealItemsByType.dinner, true)

    // Now we can use the normalized meals in the diet plan generation
    const weeklyPlan = createWeeklyDietPlanService(
      totalCalories,
      { breakfast: normalizedBreakfast, lunch: normalizedLunch, dinner: normalizedDinner },
      dietPlan,
      selectedMeals
    )

    return res.status(StatusCodes.OK).json({
      message: 'Weekly diet plan generated successfully.',
      weeklyPlan,
      statusCode: 200,
    })
  }),

  getWeeklyDietPlan: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await getUserById(userId)
    const campus = user.student.school
    // const selectedMeals = ['Lunch', 'Dinner']
    const selectedMeals = user.dietPlan.selectedMeals
    const dietPlan = user.dietPlan.swipes

    console.log('object', selectedMeals, dietPlan, campus)
    // const dietPlan = { diningHall: 3, franchise: 4 }
    const totalCalories = calculateBMR(user)
    console.log('totalCalories', totalCalories)

    const result = await Meals.aggregate([
      {
        // Match items that contain the provided campus and category is not "Uncategorized"
        // UMD HPU UNCC
        $match: {
          campus: { $in: [campus] },
          // restaurantName: { $ne: 'Starbucks' },
          category: { $ne: 'Uncategorized' },
          nutrients: { $exists: true },
        },
      },
      {
        // Group items by category
        $group: {
          _id: '$category', // Grouping by category
          items: { $push: '$$ROOT' }, // Pushing all matching items to the "items" array
        },
      },
      {
        // Optionally, sort the categories (ascending order in this case)
        $sort: { _id: 1 },
      },
    ])

    await fs.writeFile('request-db-data.json', JSON.stringify(result, null, 2), 'utf-8')

    const orignalData = await Meals.find({
      campus: { $in: [campus] },
      category: { $ne: 'Uncategorized' },
      nutrients: { $exists: true },
    }).lean()

    const categoriesMap = {
      Breakfast: breakfastCategories,
      Lunch: lunchCategories,
      Dinner: dinnerCategories,
    }
    const mealsPerWeek = dietPlan.franchise + dietPlan.diningHall
    const margin = 100

    const mealRecommendations = selectedMeals.map((mealType) => {
      const excludedCategories = categoriesMap[mealType] || []
      const maxCalories = getMaxCaloriesPerMeal(mealsPerWeek, mealType, totalCalories, margin)
      // console.log("maxCalories", maxCalories)

      let processedData = cloneDeep(result)
      // console.log('processedData', processedData);

      if ((campus === 'UNCC' || campus === 'HPU') && mealType === 'Breakfast') {
        if (selectedMeals.length === 1) {
          processedData = result.map((cat) =>
            cat.items.filter(
              (item) =>
                !item.name.toLowerCase().includes('grande') &&
                !item.name.toLowerCase().includes('tall') &&
                !item.name.toLowerCase().includes('short')
            )
          )
        } else if (selectedMeals.length === 2) {
          processedData = result.map((cat) => {
            return {
              ...cat,
              items: cat.items.filter(
                (item) =>
                  !item.name.toLowerCase().includes('venti') &&
                  !item.name.toLowerCase().includes('tall') &&
                  !item.name.toLowerCase().includes('short')
              ),
            }
          })
        } else {
          processedData = result.map((cat) => {
            return {
              ...cat,
              items: cat.items.filter(
                (item) =>
                  !item.name.toLowerCase().includes('grande') &&
                  !item.name.toLowerCase().includes('venti') &&
                  !item.name.toLowerCase().includes('short')
              ),
            }
          })
        }
      }
      const recommendations = processedData
        .filter((group) => excludedCategories.includes(group._id))
        .map((group) => {
          const filteredItems = group.items
            .filter(
              (item) =>
                item.type === mealType && item.nutrients.calories <= maxCalories && item.nutrients.calories > 100
            )
            .map((item) => ({
              _id: item._id,
              name: item.name,
              calories: item.nutrients.calories,
              restaurantName: item.restaurantName,
              restaurantType: item.restaurantType,
            }))

          return {
            _id: group._id,
            items: filteredItems,
          }
        })
        .filter((group) => group.items.length > 0)
      // remove empty groups

      // console.log('recommendations', recommendations);

      const groupedRecommendations = {
        'Dining-Halls': [],
        Franchise: [],
      }

      recommendations.forEach((category) => {
        category.items.forEach((item) => {
          const { restaurantType, ...rest } = item // remove restaurantType
          if (groupedRecommendations[restaurantType]) {
            groupedRecommendations[restaurantType].push(rest)
          }
        })
      })
      // console.log('groupedRecommendations', groupedRecommendations)
      const items = compressRecommendations(groupedRecommendations)
      return {
        maxCalories,
        mealType,
        items,
      }
    })

    const caloriesPerMeal = caloriesInMeal(selectedMeals, totalCalories)
    const sentence = promptSentence(caloriesPerMeal)
    const exampleJsonData = exampleJson(selectedMeals)

    await fs.writeFile('request-data.json', JSON.stringify(mealRecommendations, null, 2), 'utf-8')

    const promptOld = `
    Below is the categorized food item data for the selected meals:

${JSON.stringify(mealRecommendations, null, 2)}

You are instructed to use **only** the data provided above. Do **not** generate or assume any additional items. Follow the rules strictly.

Each item contains the following important fields:
- "_id": unique ID of the food item
- "restaurantName": name of the restaurant
- "restaurantType": either "franchise" or "diningHall"

### Task:
- Generate exactly **${mealsPerWeek} meals** distributed across **7 days** (no more than 7).
- Focus only on the following meal types: **${selectedMeals.join(', ')}**.
- Each day must stay within a total calorie limit of **${totalCalories}**.
- ${sentence}

### Strict Rules:
1. Each meal (e.g., Mean for Breakfast, Lunch or Dinner) must consist of items from the **same restaurant only**.
2. **Mixing restaurants in a single meal is not allowed**. If no valid combination exists from one restaurant, you can compromise on calories.
3. You **must not modify** any of the fields in the result data.
4. Try to not repeat the **same exact meal** across the 7 days.

### Output Format:
- Return your response in **valid JSON only**.
- Use **this exact structure** and key names:
${JSON.stringify(exampleJsonData, null, 2)}

⚠️ Do not include any explanation, notes, or text outside of the JSON.

Begin now.`

    const prompt = `
${JSON.stringify(mealRecommendations, null, 2)}

The above provided data are the food Items categorized in ${selectedMeals.join(' , ')}.
You are strictly ordered to use the provided data only, don't use any other data.
Generate total ${mealsPerWeek} realistic meals for 7 days(Not more then 7) only, for ${selectedMeals.join(
      ','
    )}, each divided into each day with a maximum calorie limit of ${totalCalories} each day.

    But you have a margin of ±${margin} calories. ${sentence} All ${mealsPerWeek} meals must come from the ${
      dietPlan.franchise
    } franchise and ${dietPlan.diningHall} dining halls. 

    Each individual meal items must be sourced from the same restaurant (compulsory requirement).

    In each meal we can not have an item from restaurant A and another item from restaurant B and also dont change the name of the meals.
give me only JSON in response with all the food item details (name, restaurant, calories etc) in each meal. 

Also, we can not change the calories and names of the food items please.
I am adding the sample output below:


${JSON.stringify(exampleJsonData, null, 2)}`.trim()

    const aiResponse = await processMealRecommendations(prompt)
    // const aiResponse = await deepSeekRes(prompt)
    // console.log('AIRESP', aiResponse)

    const cleanedResponse = aiResponse
      .replace(/^Here.*?requirements: \s*/i, '')
      .replace(/^```json\s*/i, '') // Remove the starting ```json
      .replace(/```$/, '') // Remove the trailing ```
      .replace(/\\n/g, '\n') // Replace escaped newlines
      .replace(/\\"/g, '"') // Replace escaped quotes
      .trim()
    const jsonArrayStart = cleanedResponse.indexOf('[')
    const jsonArrayEnd = cleanedResponse.lastIndexOf(']')
    const jsonOnly = cleanedResponse.slice(jsonArrayStart, jsonArrayEnd + 1)

    const newData = JSON.parse(jsonOnly)

    await fs.writeFile('response-data.json', JSON.stringify(newData, null, 2), 'utf-8')

    const readAiRes = await readFile('response-data.json', 'utf-8')
    const formatedAiRes = JSON.parse(readAiRes)

    const validateRes = validateAiResponse(formatedAiRes)

    const newDatas = []
    for (let i = 0; i < validateRes?.length; i++) {
      const obj = cloneDeep(validateRes[i])
      if (obj.breakfast) {
        const breakfast = obj.breakfast
          .map((item) => {
            // Calculate calories, fats, protein, and carbs
            const mealItem = orignalData.find((meal) => meal._id.toString() === item.id)
            // console.log('mealItem', mealItem)
            if (mealItem) {
              obj.caloriesBMR = totalCalories
              obj.caloriesProvided = (obj.caloriesProvided || 0) + mealItem?.nutrients?.calories
              obj.proteinProvided = (obj.proteinProvided || 0) + mealItem?.nutrients?.protein
              obj.fatProvided = (obj.fatProvided || 0) + mealItem?.nutrients?.fat
              obj.carbsProvided = (obj.carbsProvided || 0) + mealItem?.nutrients?.carbohydrate
              return mealItem
            }
          })
          .filter((item) => item != null)
        obj.breakfast = breakfast
      }
      if (obj.lunch) {
        const lunch = obj.lunch
          .map((item) => {
            // Calculate calories, fats, protein, and carbs
            const mealItem = orignalData.find((meal) => meal._id.toString() === item.id)
            if (mealItem) {
              obj.caloriesBMR = totalCalories
              obj.caloriesProvided = (obj.caloriesProvided || 0) + mealItem?.nutrients?.calories
              obj.proteinProvided = (obj.proteinProvided || 0) + mealItem?.nutrients?.protein
              obj.fatProvided = (obj.fatProvided || 0) + mealItem?.nutrients?.fat
              obj.carbsProvided = (obj.carbsProvided || 0) + mealItem?.nutrients?.carbohydrate
              return mealItem
            }
          })
          .filter((item) => item != null)
        obj.lunch = lunch
      }
      if (obj.dinner) {
        const dinner = obj.dinner
          .map((item) => {
            // Calculate calories, fats, protein, and carbs
            const mealItem = orignalData.find((meal) => meal._id.toString() === item.id)
            if (mealItem) {
              obj.caloriesBMR = totalCalories
              obj.caloriesProvided = (obj.caloriesProvided || 0) + mealItem?.nutrients?.calories
              obj.proteinProvided = (obj.proteinProvided || 0) + mealItem?.nutrients?.protein
              obj.fatProvided = (obj.fatProvided || 0) + mealItem?.nutrients?.fat
              obj.carbsProvided = (obj.carbsProvided || 0) + mealItem?.nutrients?.carbohydrate
              return mealItem
            }
          })
          .filter((item) => item != null)
        obj.dinner = dinner
      }
      newDatas.push(obj)
    }

    const finData = validateRestaurantUniformality(newDatas)

    const io = getIO()
    io.to(userId).emit('weekly_plan', { message: 'Meals updated successfully.', weeklyPlan: finData })

    // After mealPlan is generated
    // Map day numbers to names
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    const transformedPlan = Object.values(finData).map((dayMeals, index) => {
      const dayName = dayNames[index]

      let dayCalories = 0
      let dayProtein = 0
      let dayFat = 0
      let dayCarbs = 0
      let breakfastItems = []
      let lunchItems = []
      let dinnerItems = []

      // Handle all plan types (7, 14, 21)
      if (dayMeals.breakfast) breakfastItems = transformMealItems(dayMeals.breakfast.items)
      if (dayMeals.lunch) lunchItems = transformMealItems(dayMeals.lunch.items)
      if (dayMeals.dinner) dinnerItems = transformMealItems(dayMeals.dinner.items)

      // For 7-meal plan
      if (dayMeals.meal) {
        if (dayMeals.meal.mealType === 'Breakfast') breakfastItems = transformMealItems(dayMeals.meal.items)
        if (dayMeals.meal.mealType === 'Lunch') lunchItems = transformMealItems(dayMeals.meal.items)
        if (dayMeals.meal.mealType === 'Dinner') dinnerItems = transformMealItems(dayMeals.meal.items)
      }
      // For 14-meal plan
      if (dayMeals.mealTypeA) {
        if (dayMeals.mealTypeA.mealType === 'Breakfast') breakfastItems = transformMealItems(dayMeals.mealTypeA.items)
        if (dayMeals.mealTypeA.mealType === 'Lunch') lunchItems = transformMealItems(dayMeals.mealTypeA.items)
        if (dayMeals.mealTypeA.mealType === 'Dinner') dinnerItems = transformMealItems(dayMeals.mealTypeA.items)
      }
      if (dayMeals.mealTypeB) {
        if (dayMeals.mealTypeB.mealType === 'Breakfast') breakfastItems = transformMealItems(dayMeals.mealTypeB.items)
        if (dayMeals.mealTypeB.mealType === 'Lunch') lunchItems = transformMealItems(dayMeals.mealTypeB.items)
        if (dayMeals.mealTypeB.mealType === 'Dinner') dinnerItems = transformMealItems(dayMeals.mealTypeB.items)
      }

      // Calculate nutritional totals from all meals for the day
      const allDayItems = [
        ...(dayMeals.breakfast?.items || []),
        ...(dayMeals.lunch?.items || []),
        ...(dayMeals.dinner?.items || []),
        ...(dayMeals.meal?.items || []),
        ...(dayMeals.mealTypeA?.items || []),
        ...(dayMeals.mealTypeB?.items || []),
      ]

      allDayItems.forEach((item) => {
        dayCalories += item.calories || 0
        if (item.itemId && item.itemId.nutrients) {
          dayProtein += item.itemId.nutrients.protein || 0
          dayFat += item.itemId.nutrients.fat || 0
          dayCarbs += item.itemId.nutrients.carbohydrate || 0
        }
      })

      return {
        day: dayName,
        breakfast: breakfastItems,
        lunch: lunchItems,
        dinner: dinnerItems,
        caloriesBMR: targetCaloriesPerDay,
        caloriesProvided: dayCalories,
        proteinProvided: dayProtein,
        fatProvided: dayFat,
        carbsProvided: dayCarbs,
      }
    })

    res.status(200).json(transformedPlan)
  }),
  //   generateMeals: asyncMiddleware(async (req, resOrParams) => {
  //     const isCron = !('status' in resOrParams)
  //     const input = isCron ? req : req.body
  //     const res = isCron ? { status: () => ({ json: () => {} }) } : resOrParams

  //     try {
  //       const { calorieRange = { min: 300, max: 600 }, types = ['Breakfast', 'Lunch', 'Dinner'], campus } = input

  //       const query = {
  //         'nutrients.calories': { $gt: 0 },
  //         type: { $in: types },
  //       }

  //       const defaultCampuses = ['HPU', 'UMD', 'UNCC']
  //       const campusList = campus?.length ? campus : defaultCampuses
  //       console.log('campusList', campusList)
  //       query.campus = { $in: campusList }

  //       // Step 1: Fetch meals from DB
  //       const projection = {
  //         name: 1,
  //         type: 1,
  //         'nutrients.calories': 1,
  //         restaurantName: 1,
  //         restaurantType: 1,
  //         ingredients: 1,
  //         campus: 1,
  //       }

  //       const rawItems = await Meals.find(query).select(projection).lean()

  //       const items = rawItems.filter((item) => item.restaurantName && item.restaurantType)

  //       // Step 2: Group by restaurantName + restaurantType + mealType
  //       const grouped = {}
  //       for (const item of items) {
  //         const key = `${item.restaurantName}::${item.restaurantType}::${item.type}`
  //         if (!grouped[key]) grouped[key] = []
  //         grouped[key].push(item)
  //       }

  //       // Step 3: Format prompt for OpenAI
  //       const prompt = `
  //       Below is a list of food items, grouped by restaurant and type. Your job is to generate as many realistic meal **combinations** as possible that meet the following criteria:

  //       - Each combination must:
  //         - Be made from items **from the same restaurant**
  //         - Match the meal type (Breakfast, Lunch, or Dinner)
  //         - Have total calories in the range ${calorieRange.min} to ${calorieRange.max}
  //         - Avoid repeating the same exact set of items
  //   - Be a **unique set of items** (do not generate duplicate combinations with the same items)

  // - A single item **cannot appear twice** in one meal combination.
  // - The **same item** can appear in **different combinations**, but **each combination must be unique**.

  //       Return ONLY with a valid JSON array in the following format:
  //       [
  //         {
  //           "mealType": "Breakfast",
  //           "restaurantName": "Yahentamitsi Dining Hall",
  //           "restaurantType": "Dining-Halls",
  //           "items": [
  //             { "id": "item_id", "name": "Item Name", "calories": 123, },
  //           ]
  //         }
  //       ]

  //       Here is the data:
  //       ${JSON.stringify(
  //         Object.entries(grouped).map(([key, items]) => {
  //           const [restaurantName, restaurantType, mealType] = key.split('::')
  //           return {
  //             restaurantName,
  //             restaurantType,
  //             mealType,
  //             items: items.map((i) => ({
  //               id: i._id,
  //               calories: i.nutrients.calories,
  //             })),
  //           }
  //         }),
  //         null,
  //         2
  //       )}
  //       `.trim()

  //       // Step 4: Call OpenAI to generate meal combos
  //       const aiRes = await processMealRecommendations(prompt)
  //       const aiResponse = aiRes?.responseText

  //       // Step 5: Parse JSON safely
  //       const jsonStart = aiResponse.indexOf('[')
  //       const jsonEnd = aiResponse.lastIndexOf(']')
  //       const jsonOnly = aiResponse.slice(jsonStart, jsonEnd + 1)
  //       const combos = JSON.parse(jsonOnly)

  //       // Step 5.5: Filter combinations to ensure all items belong to the same restaurant
  //       const validCombos = combos.filter((combo) => {
  //         const firstItemId = combo.items?.[0]?.id?.toString()
  //         const firstItem = items.find((m) => m._id.toString() === firstItemId)

  //         if (!firstItem) return false

  //         return combo.items.every((item) => {
  //           const matched = items.find((m) => m._id.toString() === item.id.toString())
  //           return (
  //             matched &&
  //             matched.restaurantName === firstItem.restaurantName &&
  //             matched.restaurantType === firstItem.restaurantType
  //           )
  //         })
  //       })

  //       // Step 6: Save to DB
  //       const createdPayload = validCombos.map((combo, i) => {
  //         const enrichedItems = combo.items.map((item) => {
  //           const matched = items.find((m) => m._id.toString() === item.id.toString())

  //           return {
  //             itemId: item.id,
  //             name: matched?.name || item.name || 'Unknown',
  //             calories: matched?.nutrients?.calories || item.calories || 0,
  //             restaurantName: matched?.restaurantName || combo.restaurantName,
  //             restaurantType: matched?.restaurantType || combo.restaurantType,
  //             ingredients: matched?.ingredients || [],
  //             campus: matched?.campus || [],
  //           }
  //         })

  //         return {
  //           name: `Generated Meal ${Date.now()}`,
  //           mealType: combo.mealType,
  //           items: enrichedItems,
  //           totalCalories: enrichedItems.reduce((sum, it) => sum + (it.calories || 0), 0),
  //           restaurantName: combo.restaurantName,
  //           restaurantType: combo.restaurantType,
  //           campus: enrichedItems[0]?.campus || [],
  //         }
  //       })
  //       const created = await GeneratedMeal.insertMany(createdPayload)

  //       // await writeFile(`generatedMeals-${types[0]}-${campus[0]}.json`, JSON.stringify(created, null, 2), 'utf-8')

  //       const rejectedCount = combos?.length - validCombos?.length
  //       if (rejectedCount > 0) {
  //         let message = `${rejectedCount} invalid combos skipped due to mixed restaurant items`
  //         console.warn(message)
  //       }
  //       res.status(200).json({
  //         message: 'Meals generated successfully',
  //         count: created.length,
  //         data: created,
  //         usage: aiRes?.usage,
  //         rejectedCount,
  //       })
  //     } catch (err) {
  //       console.error(err)
  //       res.status(500).json({ error: 'Internal server error' })
  //     }
  //   }),

  createWeeklyDietPlan: asyncMiddleware(async (req, res) => {
    const dietPlanData = req.body
    const newDietPlan = await saveDietPlan(dietPlanData)

    return res.status(StatusCodes.OK).json({
      message: 'Diet plan created successfully.',
      statusCode: StatusCodes.OK,
      dietPlan: newDietPlan,
    })
  }),

  createWeekPlan: asyncMiddleware(async (req, res) => {
    try {
      const {
        // selectedOption,
        // targetCaloriesPerDay,
        // For 14-meal plan
        // selectedMealType, // For 7-meal plan
        // rejectedMealType, // For 19-mealplan
        // campus,
      } = req.body

      const token = req.headers.authorization?.split(' ')[1]
      const decoded = jwt.decode(token)
      const userId = decoded?._id
      const user = await getUserById(userId)
      const selectedOption = user.dietPlan.plan
      const campus = user.student.school
      // const selectedMeals = ['Lunch', 'Dinner']
      const preferredMealTypes = user.dietPlan.selectedMeals
      const selectedMealType = user.dietPlan.selectedMeals
      const targetCaloriesPerDay = calculateBMR(user)
      const mealTypes = ['Breakfast', 'Lunch', 'Dinner']
      const rejectedMealType = mealTypes[Math.floor(Math.random() * mealTypes.length)]
      // const dietPlan = user.dietPlan.swipes

      // const dietPlan = { diningHall: 3, franchise: 4 }
      const totalCalories = calculateBMR(user)
      console.log('totalCalories', totalCalories)

      var targetCalories = targetCaloriesPerDay

      const breakfastMeals = await GeneratedMeal.find({
        mealType: 'Breakfast',
        campus: { $in: [campus] },
      })
        .populate('items.itemId')
        .lean()

      //console.log('breakfast', breakfastMeals.length)

      const lunchMeals = await GeneratedMeal.find({
        mealType: 'Lunch',
        campus: { $in: [campus] },
      })
        .populate('items.itemId')
        .lean()
      //console.log('breakfast', lunchMeals)
      const dinnerMeals = await GeneratedMeal.find({
        mealType: 'Dinner',
        campus: { $in: [campus] },
      })
        .populate('items.itemId')
        .lean()
      //  console.log('breakfast', dinnerMeals)
      // ✅ Add this check:
      if (breakfastMeals.length === 0 && lunchMeals.length === 0 && dinnerMeals.length === 0) {
        return res.status(200).json({
          success: false,
          message: 'Generate response - database is empty',
        })
      }

      let mealPlan

      if (selectedOption === '19 Meals') {
        mealPlan = generate19MealPlan(breakfastMeals, lunchMeals, dinnerMeals, targetCaloriesPerDay, rejectedMealType)
        console.log('21 days meal plan ', rejectedMealType)
        // return res.status(200).json({
        //   mealPlan,
        // })
      } else if (selectedOption === '14 Meals') {
        if (!preferredMealTypes || preferredMealTypes.length !== 2) {
          return res.status(400).json({ error: 'preferredMealTypes (array of 2) is required for 14-meal plan.' })
        }
        if (targetCaloriesPerDay > 2000) {
          targetCalories = targetCaloriesPerDay * 0.6
        }
        mealPlan = generate14MealPlan(breakfastMeals, lunchMeals, dinnerMeals, targetCalories, preferredMealTypes)
      } else if (selectedOption === '7 Meals') {
        if (!selectedMealType) {
          return res.status(400).json({ error: 'selectedMealType is required for 7-meal plan.' })
        }
        const mealType = Array.isArray(selectedMealType) ? selectedMealType[0] : selectedMealType
        if (targetCaloriesPerDay > 2000) {
          targetCalories = targetCaloriesPerDay * 0.3
        }
        mealPlan = generate7MealPlan(breakfastMeals, lunchMeals, dinnerMeals, targetCalories, mealType)
        console.log('7days meal plan ', mealPlan)
        // return res.status(200).json({
        //   mealPlan,
        // })
      } else {
        return res.status(400).json({ error: 'Invalid selectedOption provided.' })
      }

      // Transform the meal plan into the desired format
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

      const transformedPlan = Object.values(mealPlan).map((dayMeals, index) => {
        const dayName = daysOfWeek[index]

        let dayCalories = 0
        let dayProtein = 0
        let dayFat = 0
        let dayCarbs = 0
        let breakfastItems = []
        let lunchItems = []
        let dinnerItems = []

        // Handle all plan types (7, 14, 21)
        if (dayMeals.breakfast) breakfastItems = transformMealItems(dayMeals.breakfast.items)
        if (dayMeals.lunch) lunchItems = transformMealItems(dayMeals.lunch.items)
        if (dayMeals.dinner) dinnerItems = transformMealItems(dayMeals.dinner.items)

        // For 7-meal plan
        if (dayMeals.meal) {
          if (dayMeals.meal.mealType === 'Breakfast') breakfastItems = transformMealItems(dayMeals.meal.items)
          if (dayMeals.meal.mealType === 'Lunch') lunchItems = transformMealItems(dayMeals.meal.items)
          if (dayMeals.meal.mealType === 'Dinner') dinnerItems = transformMealItems(dayMeals.meal.items)
        }
        // For 14-meal plan
        if (dayMeals.mealTypeA) {
          if (dayMeals.mealTypeA.mealType === 'Breakfast') breakfastItems = transformMealItems(dayMeals.mealTypeA.items)
          if (dayMeals.mealTypeA.mealType === 'Lunch') lunchItems = transformMealItems(dayMeals.mealTypeA.items)
          if (dayMeals.mealTypeA.mealType === 'Dinner') dinnerItems = transformMealItems(dayMeals.mealTypeA.items)
        }
        if (dayMeals.mealTypeB) {
          if (dayMeals.mealTypeB.mealType === 'Breakfast') breakfastItems = transformMealItems(dayMeals.mealTypeB.items)
          if (dayMeals.mealTypeB.mealType === 'Lunch') lunchItems = transformMealItems(dayMeals.mealTypeB.items)
          if (dayMeals.mealTypeB.mealType === 'Dinner') dinnerItems = transformMealItems(dayMeals.mealTypeB.items)
        }

        // Calculate nutritional totals from all meals for the day
        const allDayItems = [
          ...(dayMeals.breakfast?.items || []),
          ...(dayMeals.lunch?.items || []),
          ...(dayMeals.dinner?.items || []),
          ...(dayMeals.meal?.items || []),
          ...(dayMeals.mealTypeA?.items || []),
          ...(dayMeals.mealTypeB?.items || []),
        ]

        allDayItems.forEach((item) => {
          dayCalories += item.calories || 0
          if (item.itemId && item.itemId.nutrients) {
            dayProtein += item.itemId.nutrients.protein || 0
            dayFat += item.itemId.nutrients.fat || 0
            dayCarbs += item.itemId.nutrients.carbohydrate || 0
          }
        })

        return {
          day: dayName,
          breakfast: breakfastItems,
          lunch: lunchItems,
          dinner: dinnerItems,
          caloriesBMR: targetCaloriesPerDay,
          caloriesProvided: dayCalories,
          proteinProvided: dayProtein,
          fatProvided: dayFat,
          carbsProvided: dayCarbs,
        }
      })

      res.status(200).json(transformedPlan)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        success: false,
        message: 'Failed to generate meal plan.',
        error: error.message,
      })
    }
  }),

  getDietHistory: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const dietPlans = await getDietHistoryService(userId)
    return res.status(StatusCodes.OK).json({
      dietPlans,
      message: 'Diet History fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  getWeeklydietPlanDetails: asyncMiddleware(async (req, res) => {
    const dietId = req.query.id
    const dietPlanDetails = await getDietDetails(dietId)
    return res.status(StatusCodes.OK).json({
      dietPlanDetails,
      message: 'Diet plan details fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  updateDietStatus: asyncMiddleware(async (req, res) => {
    const { dietId, mealType, day, newStatus, notificationId } = req.body
    const updatedDiet = await Diet.findOneAndUpdate(
      {
        _id: dietId,
        'dietplan.day': day,
        'dietplan.item.mealType': mealType,
      },
      {
        $set: {
          'dietplan.$[dayMatch].item.$[mealMatch].status': newStatus,
        },
      },
      {
        arrayFilters: [{ 'dayMatch.day': day }, { 'mealMatch.mealType': mealType }],
        new: true,
      }
    )
    await Notification.findByIdAndUpdate(notificationId, { isUpdated: true })
    return res.status(StatusCodes.OK).json({
      updatedDiet,
      message: 'Diet History fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  getVeganDiet: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await getUserById(userId)
    const campus = user.student.school
    const allMenuItems = await getCafeteriaItems(campus)

    // List of animal-based ingredients to check
    const nonVeganIngredients = [
      'cheese',
      'bacon',
      'butter',
      'milk',
      'egg',
      'lard',
      'cream',
      'honey',
      'gelatin',
      'meat',
      'fish',
      'chicken',
      'beef',
      'pork',
    ]

    // Function to check if a meal is vegan based on its ingredients
    const isVegan = (ingredients) => {
      return !ingredients.some((ingredient) =>
        nonVeganIngredients.some((nonVegan) => ingredient.toLowerCase().includes(nonVegan))
      )
    }

    // Filter the menu items to return only vegan meals
    const veganMenuItems = allMenuItems.filter((item) => isVegan(item.ingredients))
    const normalizeMealType = (mealType) => {
      const normalized = mealType?.trim().toLowerCase()

      const mealVariants = {
        breakfast: ['breakfast'],
        lunch: ['lunch'],
        dinner: ['dinner'],
      }

      for (const [key, values] of Object.entries(mealVariants)) {
        if (values.includes(normalized)) return key
      }
      return 'unknown'
    }
    const mealItemsByType = { breakfast: [], lunch: [], dinner: [] }
    veganMenuItems.forEach((item) => {
      if (!item?.mealName || typeof item.mealName !== 'string') return

      const normalizedMealType = normalizeMealType(item.mealType)
      // const normalizedRestaurant = normalizeRestaurantName(item.restaurantName)

      // if (!isValidCalorieRange(item.calories)) return

      let finalMealType = normalizedMealType
      if (finalMealType === 'unknown') {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(normalizedRestaurant)) {
            finalMealType = mealType
            break
          }
        }
      }

      if (finalMealType !== 'unknown') {
        mealItemsByType[finalMealType].push(item)
      }
    })
    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }
    const totalCalories = calculateBMR(user)
    const weeklyPlan = createWeeklyDietPlanService(
      totalCalories,
      sortedMealItemsByType,
      { Franchise: 0, 'Dining-Halls': 21 },
      ['breakfast', 'lunch', 'dinner']
    )
    return res.status(StatusCodes.OK).json({
      sortedMealItemsByType,
      message: 'Vegan Diet Plan fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),

  getPaleoDiet: asyncMiddleware(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = jwt.decode(token)
    const userId = decoded?._id
    const user = await getUserById(userId)
    const campus = user.student.school
    const allMenuItems = await getCafeteriaItems(campus)

    const nonPaleoIngredients = [
      'wheat',
      'oats',
      'rice',
      'barley',
      'quinoa',
      'corn',
      'beans',
      'lentils',
      'soy',
      'tofu',
      'milk',
      'cheese',
      'butter',
      'cream',
      'yogurt',
      'sugar',
      'high fructose corn syrup',
      'honey',
      'canola oil',
      'sunflower oil',
      'margarine',
      'processed',
      'flour',
      'bread',
      'pasta',
    ]

    const isPaleo = (ingredients) => {
      return !ingredients.some((ingredient) =>
        nonPaleoIngredients.some((nonPaleo) => ingredient.toLowerCase().includes(nonPaleo))
      )
    }

    const paleoMenuItems = allMenuItems.filter((item) => isPaleo(item.ingredients))

    const normalizeMealType = (mealType) => {
      const normalized = mealType?.trim().toLowerCase()

      const mealVariants = {
        breakfast: ['breakfast'],
        lunch: ['lunch'],
        dinner: ['dinner'],
      }

      for (const [key, values] of Object.entries(mealVariants)) {
        if (values.includes(normalized)) return key
      }
      return 'unknown'
    }

    const mealItemsByType = { breakfast: [], lunch: [], dinner: [] }

    paleoMenuItems.forEach((item) => {
      if (!item?.mealName || typeof item.mealName !== 'string') return

      const normalizedMealType = normalizeMealType(item.mealType)

      let finalMealType = normalizedMealType
      if (finalMealType === 'unknown') {
        for (const [mealType, restaurants] of Object.entries(mealOptions)) {
          if (restaurants.includes(item.restaurantName?.toLowerCase())) {
            finalMealType = mealType
            break
          }
        }
      }

      if (finalMealType !== 'unknown') {
        mealItemsByType[finalMealType].push(item)
      }
    })

    const sortedMealItemsByType = {
      breakfast: mealItemsByType.breakfast.sort((a, b) => b.calories - a.calories),
      lunch: mealItemsByType.lunch.sort((a, b) => b.calories - a.calories),
      dinner: mealItemsByType.dinner.sort((a, b) => b.calories - a.calories),
    }

    const totalCalories = calculateBMR(user)

    const weeklyPlan = createWeeklyDietPlanService(
      totalCalories,
      sortedMealItemsByType,
      { Franchise: 0, 'Dining-Halls': 21 },
      ['breakfast', 'lunch', 'dinner']
    )

    return res.status(StatusCodes.OK).json({
      sortedMealItemsByType,
      weeklyPlan,
      message: 'Paleo Diet Plan fetched successfully.',
      statusCode: StatusCodes.OK,
    })
  }),
}
//{ "_id": ObjectId("67acaacba0812499dafa53f3") }
// Helper function to transform meal items
const transformMealItems = (items) => {
  return items.map((item) => ({
    _id: item.itemId._id,
    name: item.name,
    type: item.itemId.mealType,
    ingredients: item.ingredients || [],
    allergens: item.itemId.allergens || [],
    dieteryPreferences: item.itemId.dieteryPreferences || [],
    serving: item.itemId.serving, // You might need to adjust this
    nutrients: {
      calories: item.calories || 0,
      protein: item.itemId.nutrients?.protein || 0,
      fat: item.itemId.nutrients?.fat || 0,
      carbohydrate: item.itemId.nutrients?.carbohydrate || 0,
    },
    likedBy: item.itemId.likedBy || [],
    isAvailable: item.itemId.isAvailable,
    campus: item.campus,
    restaurantName: item.restaurantName,
    category: item.itemId.category, // You might need to adjust this
    restaurantType: item.restaurantType,
  }))
}

const sumNutrients = (items) => {
  return items.reduce(
    (acc, item) => {
      acc.calories += item.nutrients?.calories || 0
      acc.protein += item.nutrients?.protein || 0
      acc.fat += item.nutrients?.fat || 0
      acc.carbohydrate += item.nutrients?.carbohydrate || 0
      return acc
    },
    { calories: 0, protein: 0, fat: 0, carbohydrate: 0 }
  )
}

// Helper function to sum a specific nutrient across items
const sumNutrient = (items, nutrient) => {
  return items.reduce((sum, item) => {
    return sum + (item[nutrient] || 0)
  }, 0)
}

export const normalizeMealCalories_Maintain = (meals, shouldFix = false) => {
  const MACRO_CALORIES = {
    protein: 4,
    fat: 9,
    carbohydrate: 4,
  }

  return meals
    .map((meal) => {
      const { protein = 0, fat = 0, carbohydrate = 0, calories } = meal

      // Calculate the total calories from the macronutrients
      const calculatedCalories =
        protein * MACRO_CALORIES.protein + fat * MACRO_CALORIES.fat + carbohydrate * MACRO_CALORIES.carbohydrate

      // Calculate the fat percentage of the total calories
      const fatPercentage = ((fat * MACRO_CALORIES.fat) / calculatedCalories) * 100

      // Calculate the carbohydrate percentage of the total calories
      const carbPercentage = ((carbohydrate * MACRO_CALORIES.carbohydrate) / calculatedCalories) * 100

      // If the fat percentage is greater than 50%, or carbohydrate percentage is greater than 65%, skip this meal (filter it out)
      if (fatPercentage > 50 || carbPercentage > 70) {
        return null // Returning null will remove the meal from the array
      }

      const diff = Math.abs(calculatedCalories - calories)

      const isMismatch = diff > 20 // more than 20 kcal difference

      if (isMismatch && shouldFix) {
        return {
          ...meal,
          calories: Math.round(calculatedCalories),
          _calorieMismatch: true, // Optional: for debug tracking
        }
      }

      return {
        ...meal,
        _calorieMismatch: isMismatch ? true : undefined, // Mark only if mismatch
      }
    })
    .filter(Boolean) // Remove any null values (meals with >50% fat or >65% carbs)
}

export const normalizeMealCalories_HighProtien = (meals, shouldFix = false) => {
  const MACRO_CALORIES = {
    protein: 4,
    fat: 9,
    carbohydrate: 4,
  }

  return (
    meals
      .map((meal) => {
        const { protein = 0, fat = 0, carbohydrate = 0, calories } = meal

        const calculatedCalories =
          protein * MACRO_CALORIES.protein + fat * MACRO_CALORIES.fat + carbohydrate * MACRO_CALORIES.carbohydrate

        const proteinPercentage = ((protein * MACRO_CALORIES.protein) / calculatedCalories) * 100
        const fatPercentage = ((fat * MACRO_CALORIES.fat) / calculatedCalories) * 100
        const carbPercentage = ((carbohydrate * MACRO_CALORIES.carbohydrate) / calculatedCalories) * 100

        // Add condition for high protein, and reduce fat & carb bias
        const isHighProtein = proteinPercentage >= 25
        const isAcceptableFat = fatPercentage <= 30
        const isAcceptableCarb = carbPercentage <= 60

        if (!isHighProtein || !isAcceptableFat || !isAcceptableCarb) {
          return null
        }

        const diff = Math.abs(calculatedCalories - calories)
        const isMismatch = diff > 20

        if (isMismatch && shouldFix) {
          return {
            ...meal,
            calories: Math.round(calculatedCalories),
            _calorieMismatch: true,
          }
        }

        return {
          ...meal,
          _calorieMismatch: isMismatch ? true : undefined,
        }
      })
      .filter(Boolean)
      // Optional: Sort meals with highest protein % first
      .sort((a, b) => {
        const aCalories = a.protein * 4 + a.fat * 9 + a.carbohydrate * 4
        const bCalories = b.protein * 4 + b.fat * 9 + b.carbohydrate * 4

        const aProteinRatio = (a.protein * 4) / aCalories
        const bProteinRatio = (b.protein * 4) / bCalories

        return bProteinRatio - aProteinRatio // highest protein first
      })
  )
}
