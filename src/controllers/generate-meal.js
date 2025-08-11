import { Meals } from '../../dist/models/meals'
import { asyncMiddleware, notifyError } from '../middlewares'
import { GeneratedMeal, GeneratedMealNew } from '../models/generatedMeals'
import { processMealRecommendations, processMealRecommendationsVariant } from '../utils/chat-gpt'
import { enforceTokenDelay, estimateChatTokens, getBestModelForTokens } from '../utils/estimateTokens'
import { runMealGenerationManually } from '../utils/generate-meals_cron'

export const CONTROLLER_GENERATE_MEAL = {
  // ? 1 OK
  generateMealsWorking: asyncMiddleware(async (req, resOrParams) => {
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
      // const grouped = {}
      // for (const item of items) {
      //   const key = `${item.restaurantName}::${item.restaurantType}::${item.type}`
      //   if (!grouped[key]) grouped[key] = []
      //   grouped[key].push(item)
      // }
      const grouped = {}

      for (const item of items) {
        const key = `${item.restaurantName}::${item.restaurantType}::${item.type}`

        if (!grouped[key]) grouped[key] = []

        // Add item only if we haven't reached the limit
        if (grouped[key].length < 50) {
          grouped[key].push(item)
        }
      }

      // Step 3: Format prompt for OpenAI

      //? 2nd "WORKING VERSION"
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

  //   generateMeals: asyncMiddleware(async (req, resOrParams) => {
  //     const isCron = !resOrParams || typeof resOrParams !== 'object' || !('status' in resOrParams)
  //     const input = isCron ? req : req.body
  //     const res = isCron ? { status: () => ({ json: () => {} }) } : resOrParams

  //     console.log(`🚀 Generating meals via ${isCron ? 'CRON' : 'HTTP API'} mode`)
  //     try {
  //       const { calorieRange = { min: 300, max: 600 }, types = ['Breakfast', 'Lunch', 'Dinner'], campus } = input

  //       const defaultCampuses = ['HPU', 'UMD', 'UNCC']
  //       const campusList = campus?.length ? campus : defaultCampuses
  //       console.log(`campusList: (${campusList}), Meal(types): (${types})`)

  //       const query = {
  //         'nutrients.calories': { $gt: 0 },
  //         type: { $in: types },
  //         campus: { $in: campusList },
  //       }

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

  //       // Group by restaurantName + mealType, max 50 items per group
  //       const grouped = {}
  //       for (const item of items) {
  //         const key = `${item.restaurantName}::${item.type}`
  //         if (!grouped[key]) grouped[key] = []
  //         if (grouped[key].length < 100) grouped[key].push(item)
  //       }

  //       // OpenAI Prompt
  //       const prompt = `
  // Below is a list of food items grouped by restaurant and meal type.

  // 🧠 Think like a **campus dietician** planning **20+ realistic, balanced student meals** for each restaurant.

  // ---

  // ### ✅ Meal Rules:

  // 1. Meals must:
  //    - Use items from only **one restaurant**
  //    - Match the given **mealType**
  //    - Stay within **${calorieRange.min}-${calorieRange.max} calories**
  //    - Include **2 to 4 items** with no duplicates

  // 2. 🍱 Include:
  //    - 1 main (e.g. chicken, patty, tofu, entrée)
  //    - 1 side (rice, bread, vegetables, pasta)
  //    - Optionally: 1 dessert, drink, or fruit

  // 3. ❌ Avoid:
  //    - Meals made only from sauces/dressings
  //    - Meals with repeated items

  // 4. ✅ Do your best to create **at least 20** valid and unique meals.

  // ---

  // ### 📦 Return ONLY a valid JSON array like this:

  // {
  //   "mealType": "Lunch",
  //   "restaurantName": "The Café",
  //   "items": [
  //     { "id": "item_id", "name": "Item Name", "calories": 123 }
  //   ]
  // }

  // ---

  // ### 📄 Item Data:
  // ${JSON.stringify(
  //   Object.entries(grouped).map(([key, items]) => {
  //     const [restaurantName, mealType] = key.split('::')
  //     return {
  //       restaurantName,
  //       mealType,
  //       items: items.map((i) => ({
  //         id: i._id,
  //         name: i.name,
  //         calories: i.nutrients.calories,
  //       })),
  //     }
  //   }),
  //   null,
  //   2
  // )}
  // `.trim()

  //       const aiRes = await processMealRecommendationsVariant(prompt)
  //       const aiResponse = aiRes?.responseText || ''

  //       const jsonStart = aiResponse.indexOf('[')
  //       const jsonEnd = aiResponse.lastIndexOf(']')
  //       const jsonOnly = aiResponse.slice(jsonStart, jsonEnd + 1)

  //       let combos = []

  //       try {
  //         combos = JSON.parse(jsonOnly)
  //       } catch (e) {
  //         console.error('❌ Failed to parse AI response as JSON:', e.message)
  //         console.error('⚠️ Raw AI response snippet:', aiResponse.slice(0, 500))
  //         return res.status(500).json({ error: 'Failed to parse OpenAI response' })
  //       }

  //       // Validation: realistic meals
  //       const seenCombos = new Set()

  //       function isRealisticMeal(items = []) {
  //         if (!Array.isArray(items) || items.length < 2) return false

  //         const comboKey = items
  //           .map((i) => i?.itemId?.toString() || i?.id?.toString())
  //           .sort()
  //           .join('|')

  //         if (seenCombos.has(comboKey)) return false
  //         seenCombos.add(comboKey)

  //         const totalCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0)
  //         if (totalCalories < 250 || totalCalories > 1600) {
  //           console.warn('❌ Rejected: Calories out of bounds:', totalCalories)
  //           return false
  //         }

  //         const names = items.map((i) => i.name?.toLowerCase() || '')
  //         const onlyDressings = names.every((n) => /dressing|sauce/.test(n))
  //         if (onlyDressings) return false

  //         const breadCount = names.filter((n) => /bread|bun|naan|pita|biscuit/.test(n)).length
  //         if (breadCount > 2) return false

  //         return true
  //       }

  //       const validCombos = combos.filter((combo) => {
  //         const enrichedItems = combo.items
  //           .map((item) => items.find((m) => m._id.toString() === item.id?.toString()))
  //           .filter(Boolean) // filter out not found

  //         if (!enrichedItems.length || enrichedItems.length !== combo.items.length) {
  //           console.warn('❌ Skipping combo due to missing item matches')
  //           return false
  //         }

  //         // if (!isRealisticMeal(enrichedItems)) return false

  //         // Ensure restaurant consistency
  //         const first = enrichedItems[0]
  //         return enrichedItems.every((i) => i.restaurantName === first.restaurantName)
  //       })

  //       // Final payload
  //       const createdPayload = validCombos.map((combo) => {
  //         const enrichedItems = combo.items.map((item) => {
  //           const matched = items.find((m) => m._id?.toString() === item.id?.toString())
  //           if (!matched) {
  //             console.warn('❌ No match found for ID:', item.id)
  //           }
  //           return {
  //             itemId: item.id,
  //             name: matched?.name || item.name || 'Unknown',
  //             calories: matched?.nutrients?.calories || item.calories || 0,
  //             restaurantName: matched?.restaurantName || combo.restaurantName,
  //             restaurantType: matched?.restaurantType || 'Franchise',
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
  //           restaurantType: enrichedItems[0]?.restaurantType || 'Franchise',
  //           campus: enrichedItems[0]?.campus || [],
  //         }
  //       })

  //       const created = await GeneratedMeal.insertMany(createdPayload)

  //       const rejectedCount = combos.length - validCombos.length
  //       if (rejectedCount > 0) console.warn(`⚠️ ${rejectedCount} invalid combos skipped due to validation.`)

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
  //? (3: 40Meals) This is the original version that is working Collection:(GeneratedMeal)
  generateMealsOld: asyncMiddleware(async (req, resOrParams) => {
    const isCron = !resOrParams || typeof resOrParams !== 'object' || !('status' in resOrParams)
    const input = isCron ? req : req.body
    const res = isCron ? { status: () => ({ json: () => {} }) } : resOrParams

    console.log(`🚀 Generating meals via ${isCron ? 'CRON' : 'HTTP API'} mode`)

    try {
      const { calorieRange = { min: 300, max: 600 }, types = ['Breakfast', 'Lunch', 'Dinner'], campus } = input

      const defaultCampuses = ['HPU', 'UMD', 'UNCC']
      const campusList = campus?.length ? campus : defaultCampuses
      const restaurantTypes = ['Dining-Halls', 'Franchise']
      const allCreatedMeals = []
      const skippedRestaurantTypes = []

      for (const restType of restaurantTypes) {
        console.log(`🍽 Processing restaurantType: ${restType}`)

        const query = {
          'nutrients.calories': { $gt: 0 },
          type: { $in: types },
          campus: { $in: campusList },
          restaurantType: restType,
        }

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

        if (!rawItems.length) {
          console.warn(`⚠️ Skipping "${restType}" — no meals found`)
          skippedRestaurantTypes.push(restType)
          continue
        }

        // const items = rawItems.filter((item) => item.restaurantName && item.restaurantType)
        const items = rawItems
          .filter(
            (item) =>
              item.restaurantName &&
              item.restaurantType &&
              typeof item.nutrients?.calories === 'number' &&
              item.nutrients.calories > 0
          )
          .map((item) => ({
            ...item,
            calories: item.nutrients.calories, // ✅ already filtered, so safe to access
          }))

        const grouped = {}
        for (const item of items) {
          const key = `${item.restaurantName}::${item.type}`
          if (!grouped[key]) grouped[key] = []
          if (grouped[key].length < 100) grouped[key].push(item)
        }

        const prompt = `
  Below is a list of food items grouped by restaurant and meal type.

  🧠 Think like a **campus dietician** planning **20+ realistic, balanced student meals** for each restaurant.

  ---

  ### ✅ Meal Rules:

  1. Meals must:
     - Use items from only **one restaurant**
     - Match the given **mealType**
     - Stay within **${calorieRange.min}-${calorieRange.max} calories**
     - Include **2 to 4 items** with no duplicates

  2. 🍱 Include:
     - 1 main (e.g. chicken, patty, tofu, entrée)
     - 1 side (rice, bread, vegetables, pasta)
     - Optionally: 1 dessert, drink, or fruit

  3. ❌ Avoid:
     - Meals made only from sauces/dressings
     - Meals with repeated items

  4. ✅ Do your best to create **at least 20** valid and unique meals.

  ---

  ### 📦 Return ONLY a valid JSON array like this:

  {
    "mealType": "Lunch",
    "restaurantName": "The Café",
    "items": [
      { "id": "item_id", "name": "Item Name", "calories": 123 }
    ]
  }

  ---

  ### 📄 Item Data:
  ${JSON.stringify(
    Object.entries(grouped).map(([key, items]) => {
      const [restaurantName, mealType] = key.split('::')
      return {
        restaurantName,
        mealType,
        items: items.map((i) => ({
          id: i._id,
          name: i.name,
          calories: i.nutrients.calories,
        })),
      }
    }),
    null,
    2
  )}
  `.trim()

        const aiRes = await processMealRecommendationsVariant(prompt)
        const aiResponse = aiRes?.responseText || ''
        const jsonStart = aiResponse.indexOf('[')
        const jsonEnd = aiResponse.lastIndexOf(']')
        const jsonOnly = aiResponse.slice(jsonStart, jsonEnd + 1)

        let combos = []

        try {
          combos = JSON.parse(jsonOnly)
        } catch (e) {
          console.error('❌ Failed to parse AI response as JSON:', e.message)
          console.error('⚠️ Raw AI response snippet:', aiResponse.slice(0, 500))
          continue // Skip this type and continue to next
        }

        const seenCombos = new Set()

        function isRealisticMeal(items = []) {
          if (!Array.isArray(items) || items.length < 2) return false

          const comboKey = items
            .map((i) => i?.itemId?.toString() || i?.id?.toString())
            .sort()
            .join('|')

          if (seenCombos.has(comboKey)) return false
          seenCombos.add(comboKey)

          const totalCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0)
          if (totalCalories < 250 || totalCalories > 1600) {
            console.warn('❌ Rejected: Calories out of bounds:', totalCalories)
            return false
          }

          const names = items.map((i) => i.name?.toLowerCase() || '')
          const onlyDressings = names.every((n) => /dressing|sauce/.test(n))
          if (onlyDressings) return false

          const breadCount = names.filter((n) => /bread|bun|naan|pita|biscuit/.test(n)).length
          if (breadCount > 2) return false

          return true
        }

        const validCombos = combos.filter((combo) => {
          const enrichedItems = combo.items
            .map((item) => items.find((m) => m._id.toString() === item.id?.toString()))
            .filter(Boolean) // filter out not found

          if (!enrichedItems.length || enrichedItems.length !== combo.items.length) {
            console.warn('❌ Skipping combo due to missing item matches')
            return false
          }

          // if (!isRealisticMeal(enrichedItems)) return false

          // Ensure restaurant consistency
          const first = enrichedItems[0]
          return enrichedItems.every((i) => i.restaurantName === first.restaurantName)
        })

        // Final payload
        const createdPayload = validCombos.map((combo) => {
          const enrichedItems = combo.items.map((item) => {
            const matched = items.find((m) => m._id?.toString() === item.id?.toString())
            if (!matched) {
              console.warn('❌ No match found for ID:', item.id)
            }
            return {
              itemId: item.id,
              name: matched?.name || item.name || 'Unknown',
              calories: matched?.nutrients?.calories || item.calories || 0,
              restaurantName: matched?.restaurantName || combo.restaurantName,
              restaurantType: matched?.restaurantType || 'Franchise',
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
            restaurantType: enrichedItems[0]?.restaurantType || 'Franchise',
            campus: enrichedItems[0]?.campus || [],
          }
        })

        const created = await GeneratedMeal.insertMany(createdPayload)
        allCreatedMeals.push(...created)
      }

      res.status(200).json({
        message: 'Meals generated successfully',
        count: allCreatedMeals.length,
        data: allCreatedMeals,
        skippedTypes: skippedRestaurantTypes,
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }),

  //? (3: 40Meals) seperate Franchise and Dining-Halls
  generateMealsTestingOld: asyncMiddleware(async (req, resOrParams) => {
    const isCron = !resOrParams || typeof resOrParams !== 'object' || !('status' in resOrParams)
    const input = isCron ? req : req.body
    const res = isCron ? { status: () => ({ json: () => {} }) } : resOrParams

    console.log(`🚀 Generating meals via ${isCron ? 'CRON' : 'HTTP API'} mode`)

    try {
      const { calorieRange = { min: 500, max: 1500 }, types = ['Breakfast', 'Lunch', 'Dinner'], campus } = input

      const defaultCampuses = ['HPU', 'UMD', 'UNCC']
      const campusList = campus?.length ? campus : defaultCampuses
      const restaurantTypes = ['Dining-Halls', 'Franchise']
      const allCreatedMeals = []
      const skippedRestaurantTypes = []

      for (const restType of restaurantTypes) {
        console.log(`🍽 Processing restaurantType: ${restType}`)

        const query = {
          'nutrients.calories': { $gt: 0 },
          type: { $in: types },
          campus: { $in: campusList },
          restaurantType: restType,
        }

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

        if (!rawItems.length) {
          console.warn(`⚠️ Skipping "${restType}" — no meals found`)
          skippedRestaurantTypes.push(restType)
          continue
        }

        // const items = rawItems.filter((item) => item.restaurantName && item.restaurantType)
        const items = rawItems.filter(
          (item) =>
            item.restaurantName &&
            item.restaurantType &&
            typeof item.nutrients?.calories === 'number' &&
            item.nutrients.calories > 100
        )
        // .map((item) => ({
        //   ...item,
        //   calories: item.nutrients.calories, // ✅ already filtered, so safe to access
        // }))

        const grouped = {}
        for (const item of items) {
          const key = `${item.restaurantName}::${item.type}`
          if (!grouped[key]) grouped[key] = []
          if (grouped[key].length < 25) grouped[key].push(item)
        }

        const prompt = `
  Below is a list of food items grouped by restaurant and meal type.

  🧠 Think like a **campus dietician** planning **20+ realistic, balanced student meals** for each restaurant.

  ---

  ### ✅ Meal Rules:

  1. Meals must:
     - Use items from only **one restaurant**
     - Match the given **mealType**
     - Stay within **${calorieRange.min}-${calorieRange.max} calories**
     - Include **2 to 4 items** with no duplicates

  2. 🍱 Include:
     - 1 main (e.g. chicken, patty, tofu, entrée)
     - 1 side (rice, bread, vegetables, pasta)
     - Optionally: 1 dessert, drink, or fruit

  3. ❌ Avoid:
     - Meals made only from sauces/dressings
     - Meals with repeated items

  4. ✅ Do your best to create **at least 20** valid and unique meals.

  ---

  ### 📦 Return ONLY a valid JSON array like this:

  {
    "mealType": "Lunch",
    "restaurantName": "The Café",
    "items": [
      { "id": "item_id", "name": "Item Name", "calories": 123 }
    ]
  }

  ---

  ### 📄 Item Data:
  ${JSON.stringify(
    Object.entries(grouped).map(([key, items]) => {
      const [restaurantName, mealType] = key.split('::')
      return {
        restaurantName,
        mealType,
        items: items.map((i) => ({
          id: i._id,
          name: i.name,
          calories: i.nutrients.calories,
        })),
      }
    }),
    null,
    2
  )}
  `.trim()

        const aiRes = await processMealRecommendationsVariant(prompt)
        const aiResponse = aiRes?.responseText || ''
        const jsonStart = aiResponse.indexOf('[')
        const jsonEnd = aiResponse.lastIndexOf(']')
        const jsonOnly = aiResponse.slice(jsonStart, jsonEnd + 1)

        let combos = []

        try {
          combos = JSON.parse(jsonOnly)
        } catch (e) {
          console.error('❌ Failed to parse AI response as JSON:', e.message)
          console.error('⚠️ Raw AI response snippet:', aiResponse.slice(0, 500))
          continue // Skip this type and continue to next
        }

        const seenCombos = new Set()

        function isRealisticMeal(items = []) {
          if (!Array.isArray(items) || items.length < 2) return false

          const comboKey = items
            .map((i) => i?.itemId?.toString() || i?.id?.toString())
            .sort()
            .join('|')

          if (seenCombos.has(comboKey)) return false
          seenCombos.add(comboKey)

          const totalCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0)
          if (totalCalories < 250 || totalCalories > 1600) {
            console.warn('❌ Rejected: Calories out of bounds:', totalCalories)
            return false
          }

          const names = items.map((i) => i.name?.toLowerCase() || '')
          const onlyDressings = names.every((n) => /dressing|sauce/.test(n))
          if (onlyDressings) return false

          const breadCount = names.filter((n) => /bread|bun|naan|pita|biscuit/.test(n)).length
          if (breadCount > 2) return false

          return true
        }

        const validCombos = combos.filter((combo) => {
          const enrichedItems = combo.items
            .map((item) => items.find((m) => m._id.toString() === item.id?.toString()))
            .filter(Boolean) // filter out not found

          if (!enrichedItems.length || enrichedItems.length !== combo.items.length) {
            console.warn('❌ Skipping combo due to missing item matches')
            return false
          }

          // if (!isRealisticMeal(enrichedItems)) return false

          // Ensure restaurant consistency
          const first = enrichedItems[0]
          return enrichedItems.every((i) => i.restaurantName === first.restaurantName)
        })

        // Final payload
        const createdPayload = validCombos.map((combo) => {
          const enrichedItems = combo.items.map((item) => {
            const matched = items.find((m) => m._id?.toString() === item.id?.toString())
            if (!matched) {
              console.warn('❌ No match found for ID:', item.id)
            }
            return {
              itemId: item.id,
              name: matched?.name || item.name || 'Unknown',
              calories: matched?.nutrients?.calories || item.calories || 0,
              restaurantName: matched?.restaurantName || combo.restaurantName,
              restaurantType: matched?.restaurantType || 'Franchise',
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
            restaurantType: enrichedItems[0]?.restaurantType || 'Franchise',
            campus: enrichedItems[0]?.campus || [],
          }
        })

        const created = await GeneratedMealNew.insertMany(createdPayload)
        allCreatedMeals.push(...created)
      }

      res.status(200).json({
        message: 'Meals generated successfully',
        count: allCreatedMeals.length,
        data: allCreatedMeals,
        skippedTypes: skippedRestaurantTypes,
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }),

  // USING GPT 5

  generateMeals: asyncMiddleware(async (req, resOrParams) => {
    const isCron = !resOrParams || typeof resOrParams !== 'object' || !('status' in resOrParams)
    const input = isCron ? req : req.body
    const res = isCron ? { status: () => ({ json: () => {} }) } : resOrParams

    console.log(`🚀 Generating meals via ${isCron ? 'CRON' : 'HTTP API'} mode`)

    try {
      const { calorieRange = { min: 500, max: 1500 }, types = ['Breakfast', 'Lunch', 'Dinner'], campus } = input

      const defaultCampuses = ['HPU', 'UMD', 'UNCC']
      const campusList = campus?.length ? campus : defaultCampuses
      const restaurantTypes = ['Dining-Halls', 'Franchise']
      const allCreatedMeals = []
      const skippedRestaurantTypes = []

      for (const restType of restaurantTypes) {
        console.log(`🍽 Processing restaurantType: ${restType}`)

        const query = {
          'nutrients.calories': { $gt: 0 },
          type: { $in: types },
          campus: { $in: campusList },
          restaurantType: restType,
        }

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

        if (!rawItems.length) {
          console.warn(`⚠️ Skipping "${restType}" — no meals found`)
          skippedRestaurantTypes.push(restType)
          continue
        }

        // const items = rawItems.filter((item) => item.restaurantName && item.restaurantType)
        const items = rawItems.filter(
          (item) =>
            item.restaurantName &&
            item.restaurantType &&
            typeof item.nutrients?.calories === 'number' &&
            item.nutrients.calories > 100
        )
        // .map((item) => ({
        //   ...item,
        //   calories: item.nutrients.calories, // ✅ already filtered, so safe to access
        // }))

        const grouped = {}
        for (const item of items) {
          const key = `${item.restaurantName}::${item.type}`
          if (!grouped[key]) grouped[key] = []
          if (grouped[key].length < 50) grouped[key].push(item)
        }

        const prompt = `
Below is a list of food items grouped by restaurant and meal type.

🧠 Think like a **campus dietician** creating **20+ realistic, balanced student meals** for each restaurant.

---

## ✅ Meal Creation Rules

1. **Restaurant & MealType**
   - Use items from **only ONE restaurant**.
   - Match the given **mealType** exactly.
   - Meals must be **unique** — do not repeat the exact same set of items.

2. **Calories**
   - Total calories must be **between ${calorieRange.min} and ${calorieRange.max}**.
   - Reject meals below the minimum or above the maximum.

3. **Items per Meal**
   - Include **2 to 4 items**.
   - Never repeat the same item in a meal.
   - Include **exactly one "main"** (e.g. chicken, patty, tofu, entrée, sandwich, wrap, burger, fish).
   - Include **at least one "side"** (e.g. rice, bread, vegetables, pasta, potatoes, salad).
   - Optionally add **1 dessert OR 1 drink OR 1 fruit** (never more than one of these).
   - Never use **only drinks**, **only desserts**, or **only sauces/toppings**.

4. **MealType-specific restrictions**
   - **Breakfast**: Only use breakfast-appropriate items (e.g. eggs, waffles, toast, cereal, oatmeal, yogurt, breakfast meats).
   - **Lunch/Dinner**: Never include breakfast-only items like: hash browns, waffles, granola, muffins, cereals, pancakes, french toast.
   - **Dinner**: Avoid all-sugar or all-cold meals (e.g. soda + dessert + fruit).
   
5. **Composition Variety**
   - No meals that are entirely fried items.
   - Avoid heavy duplication in flavor/ingredient (e.g. "Avocado" + "Avocado Toast").
   - Avoid more than **2 bread-based items**.
   - Avoid combos where all items are in the same category (e.g. all drinks, all sides).

6. **Never create meals with:**
   - Only sauces, dressings, condiments, or toppings.
   - Any item labeled “topping”, “sauce”, “spread”, or “dressing” as the only items.
   - Any item combination from the list below:

   **Banned Combos (or anything similar):**
   - "Cage-Free Eggs" + "Diced Fried Potatoes"
   - "Egg Whites" + "Hash Brown Potato Patty" + "Pineapple"
   - "Avocado Toast" + "Cantaloupe"
   - "Pineapple" + "Eggs" + "Steamed Potatoes"
   - "Waffle" + "Avocado" + "Honeydew"
   - "French Toast" + "Syrup" + "Brown Sugar"
   - "Belgian Waffle" + "Whipped Topping" + "Cinnamon Sugar"
   - "Hash Browns" + "Assorted Bagels" + "Egg Whites"
   - "Bacon Pieces" + "Eggs" + "Steamed Potatoes"
   - "Berry Parfait" + "Avocado Spread" + "Strawberry Lemonade"
   - "Granola" + "Topping" + "Milk"
   - "Smoothie" + "Smoothie Snacks"
   - "Muffin" + "Caffe Latte" + "Croissant"

---

## 📦 Output format:
Return ONLY a **valid JSON array**. Each element should have:

{
  "mealType": "Lunch",
  "restaurantName": "The Café",
  "items": [
    { "id": "item_id", "name": "Item Name", "calories": 123 }
  ]
}

---

## 📄 Item Data:
${JSON.stringify(
  Object.entries(grouped).map(([key, items]) => {
    const [restaurantName, mealType] = key.split('::')
    return {
      restaurantName,
      mealType,
      items: items.map((i) => ({
        id: i._id,
        name: i.name,
        calories: i.nutrients.calories,
      })),
    }
  }),
  null,
  2
)}
`.trim()

        const aiRes = await processMealRecommendationsVariant(prompt)
        const aiResponse = aiRes?.responseText || ''
        const jsonStart = aiResponse.indexOf('[')
        const jsonEnd = aiResponse.lastIndexOf(']')
        const jsonOnly = aiResponse.slice(jsonStart, jsonEnd + 1)

        let combos = []

        try {
          combos = JSON.parse(jsonOnly)
        } catch (e) {
          console.error('❌ Failed to parse AI response as JSON:', e.message)
          console.error('⚠️ Raw AI response snippet:', aiResponse.slice(0, 500))
          continue // Skip this type and continue to next
        }

        const seenCombos = new Set()

        function isRealisticMeal(items = []) {
          if (!Array.isArray(items) || items.length < 2) return false

          const comboKey = items
            .map((i) => i?.itemId?.toString() || i?.id?.toString())
            .sort()
            .join('|')

          if (seenCombos.has(comboKey)) return false
          seenCombos.add(comboKey)

          const totalCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0)
          if (totalCalories < 250 || totalCalories > 1600) {
            console.warn('❌ Rejected: Calories out of bounds:', totalCalories)
            return false
          }

          const names = items.map((i) => i.name?.toLowerCase() || '')
          const onlyDressings = names.every((n) => /dressing|sauce/.test(n))
          if (onlyDressings) return false

          const breadCount = names.filter((n) => /bread|bun|naan|pita|biscuit/.test(n)).length
          if (breadCount > 2) return false

          return true
        }

        const validCombos = combos.filter((combo) => {
          const enrichedItems = combo.items
            .map((item) => items.find((m) => m._id.toString() === item.id?.toString()))
            .filter(Boolean) // filter out not found

          if (!enrichedItems.length || enrichedItems.length !== combo.items.length) {
            console.warn('❌ Skipping combo due to missing item matches')
            return false
          }

          // if (!isRealisticMeal(enrichedItems)) return false

          // Ensure restaurant consistency
          const first = enrichedItems[0]
          return enrichedItems.every((i) => i.restaurantName === first.restaurantName)
        })

        // Final payload
        const createdPayload = validCombos.map((combo) => {
          const enrichedItems = combo.items.map((item) => {
            const matched = items.find((m) => m._id?.toString() === item.id?.toString())
            if (!matched) {
              console.warn('❌ No match found for ID:', item.id)
            }
            return {
              itemId: item.id,
              name: matched?.name || item.name || 'Unknown',
              calories: matched?.nutrients?.calories || item.calories || 0,
              restaurantName: matched?.restaurantName || combo.restaurantName,
              restaurantType: matched?.restaurantType || 'Franchise',
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
            restaurantType: enrichedItems[0]?.restaurantType || 'Franchise',
            campus: enrichedItems[0]?.campus || [],
          }
        })

        const created = await GeneratedMeal.insertMany(createdPayload)
        allCreatedMeals.push(...created)
      }

      res.status(200).json({
        message: 'Meals generated successfully',
        count: allCreatedMeals.length,
        data: allCreatedMeals,
        skippedTypes: skippedRestaurantTypes,
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }),

  generateMealsTesting: asyncMiddleware(async (req, resOrParams) => {
    const isCron = !resOrParams || typeof resOrParams !== 'object' || !('status' in resOrParams)
    const input = isCron ? req : req.body
    const res = isCron ? { status: () => ({ json: () => {} }) } : resOrParams

    console.log(`🚀 Generating meals via ${isCron ? 'CRON' : 'HTTP API'} mode`)

    try {
      const { calorieRange = { min: 500, max: 1500 }, types = ['Breakfast', 'Lunch', 'Dinner'], campus } = input

      const defaultCampuses = ['HPU', 'UMD', 'UNCC']
      const campusList = campus?.length ? campus : defaultCampuses
      const restaurantTypes = ['Dining-Halls', 'Franchise']
      const allCreatedMeals = []
      const skippedRestaurantTypes = []

      for (const restType of restaurantTypes) {
        console.log(`🍽 Processing restaurantType: ${restType}`)

        const query = {
          'nutrients.calories': { $gt: 0 },
          type: { $in: types },
          campus: { $in: campusList },
          restaurantType: restType,
        }

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

        if (!rawItems.length) {
          console.warn(`⚠️ Skipping "${restType}" — no meals found`)
          skippedRestaurantTypes.push(restType)
          continue
        }

        // const items = rawItems.filter((item) => item.restaurantName && item.restaurantType)
        const items = rawItems.filter(
          (item) =>
            item.restaurantName &&
            item.restaurantType &&
            typeof item.nutrients?.calories === 'number' &&
            item.nutrients.calories > 100
        )
        // .map((item) => ({
        //   ...item,
        //   calories: item.nutrients.calories, // ✅ already filtered, so safe to access
        // }))

        const grouped = {}
        for (const item of items) {
          const key = `${item.restaurantName}::${item.type}`
          if (!grouped[key]) grouped[key] = []
          if (grouped[key].length < 50) grouped[key].push(item)
        }

        const prompt = `
Below is a list of food items grouped by restaurant and meal type.

🧠 Think like a **campus dietician** creating **20+ realistic, balanced student meals** for each restaurant.

---

## ✅ Meal Creation Rules

1. **Restaurant & MealType**
   - Use items from **only ONE restaurant**.
   - Match the given **mealType** exactly.
   - Meals must be **unique** — do not repeat the exact same set of items.

2. **Calories**
   - Total calories must be **between ${calorieRange.min} and ${calorieRange.max}**.
   - Reject meals below the minimum or above the maximum.

3. **Items per Meal**
   - Include **2 to 4 items**.
   - Never repeat the same item in a meal.
   - Include **exactly one "main"** (e.g. chicken, patty, tofu, entrée, sandwich, wrap, burger, fish).
   - Include **at least one "side"** (e.g. rice, bread, vegetables, pasta, potatoes, salad).
   - Optionally add **1 dessert OR 1 drink OR 1 fruit** (never more than one of these).
   - Never use **only drinks**, **only desserts**, or **only sauces/toppings**.

4. **MealType-specific restrictions**
   - **Breakfast**: Only use breakfast-appropriate items (e.g. eggs, waffles, toast, cereal, oatmeal, yogurt, breakfast meats).
   - **Lunch/Dinner**: Never include breakfast-only items like: hash browns, waffles, granola, muffins, cereals, pancakes, french toast.
   - **Dinner**: Avoid all-sugar or all-cold meals (e.g. soda + dessert + fruit).
   
5. **Composition Variety**
   - No meals that are entirely fried items.
   - Avoid heavy duplication in flavor/ingredient (e.g. "Avocado" + "Avocado Toast").
   - Avoid more than **2 bread-based items**.
   - Avoid combos where all items are in the same category (e.g. all drinks, all sides).

6. **Never create meals with:**
   - Only sauces, dressings, condiments, or toppings.
   - Any item labeled “topping”, “sauce”, “spread”, or “dressing” as the only items.
   - Any item combination from the list below:

   **Banned Combos (or anything similar):**
   - "Cage-Free Eggs" + "Diced Fried Potatoes"
   - "Egg Whites" + "Hash Brown Potato Patty" + "Pineapple"
   - "Avocado Toast" + "Cantaloupe"
   - "Pineapple" + "Eggs" + "Steamed Potatoes"
   - "Waffle" + "Avocado" + "Honeydew"
   - "French Toast" + "Syrup" + "Brown Sugar"
   - "Belgian Waffle" + "Whipped Topping" + "Cinnamon Sugar"
   - "Hash Browns" + "Assorted Bagels" + "Egg Whites"
   - "Bacon Pieces" + "Eggs" + "Steamed Potatoes"
   - "Berry Parfait" + "Avocado Spread" + "Strawberry Lemonade"
   - "Granola" + "Topping" + "Milk"
   - "Smoothie" + "Smoothie Snacks"
   - "Muffin" + "Caffe Latte" + "Croissant"

---

## 📦 Output format:
Return ONLY a **valid JSON array**. Each element should have:

{
  "mealType": "Lunch",
  "restaurantName": "The Café",
  "items": [
    { "id": "item_id", "name": "Item Name", "calories": 123 }
  ]
}

---

## 📄 Item Data:
${JSON.stringify(
  Object.entries(grouped).map(([key, items]) => {
    const [restaurantName, mealType] = key.split('::')
    return {
      restaurantName,
      mealType,
      items: items.map((i) => ({
        id: i._id,
        name: i.name,
        calories: i.nutrients.calories,
      })),
    }
  }),
  null,
  2
)}
`.trim()

        const aiRes = await processMealRecommendationsVariant(prompt)
        const aiResponse = aiRes?.responseText || ''
        const jsonStart = aiResponse.indexOf('[')
        const jsonEnd = aiResponse.lastIndexOf(']')
        const jsonOnly = aiResponse.slice(jsonStart, jsonEnd + 1)

        let combos = []

        try {
          combos = JSON.parse(jsonOnly)
        } catch (e) {
          console.error('❌ Failed to parse AI response as JSON:', e.message)
          console.error('⚠️ Raw AI response snippet:', aiResponse.slice(0, 500))
          continue // Skip this type and continue to next
        }

        const seenCombos = new Set()

        function isRealisticMeal(items = []) {
          if (!Array.isArray(items) || items.length < 2) return false

          const comboKey = items
            .map((i) => i?.itemId?.toString() || i?.id?.toString())
            .sort()
            .join('|')

          if (seenCombos.has(comboKey)) return false
          seenCombos.add(comboKey)

          const totalCalories = items.reduce((sum, i) => sum + (i.calories || 0), 0)
          if (totalCalories < 250 || totalCalories > 1600) {
            console.warn('❌ Rejected: Calories out of bounds:', totalCalories)
            return false
          }

          const names = items.map((i) => i.name?.toLowerCase() || '')
          const onlyDressings = names.every((n) => /dressing|sauce/.test(n))
          if (onlyDressings) return false

          const breadCount = names.filter((n) => /bread|bun|naan|pita|biscuit/.test(n)).length
          if (breadCount > 2) return false

          return true
        }

        const validCombos = combos.filter((combo) => {
          const enrichedItems = combo.items
            .map((item) => items.find((m) => m._id.toString() === item.id?.toString()))
            .filter(Boolean) // filter out not found

          if (!enrichedItems.length || enrichedItems.length !== combo.items.length) {
            console.warn('❌ Skipping combo due to missing item matches')
            return false
          }

          // if (!isRealisticMeal(enrichedItems)) return false

          // Ensure restaurant consistency
          const first = enrichedItems[0]
          return enrichedItems.every((i) => i.restaurantName === first.restaurantName)
        })

        // Final payload
        const createdPayload = validCombos.map((combo) => {
          const enrichedItems = combo.items.map((item) => {
            const matched = items.find((m) => m._id?.toString() === item.id?.toString())
            if (!matched) {
              console.warn('❌ No match found for ID:', item.id)
            }
            return {
              itemId: item.id,
              name: matched?.name || item.name || 'Unknown',
              calories: matched?.nutrients?.calories || item.calories || 0,
              restaurantName: matched?.restaurantName || combo.restaurantName,
              restaurantType: matched?.restaurantType || 'Franchise',
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
            restaurantType: enrichedItems[0]?.restaurantType || 'Franchise',
            campus: enrichedItems[0]?.campus || [],
          }
        })

        const created = await GeneratedMealNew.insertMany(createdPayload)
        allCreatedMeals.push(...created)
      }

      res.status(200).json({
        message: 'Meals generated successfully',
        count: allCreatedMeals.length,
        data: allCreatedMeals,
        skippedTypes: skippedRestaurantTypes,
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }),

  //? This is the manual version that can be triggered via HTTP API
  generateMealsManually: asyncMiddleware(async (req, res) => {
    try {
      await runMealGenerationManually()
      res.json({ success: true, message: 'Manual meal generation completed' })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  }),
}
//? 1st version
//       const prompt = `
// You are a meal planner assistant.

// Below is a list of food items grouped by restaurant and type. Generate as many realistic meal **combinations** as possible.

// ### Rules:
// - All items in a combination must be:
//   - From the **same restaurant**
//   - Of the **same meal type** (Breakfast, Lunch, Dinner)
//   - Between **${calorieRange.min}-${calorieRange.max} calories**
//   - Not repeat the same item within a combination
//   - A unique set (no duplicates)

// ### Output Format:
// [
//   {
//     "mealType": "Breakfast",
//     "restaurantName": "Example Hall",
//     "restaurantType": "Dining-Halls",
//     "items": [
//       { "id": "item_id", "calories": 123 }
//     ]
//   }
// ]

// ### Food Data:
// ${JSON.stringify(
//   Object.entries(grouped).map(([key, groupItems]) => {
//     const [restaurantName, restaurantType, mealType] = key.split('::')
//     return {
//       restaurantName,
//       restaurantType,
//       mealType,
//       items: groupItems.map((i) => ({
//         id: i._id,
//         calories: i.nutrients.calories,
//       })),
//     }
//   }),
//   null,
//   2
// )}
//     `.trim()

//? 2nd "WORKING VERSION"
// const prompt = `
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

// ? 3rd version
// const prompt = `
// Below is a list of food items, grouped by restaurant and type. Your job is to generate as many **realistic meal combinations** as possible that meet the following criteria:

// - Each combination must:
//   - Contain a **main item** (e.g., entree, sandwich, burger, pizza slice, rice bowl, etc.)
//   - Optionally include **1–2 sides** (e.g., fries, salad, fruits, desserts) and/or **1 drink**
//   - Avoid combinations that consist of only drinks, only sides, or duplicates of the same item
//   - Be made from items **from the same restaurant**
//   - Match the meal type: **Breakfast**, **Lunch**, or **Dinner**
//   - Have **total calories** between ${calorieRange.min} and ${calorieRange.max}
//   - Be a **unique set of items** (do not generate duplicate combinations with the same items)
//   - A single item **must not appear twice** in the same combination
//   - The same item **can** appear in multiple different combinations

// - If there are no valid combinations that include a main item, **do not generate a meal** for that restaurant.

// Return ONLY a valid JSON array in the following format:

// [
//   {
//     "mealType": "Lunch",
//     "restaurantName": "Sample Restaurant",
//     "restaurantType": "Dining-Halls",
//     "items": [
//       { "id": "item_id", "name": "Item Name", "calories": 123 }
//     ]
//   }
// ]

// Here is the data:
// ${JSON.stringify(
//   Object.entries(grouped).map(([key, items]) => {
//     const [restaurantName, restaurantType, mealType] = key.split('::')
//     return {
//       restaurantName,
//       restaurantType,
//       mealType,
//       items: items.map((i) => ({
//         id: i._id,
//         calories: i.nutrients.calories,
//       })),
//     }
//   }),
//   null,
//   2
// )}
// `.trim()
