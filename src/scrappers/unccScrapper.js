import axios from 'axios'
import { Agent } from 'https'
import { delay, randomDelay } from '../utils/delay'
import { notifyError } from '../middlewares/errorHandler'
import { Meals, Restaurants } from '../models' // Import models

export const scrapeUNCC = async () => {
  const locations = [
    { id: '587124593191a200db4e68af', name: 'SoVi' },
    { id: '58711fef3191a200e44e67a1', name: 'Social 704' },
  ]

  const today = new Date()
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  console.log('formattedDate', formattedDate)

  const retryOn526Error = async () => {
    let response
    do {
      try {
        console.log('Retrying public API...')
        response = await axios.get('https://api.dineoncampus.com/v1/sites/public')
      } catch (error) {
        console.error('Error during public API retry:', error.message)
        await delay(1000) // Delay before retrying
      }
    } while (!response || response.status !== 200)

    console.log('Public API returned 200, resuming scraping...')
  }

  const allLocationsData = [] // Collect data for all locations

  for (const location of locations) {
    let locationData = {
      restaurant: location.name,
      campus: 'UNCC',
      category: 'Dining Halls',
      menu: [], // Combined menu data
      tabItems: [], // Period names
    }

    while (true) {
      try {
        console.log(`Processing location: ${location.name}`)
        const config = {
          method: 'get',
          url: `https://api.dineoncampus.com/v1/location/${location.id}/periods?platform=0&date=${formattedDate}`,
          httpsAgent: new Agent({ rejectUnauthorized: false }),
        }

        const { data } = await axios(config)
        const periods = data.periods

        for (const period of periods) {
          while (true) {
            try {
              await delay(randomDelay())

              const periodConfig = {
                method: 'get',
                url: `https://api.dineoncampus.com/v1/location/${location.id}/periods/${period.id}?platform=0&date=${formattedDate}`,
                httpsAgent: new Agent({ rejectUnauthorized: false }),
              }

              const { data: periodData } = await axios(periodConfig)
              const categories = periodData.menu.periods.categories

              // Process menu data for this period
              const periodMenu = await Promise.all(
                categories.map(async (category) => {
                  const mealCategoryItems = await Promise.all(
                    category.items.map(async (item) => {
                      try {
                        // Use findOneAndUpdate to update or insert meals
                        const updatedMeal = await Meals.findOneAndUpdate(
                          { name: item.name, type: periodData.menu.periods.name }, // Match condition
                          {
                            $set: {
                              ingredients: item.ingredients ? item.ingredients.split(',').map((i) => i.trim()) : [],
                              allergens: item.filters.filter((f) => f.type === 'allergen').map((f) => f.name),
                              dieteryPreferences: item.filters.filter((f) => f.type === 'label').map((f) => f.name),
                              nutrients: {
                                calories: item.nutrients.find((f) => f.name === 'Calories')?.value_numeric || 0,
                                protein: item.nutrients.find((f) => f.name === 'Protein (g)')?.value_numeric || 0,
                                fat: item.nutrients.find((f) => f.name === 'Total Fat (g)')?.value_numeric || 0,
                                carbohydrate:
                                  item.nutrients.find((f) => f.name === 'Total Carbohydrates (g)')?.value_numeric || 0,
                              },
                              serving: item.portion || '',
                            },
                          },
                          { new: true, upsert: true, setDefaultsOnInsert: true }
                        )

                        return updatedMeal._id // Return meal ID
                      } catch (err) {
                        console.error('Error processing meal item:', err)
                        return null
                      }
                    })
                  )

                  return {
                    category: category.name,
                    items: mealCategoryItems.filter((item) => item !== null), // Filter out null entries
                  }
                })
              )

              // Append data
              locationData.menu.push(...periodMenu)
              locationData.tabItems.push(periodData.menu.periods.name)

              break // Exit retry loop for this period
            } catch (error) {
              if (error.response && error.response.status === 526) {
                console.error('Error 526 encountered. Retrying with public API...')
                await retryOn526Error()
              } else {
                console.error('Error scraping period data:', error)
                notifyError(error)
                break
              }
            }
          }
        }

        // Use findOneAndUpdate to update or insert restaurants
        await Restaurants.findOneAndUpdate(
          { name: location.name }, // Match condition
          {
            $set: {
              campus: 'UNCC',
              category: 'Dining Halls',
              menu: locationData.menu,
              tabItems: locationData.tabItems,
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        )

        allLocationsData.push(locationData)
        break // Exit retry loop for this location
      } catch (error) {
        if (error.response && error.response.status === 526) {
          console.error('Error 526 encountered for location. Retrying...')
          await retryOn526Error()
        } else {
          console.error(`Error scraping location ${location.name}:`, error)
          notifyError(error)
          break
        }
      }
    }
  }

  return allLocationsData
}
