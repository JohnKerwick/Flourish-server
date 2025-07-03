import { get } from 'axios'
import { load } from 'cheerio'
import { Meals, Restaurants } from '../models'
import delay from '../utils/delay'

const extractMealTypes = (tabItems) => {
  const mealTypes = new Set()
  const mealTypePattern = /(Breakfast|Lunch|Dinner)/i
  const timePattern = /(\d{1,2})(am|pm)\s*-\s*(\d{1,2})(am|pm)/i

  tabItems.forEach((item) => {
    const matchedMeals = item.match(mealTypePattern)
    if (matchedMeals) {
      matchedMeals.forEach((meal) => mealTypes.add(meal))
    } else {
      const matchedTime = item.match(timePattern)
      if (matchedTime) {
        let startHour = parseInt(matchedTime[1])
        const startPeriod = matchedTime[2].toLowerCase()
        if (startPeriod === 'pm' && startHour !== 12) startHour += 12

        if (startHour < 11) {
          mealTypes.add('Breakfast')
        } else if (startHour < 16) {
          mealTypes.add('Lunch')
        } else {
          mealTypes.add('Dinner')
        }
      } else {
        mealTypes.add('Breakfast') // Default to Breakfast if nothing is matched
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

  const specialFranchises = new Set(['Purple Pie', 'The Great Day Bakery', 'Butterfly Cafe', 'The Point Sports Grille'])
  const allData = []

  for (const url of urls) {
    console.log(`Processing HPU URL: ${url}`)
    try {
      const { data: html } = await get(url)
      const $ = load(html)

      const restaurantName = $('#location-header-content h1').text().trim()
      const campus = ['HPU']
      const category = specialFranchises.has(restaurantName) ? 'Franchise' : 'Dining-Halls'

      // Extract meal types
      const rawTabItems = []
      $('.c-tabs-nav__link-inner').each((_, element) => {
        rawTabItems.push($(element).text().trim())
      })

      const mealTypes = extractMealTypes(rawTabItems)

      const mealPromises = $('.c-tab')
        .map((index, element) =>
          (async () => {
            const mealType = mealTypes[index] || `Unknown Meal Type ${index}`
            let menu = []

            const stationPromises = $(element)
              .find('.menu-station')
              .map((_, station) =>
                (async () => {
                  let stationCategory = ''
                  let mealItemPromises = []

                  $(station)
                    .find('.toggle-menu-station-data')
                    .each((_, el) => {
                      stationCategory = $(el).text().trim()
                    })

                  $(station)
                    .find('.menu-item-li')
                    .each((_, subElement) => {
                      mealItemPromises.push(
                        (async () => {
                          try {
                            const rawData = $(subElement).find('[id^="recipe-nutrition-"]').text()
                            if (!rawData) return null

                            let parsedData
                            try {
                              parsedData = JSON.parse(rawData)
                            } catch (err) {
                              console.error(`Malformed JSON: ${rawData}`)
                              return null
                            }

                            const dieteryPreferences = []
                            $(subElement)
                              .find('.recipe-icon-wrap')
                              .each((_, iconElement) => {
                                const iconTitle = $(iconElement).attr('title') || $(iconElement).text().trim()
                                if (iconTitle) dieteryPreferences.push(iconTitle)
                              })

                            const meal = await Meals.findOneAndUpdate(
                              { name: parsedData.name, type: mealType },
                              {
                                $set: {
                                  restaurantName: restaurantName,
                                  restaurantType: 'Dining-Halls',

                                  campus: campus,

                                  nutrients: {
                                    calories: (
                                      parsedData.facts.find((f) => f.label === 'Calories')?.value || 0
                                    ).toFixed(2),
                                    protein: (parsedData.facts.find((f) => f.label === 'Protein')?.value || 0).toFixed(
                                      2
                                    ),
                                    fat: (parsedData.facts.find((f) => f.label === 'Total Fat')?.value || 0).toFixed(2),
                                    carbohydrate: (
                                      parsedData.facts.find((f) => f.label === 'Total Carbohydrate')?.value || 0
                                    ).toFixed(2),
                                  },
                                  serving: parsedData.serving_size || '',
                                  allergens: parsedData.allergens_list || '',
                                  ingredients: parsedData.ingredients_list || '',
                                  dieteryPreferences,
                                },
                              },
                              { new: true, upsert: true, setDefaultsOnInsert: true }
                            )

                            return meal?._id || null
                          } catch (err) {
                            console.error('Error processing menu item:', err)
                            return null
                          }
                        })()
                      )
                    })

                  const resolvedItems = (await Promise.all(mealItemPromises)).filter(Boolean)

                  menu.push({
                    category: stationCategory,
                    items: resolvedItems,
                  })
                })()
              )
              .get()

            await Promise.all(stationPromises)
            return { mealType, menu }
          })()
        )
        .get()

      const resolvedMenus = await Promise.all(mealPromises)
      const finalMenu = resolvedMenus.flatMap(({ menu }) => menu)

      await Restaurants.findOneAndUpdate(
        { name: restaurantName },
        {
          $set: {
            campus,
            category,
            menu: finalMenu,
            tabItems: mealTypes,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      allData.push({ restaurant: restaurantName, campus, category, menu: finalMenu, tabItems: mealTypes })
    } catch (error) {
      console.error(`Error processing HPU URL ${url}:`, error)
    }
  }

  // ✅ Return allData without pushing to DB
  return allData
}
