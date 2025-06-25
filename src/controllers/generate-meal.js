import { Meals } from '../../dist/models/meals'
import { asyncMiddleware, notifyError } from '../middlewares'
import { GeneratedMeal } from '../models/generatedMeals'
import { processMealRecommendations, processMealRecommendationsVariant } from '../utils/chat-gpt'
import { enforceTokenDelay, estimateChatTokens, getBestModelForTokens } from '../utils/estimateTokens'
import { runMealGenerationManually } from '../utils/generate-meals_cron'

export const CONTROLLER_GENERATE_MEAL = {
  generateMeals: asyncMiddleware(async (req, resOrParams) => {
    const isCron = !resOrParams || typeof resOrParams !== 'object' || !('status' in resOrParams)
    const input = isCron ? req : req.body
    const res = isCron ? { status: () => ({ json: () => {} }) } : resOrParams

    console.log(`🚀 Generating meals via ${isCron ? 'CRON' : 'HTTP API'} mode`)
    try {
      const { calorieRange = { min: 300, max: 600 }, types = ['Breakfast', 'Lunch', 'Dinner'], campus } = input

      const query = {
        'nutrients.calories': { $gt: 0 },
        type: { $in: types },
      }

      const defaultCampuses = ['HPU', 'UMD', 'UNCC']
      const campusList = campus?.length ? campus : defaultCampuses
      console.log(`campusList: (${campusList}), Meal(types): (${types})`)
      query.campus = { $in: campusList }

      // Step 1: Fetch meals from DB
      const projection = {
        name: 1,
        type: 1,
        'nutrients.calories': 1,
        restaurantName: 1,
        restaurantType: 1,
        ingredients: 1,
        campus: 1,
      }

      const rawItems = await Meals.find(query).select(projection).lean()

      const items = rawItems.filter((item) => item.restaurantName && item.restaurantType)

      // Step 2: Group by restaurantName + restaurantType + mealType
      const grouped = {}
      for (const item of items) {
        const key = `${item.restaurantName}::${item.restaurantType}::${item.type}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(item)
      }

      // Step 3: Format prompt for OpenAI
      const prompt = `
        Below is a list of food items, grouped by restaurant and type. Your job is to generate as many realistic meal **combinations** as possible that meet the following criteria:
  
        - Each combination must:
          - Be made from items **from the same restaurant**
          - Match the meal type (Breakfast, Lunch, or Dinner)
          - Have total calories in the range ${calorieRange.min} to ${calorieRange.max}
          - Avoid repeating the same exact set of items
    - Be a **unique set of items** (do not generate duplicate combinations with the same items)
  
  - A single item **cannot appear twice** in one meal combination.
  - The **same item** can appear in **different combinations**, but **each combination must be unique**.
  
        Return ONLY with a valid JSON array in the following format:
        [
          {
            "mealType": "Breakfast",
            "restaurantName": "Yahentamitsi Dining Hall",
            "restaurantType": "Dining-Halls",
            "items": [
              { "id": "item_id", "name": "Item Name", "calories": 123, },
            ]
          }
        ]
  
        Here is the data:
        ${JSON.stringify(
          Object.entries(grouped).map(([key, items]) => {
            const [restaurantName, restaurantType, mealType] = key.split('::')
            return {
              restaurantName,
              restaurantType,
              mealType,
              items: items.map((i) => ({
                id: i._id,
                calories: i.nutrients.calories,
              })),
            }
          }),
          null,
          2
        )}
        `.trim()

      const aiRes = await processMealRecommendationsVariant(prompt)
      const aiResponse = aiRes?.responseText

      // Step 5: Parse JSON safely
      const jsonStart = aiResponse.indexOf('[')
      const jsonEnd = aiResponse.lastIndexOf(']')
      const jsonOnly = aiResponse.slice(jsonStart, jsonEnd + 1)
      const combos = JSON.parse(jsonOnly)

      // Step 5.5: Filter combinations to ensure all items belong to the same restaurant
      const validCombos = combos.filter((combo) => {
        const firstItemId = combo.items?.[0]?.id?.toString()
        const firstItem = items.find((m) => m._id.toString() === firstItemId)

        if (!firstItem) return false

        return combo.items.every((item) => {
          const matched = items.find((m) => m._id.toString() === item.id.toString())
          return (
            matched &&
            matched.restaurantName === firstItem.restaurantName &&
            matched.restaurantType === firstItem.restaurantType
          )
        })
      })

      // Step 6: Save to DB
      const createdPayload = validCombos.map((combo, i) => {
        const enrichedItems = combo.items.map((item) => {
          const matched = items.find((m) => m._id.toString() === item.id.toString())

          return {
            itemId: item.id,
            name: matched?.name || item.name || 'Unknown',
            calories: matched?.nutrients?.calories || item.calories || 0,
            restaurantName: matched?.restaurantName || combo.restaurantName,
            restaurantType: matched?.restaurantType || combo.restaurantType,
            ingredients: matched?.ingredients || [],
            campus: matched?.campus || [],
          }
        })

        return {
          name: `Generated Meal ${Date.now()}`,
          mealType: combo.mealType,
          items: enrichedItems,
          totalCalories: enrichedItems.reduce((sum, it) => sum + (it.calories || 0), 0),
          restaurantName: combo.restaurantName,
          restaurantType: combo.restaurantType,
          campus: enrichedItems[0]?.campus || [],
        }
      })
      const created = await GeneratedMeal.insertMany(createdPayload)

      // await writeFile(`generatedMeals-${types[0]}-${campus[0]}.json`, JSON.stringify(created, null, 2), 'utf-8')

      const rejectedCount = combos?.length - validCombos?.length
      if (rejectedCount > 0) {
        let message = `${rejectedCount} invalid combos skipped due to mixed restaurant items`
        console.warn(message)
      }
      res.status(200).json({
        message: 'Meals generated successfully',
        count: created.length,
        data: created,
        usage: aiRes?.usage,
        rejectedCount,
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }),
  generateMealsManually: asyncMiddleware(async (req, res) => {
    res.status(202).json({
      message: 'Meal Generation completed and data saved to MongoDB successfully',
    })
    try {
      runMealGenerationManually()
      notifyError('Meal Generation Sucess')
    } catch (error) {
      console.error('Error during Meal Generation:', error)
      notifyError(error)
      res.status(500).json({ message: 'Meal Generation failed', error: error.message })
    }
  }),
}
