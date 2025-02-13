const puppeteer = require('puppeteer')
const fs = require('fs')
const { log } = require('console')
const { allBrands } = require('./src/utils/data')
const axios = require('axios')

const currentScrape = {
  name: "Auntie Anne's",
}

const currentBrand = allBrands.find((brand) => brand.name === currentScrape.name)
const currentId = currentBrand.id
// Function to create a delay
function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}
async function tryAction(action, retries = 3, delayTime = 2000) {
  let attempts = 0
  while (attempts < retries) {
    try {
      return await action()
    } catch (error) {
      attempts++
      console.error(`Attempt ${attempts} failed: ${error.message}`)
      if (attempts < retries) {
        console.log(`Retrying in ${delayTime / 1000} seconds...`)
        await delay(delayTime)
      } else {
        throw new Error(`Failed after ${retries} attempts: ${error.message}`)
      }
    }
  }
}

async function scrapeData(req, res) {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  let arr = []

  try {
    const brandId = currentId
    const apiUrl = `https://www.nutritionix.com/nixapi/brands/${brandId}/items/1?limit=3900`

    // Fetch data from the API
    const response = await axios.get(apiUrl)
    const items = response.data.items

    let processedItems = 0
    for (let index = 0; index < items.length; index++) {
      const element = items[index]
      let name = element.item_name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      let url = `https://www.nutritionix.com/i/${currentScrape.name}/${name}/${element.item_id}`

      try {
        await tryAction(() => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }), 3, 3000) // Retry page.goto up to 3 times with 3 seconds delay

        // Extract product name
        let productName = 'not-found'
        productName = await tryAction(
          async () => {
            await page.waitForSelector('h1', { timeout: 60000 })
            return page.$eval('h1', (el) => el.innerText.trim())
          },
          3,
          2000
        )
        console.log('productName:', productName)

        // Extract Calories
        let calories = 'not-found'
        calories = await tryAction(
          async () => {
            const elementCalories = await page.$('.nf-calories')
            if (elementCalories) {
              const match = await page.$eval('.nf-calories', (el) => {
                const match = el.innerText.trim().match(/\d+/)
                return match ? match[0] : null
              })
              return match || 'not-found'
            }
            return 'not-found'
          },
          3,
          2000
        )
        console.log('Calories:', calories)

        // Extract Protein Content
        let proteinContent = 'not-found'
        proteinContent = await tryAction(
          async () => {
            return await page.$eval('[itemprop="proteinContent"]', (el) => {
              const value = el.innerText.trim().replace(/[^\d]/g, '')
              return `${value}g`
            })
          },
          3,
          2000
        )
        console.log('Protein Content:', proteinContent)

        // Extract Total Carbohydrates
        let totalCarbohydrates = 'not-found'
        totalCarbohydrates = await tryAction(
          async () => {
            await page.waitForSelector('[itemprop="carbohydrateContent"]', { timeout: 60000 })
            return await page.$eval('[itemprop="carbohydrateContent"]', (el) => {
              let value = el.innerText.trim()
              value = value.replace(/\s*grams\s*/i, '')
              return value
            })
          },
          3,
          2000
        )
        console.log('Total Carbohydrates:', totalCarbohydrates)

        // Extract Total Fats
        let totalFats = 'not-found'
        totalFats = await tryAction(
          async () => {
            await page.waitForSelector('[itemprop="fatContent"]', { timeout: 60000 })
            return await page.$eval('[itemprop="fatContent"]', (el) => {
              let value = el.innerText.trim()
              value = value.replace(/\s*grams\s*/i, '')
              return value
            })
          },
          3,
          2000
        )
        console.log('Total Fats:', totalFats)

        // Extract Serving Size
        let servingSize = 'not-found'
        servingSize = await tryAction(
          async () => {
            await page.waitForSelector('input.nf-unitQuantityBox', { timeout: 5000 }).catch(() => {
              console.log('Serving size input element not found.')
            })
            return await page.$eval('input.nf-unitQuantityBox', (el) => el.value || 'not-found')
          },
          3,
          2000
        )
        console.log('Serving Size:', servingSize)

        // Build the object with extracted data
        let obj = {
          itemId: element.item_id,
          name: element.item_name,
          brandName: 'Subway',
          type: 'Unknown',
          nutrients: {
            calories: calories,
            protein: proteinContent,
            carbohydrate: totalCarbohydrates,
            fat: totalFats,
          },
          serving: servingSize,
        }
        arr.push(obj)
        processedItems++
        console.clear()
        console.log(`Scraping Progress: ${processedItems}/${items.length} items processed`)
        // Adding delay between requests to prevent overload
        await delay(2000) // 2 seconds delay
      } catch (error) {
        console.error('Error processing item:', error)
      }
    }

    // Write the extracted data to a JSON file
    fs.writeFile(`./nutritionx/${currentScrape.name}.json`, JSON.stringify(arr, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err)
      } else {
        console.log(`Data has been written to ${currentScrape.name}.json`)
      }
    })
  } catch (error) {
    console.error('Error fetching the page:', error)
  } finally {
    // Close the browser after scraping
    await browser.close()
  }
}

scrapeData()
