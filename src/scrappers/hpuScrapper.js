import { get } from 'axios'
import { load } from 'cheerio'
import { Meals, Restaurants } from '../models'

// Utility function to clean and extract valid meal types
const extractMealTypes = (tabItems) => {
  const mealTypes = new Set()
  const nonRelevantPatterns = /\b(hours?|operation)\b/i
  const mealTypePattern = /(Breakfast|Lunch|Dinner)/i

  tabItems.forEach((item) => {
    if (nonRelevantPatterns.test(item)) {
      mealTypes.add(item)
    } else {
      const matchedMeals = item.match(mealTypePattern)
      if (matchedMeals) {
        matchedMeals.forEach((meal) => mealTypes.add(meal))
      }
    }
  })
  return Array.from(mealTypes)
}

export const scrapeHPU = async () => {
  const urls = [
    'https://dining.highpoint.edu/locations/purple-pie/',
    'https://dining.highpoint.edu/locations/the-cafe/',
    'https://dining.highpoint.edu/locations/the-farmers-market/',
    'https://dining.highpoint.edu/locations/great-day-bakery/',
    'https://dining.highpoint.edu/locations/144/',
    'https://dining.highpoint.edu/locations/butterfly-cafe/',
    'https://dining.highpoint.edu/locations/point-sports-grille/',
    'https://dining.highpoint.edu/locations/the-grille-at-the-village/',
  ]

  const allData = []

  for (const url of urls) {
    console.log(`Processing HPU URL: ${url}`)
    try {
      const { data: html } = await get(url)
      const $ = load(html)

      const restaurantName = $('#location-header-content h1').text().trim()
      const campus = 'HPU'
      const category = 'Dining Halls'

      const rawTabItems = []
      $('.c-tabs-nav__link-inner').each((_, element) => {
        const tabItem = $(element).text().trim()
        rawTabItems.push(tabItem)
      })

      const mealTypes = extractMealTypes(rawTabItems)

      const menu = []

      $('.c-tab').each((index, element) => {
        const mealType = mealTypes[index] || `Unknown Meal Type ${index}`

        $(element)
          .find('.menu-station')
          .each((_, station) => {
            let mealCategory = ''
            let mealCategoryItems = []

            $(station)
              .find('.toggle-menu-station-data')
              .each((_, el) => {
                mealCategory = $(el).text().trim()
              })

            $(station)
              .find('.menu-item-li')
              .each(async (_, subElement) => {
                try {
                  const rawData = $(subElement).find('[id^="recipe-nutrition-"]').text()

                  if (!rawData) return

                  let parsedData
                  try {
                    parsedData = JSON.parse(rawData)
                  } catch (err) {
                    console.error(`Malformed JSON: ${rawData}`)
                    return
                  }

                  const dieteryPreferences = []
                  $(subElement)
                    .find('.recipe-icon-wrap')
                    .each((_, iconElement) => {
                      const iconTitle = $(iconElement).attr('title') || $(iconElement).text().trim()
                      if (iconTitle) dieteryPreferences.push(iconTitle)
                    })

                  // Create or update the meal
                  const meal = await Meals.findOneAndUpdate(
                    { name: parsedData.name, type: mealType },
                    {
                      $set: {
                        calories: parsedData.facts.find((f) => f.label === 'Calories')?.value || 0,
                        protein: parsedData.facts.find((f) => f.label === 'Protein')?.value || 0,
                        fat: parsedData.facts.find((f) => f.label === 'Total Fat')?.value || 0,
                        carbohydrate: parsedData.facts.find((f) => f.label === 'Total Carbohydrate')?.value || 0,
                        serving: parsedData.serving_size || '',
                        allergens: parsedData.allergens_list || '',
                        ingredients: parsedData.ingredients_list || '',
                        dieteryPreferences,
                      },
                    },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                  )

                  mealCategoryItems.push(meal._id) // Add meal ID to the list
                } catch (err) {
                  console.error('Error processing menu item:', err)
                }
              })

            menu.push({
              mealCategory,
              mealCategoryItems,
            })
          })
      })

      // Create or update the restaurant
      await Restaurants.findOneAndUpdate(
        { name: restaurantName }, // Match by restaurant name
        {
          $set: {
            campus,
            category,
            menu, // Replace menu with the newly scraped data
            tabItems: mealTypes,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )

      allData.push({
        restaurant: restaurantName,
        campus,
        category,
        menu,
        tabItems: mealTypes,
      })
    } catch (error) {
      console.error(`Error processing HPU URL ${url}:`, error)
    }
  }

  return allData
}
