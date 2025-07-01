import { get } from 'axios'
import { load } from 'cheerio'
import { Meals, Restaurants } from '../models'
import { delay, randomDelay } from '../utils/delay'

// Function to fetch with retries
const fetchWithRetry = async (url, options = {}, maxRetries = 3, delayMs = 2000) => {
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      const response = await get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        ...options,
      })
      return response
    } catch (error) {
      attempt++
      if (attempt >= maxRetries) {
        console.error(`Failed to fetch ${url} after ${maxRetries} attempts`, error.message)
        throw error // Stop retrying after max attempts
      }
      console.warn(`Retrying ${url} (Attempt ${attempt}/${maxRetries})...`)
      await delay(delayMs * Math.pow(2, attempt)) // Exponential backoff
    }
  }
}

export const scrapeUMD = async () => {
  const urls = ['16', '51', '19']
  const allData = []

  for (const url of urls) {
    console.log(`Scraping data for location ${url}...`)

    const mainPageResponse = await fetchWithRetry(`https://nutrition.umd.edu/?locationNum=${url}`)
    const $ = load(mainPageResponse.data)

    const selectedOption = $('#location-select-menu option').filter(function () {
      return $(this).val() === `${url}`
    })
    const restaurantName = selectedOption.text().trim()
    console.log('Selected Restaurant:', restaurantName)

    const campus = ['UMD']
    const category = 'Dining-Halls'

    const mealTypes = []
    $('.nav-link').each((_, element) => {
      mealTypes.push({
        name: $(element).text().trim(),
        isActive: $(element).hasClass('active'),
      })
    })

    const menuItems = []
    const seenMeals = new Set()
    $('.tab-pane.fade').each((index, element) => {
      const mealType = mealTypes[index] ? mealTypes[index].name : 'Unknown'
      $(element)
        .find('.card-title')
        .each((_, titleElement) => {
          const category = $(titleElement).text().trim()
          const items = []

          console.log(`Processing category: ${category}`)

          $(titleElement)
            .closest('.card')
            .find('.menu-item-row')
            .each((_, rowElement) => {
              const mealName = $(rowElement).find('.menu-item-name').text().trim()

              if (seenMeals.has(mealName)) {
                return // Skip duplicate
              }

              // Otherwise, add meal to seenMeals and process it
              seenMeals.add(mealName)

              const detailsUrl = $(rowElement).find('.menu-item-name').attr('href')
              const dieteryPreferences = []

              $(rowElement)
                .find('.nutri-icon')
                .each((_, iconElement) => {
                  const iconTitle = $(iconElement).attr('title')
                  if (iconTitle) dieteryPreferences.push(iconTitle)
                })

              items.push({
                mealName,
                mealType, // Ensure this variable is defined elsewhere
                detailsUrl,
                dieteryPreferences,
              })
            })

          if (items.length > 0) {
            menuItems.push({ category, items })
          }
        })
    })

    // Process detailed nutritional info for each meal and save/update in the database
    const menu = []
    for (const category of menuItems) {
      const categoryWithDetails = { ...category }
      categoryWithDetails.items = []

      for (const item of category.items) {
        try {
          const detailsResponse = await fetchWithRetry(`https://nutrition.umd.edu/${item.detailsUrl}`)
          const detailsPage = load(detailsResponse.data)
          const detailsText = detailsPage('.nutfactstopnutrient').text()

          const fatMatch = detailsText.match(/Total Fat\s([\d.]+)g/i)
          const carbMatch = detailsText.match(/Total Carbohydrate\.\s([\d.]+)g/i)
          const caloriesMatch = detailsText.match(/Calories\s([\d.]+)kcal/i)
          const proteinMatch = detailsText.match(/Protein\s([\d.]+)g/i)
          const servingSize = detailsPage('.nutfactsservsize')
            .text()
            .trim()
            .replace(/Serving size\s*/i, '')
          const calories = caloriesMatch ? parseFloat(parseFloat(caloriesMatch[1]).toFixed(2)) : 0
          const fat = fatMatch ? parseFloat(parseFloat(fatMatch[1]).toFixed(2)) : 0
          const carbohydrate = carbMatch ? parseFloat(parseFloat(carbMatch[1]).toFixed(2)) : 0
          const protein = proteinMatch ? parseFloat(parseFloat(proteinMatch[1]).toFixed(2)) : 0

          const ingredients = detailsPage('.labelingredientsvalue').text().trim().split(/,\s*/)
          const allergens = detailsPage('.labelallergensvalue').text().trim().split(/,\s*/)

          // Find and update meal if it already exists, or insert it
          const meal = await Meals.findOneAndUpdate(
            { name: item.mealName, type: item.mealType },
            {
              $set: {
                restaurantName: restaurantName,
                campus: campus,
                ingredients,
                allergens,
                dieteryPreferences: item.dieteryPreferences,
                serving: servingSize,
                restaurantType: 'Dining-Halls',

                nutrients: { calories, protein, carbohydrate, fat },
              },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          )
          console.log(item)
          categoryWithDetails.items.push(meal._id)
        } catch (error) {
          console.error(`Skipping meal ${item.mealName} due to fetch failure.`)
        }
      }

      menu.push(categoryWithDetails)
    }

    // Find and update the restaurant if it already exists, or create a new one
    await Restaurants.findOneAndUpdate(
      { name: restaurantName },
      {
        $set: {
          campus,
          category,
          tabItems: mealTypes.map((type) => type.name),
          menu,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    allData.push({
      restaurant: restaurantName,
      campus,
      category,
      menu,
      tabItems: mealTypes.map((type) => type.name),
    })
  }

  return allData
}
