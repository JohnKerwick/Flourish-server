import { get } from 'axios'
import { load } from 'cheerio'
import { Meals, Restaurants } from '../models'

export const scrapeUMD = async () => {
  const urls = ['51', '19', '16']
  const allData = []

  for (const url of urls) {
    console.log(`Scraping data for location ${url}...`)

    const mainPageResponse = await get(`https://nutrition.umd.edu/?locationNum=${url}`)
    const $ = load(mainPageResponse.data)

    const selectedOption = $('#location-select-menu option').filter(function () {
      return $(this).val() === `${url}`
    })
    const restaurantName = selectedOption.text().trim()
    console.log('Selected Restaurant:', restaurantName)

    const campus = 'UMD'
    const category = 'Dining Halls'

    const mealTypes = []
    $('.nav-link').each((_, element) => {
      mealTypes.push({
        name: $(element).text().trim(),
        isActive: $(element).hasClass('active'),
      })
    })

    const menuItems = []

    // Extract categories and their corresponding meals
    $('.tab-pane.fade').each((index, element) => {
      const mealType = mealTypes[index] ? mealTypes[index].name : 'Unknown'

      $(element)
        .find('.card-title')
        .each((_, titleElement) => {
          const category = $(titleElement).text().trim()
          const items = []

          $(titleElement)
            .closest('.card')
            .find('.menu-item-row')
            .each((_, rowElement) => {
              const mealName = $(rowElement).find('.menu-item-name').text().trim()
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
                mealType,
                detailsUrl,
                dieteryPreferences,
              })
            })

          menuItems.push({
            category,
            items,
          })
        })
    })

    // Process detailed nutritional info for each meal and save/update in the database
    const menu = []
    for (const category of menuItems) {
      const categoryWithDetails = { ...category }
      categoryWithDetails.items = []

      for (const item of category.items) {
        const detailsResponse = await get(`https://nutrition.umd.edu/${item.detailsUrl}`)
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
        const calories = caloriesMatch ? parseFloat(caloriesMatch[1]) : 0
        const fat = fatMatch ? parseFloat(fatMatch[1]) : 0
        const carbohydrate = carbMatch ? parseFloat(carbMatch[1]) : 0
        const protein = proteinMatch ? parseFloat(proteinMatch[1]) : 0
        const ingredients = detailsPage('.labelingredientsvalue').text().trim().split(/,\s*/)
        const allergens = detailsPage('.labelallergensvalue').text().trim().split(/,\s*/)

        // Find and update meal if it already exists, or insert it
        const meal = await Meals.findOneAndUpdate(
          { name: item.mealName, type: item.mealType }, // Match condition
          {
            $set: {
              ingredients,
              allergens,
              dieteryPreferences: item.dieteryPreferences,
              serving: servingSize,
              nutrients: {
                calories,
                protein,
                carbohydrate,
                fat,
              },
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        )

        categoryWithDetails.items.push(meal._id)
      }

      menu.push(categoryWithDetails)
    }

    // Find and update the restaurant if it already exists, or create a new one
    await Restaurants.findOneAndUpdate(
      { name: restaurantName }, // Match condition
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
