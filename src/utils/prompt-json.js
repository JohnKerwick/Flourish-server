export function exampleJson(example) {
  let json = []
  if (example.length === 1 && example.includes('Breakfast')) {
    json = [
      {
        days: 'Monday',
        caloriesProvided: 2000,
        breakfast: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
      },
    ]
  }

  if (example.length === 1 && example.includes('Lunch')) {
    json = [
      {
        days: 'Monday',
        caloriesProvided: 2000,
        lunch: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: '16oz Bottled Dressing, Caesar',
            calories: 250,
            resturantName: 'SaladWorks',
          },
        ],
      },
    ]
  }
  if (example.length === 1 && example.includes('Dinner')) {
    json = [
      {
        days: 'Monday',
        caloriesProvided: 2000,
        dinner: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Shredded Smoked Pork Shoulder (no bbq sauce)',
            calories: 226.8,
            resturantName: 'South Campus',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Garlic Chili White Cheddar Cheese Sauce',
            calories: 72.3,
            resturantName: 'South Campus',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Shrimp and Cod with Tomato Spinach Saffron Sauce',
            calories: 89.2,
            resturantName: 'South Campus',
          },
        ],
      },
    ]
  }

  if (example.length === 2 && example.includes('Breakfast') && example.includes('Lunch')) {
    json = [
      {
        day: 'Monday',
        caloriesProvided: 2000,
        breakfast: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
        lunch: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: '16oz Bottled Dressing, Caesar',
            calories: 250,
            resturantName: 'SaladWorks',
          },
        ],
      },
    ]
  }

  if (example.length === 2 && example.includes('Breakfast') && example.includes('Dinner')) {
    json = [
      {
        day: 'Monday',
        caloriesProvided: 2000,
        breakfast: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
        dinner: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Baja Chipotle Sauce',
            calories: 70,
            resturantName: 'Subway',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'MVP Parmesan Vinaigrette',
            calories: 60,
            resturantName: 'Subway',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Peppercorn Ranch Sauce',
            calories: 80,
            resturantName: 'Subway',
          },
        ],
      },
    ]
  }

  if (example.length === 2 && example.includes('Lunch') && example.includes('Dinner')) {
    json = [
      {
        day: 'Monday',
        caloriesProvided: 2000,
        lunch: [
          {
            id: '67ee6a387f4ebc37de6fce10',
            name: 'Caramel Sauce',
            calories: 105.3,
            resturantName: '251 North',
          },
          {
            id: '67ee6a387f4ebc37de6fce10',
            name: 'Rainbow Sprinkles',
            calories: 135.5,
            resturantName: '251 North',
          },
          {
            id: '67ee6a387f4ebc37de6fce10',
            name: 'Lemon Mint Vinaigrette',
            calories: 98.5,
            resturantName: '251 North',
          },
        ],
        dinner: [
          {
            id: '67ee6a387f4ebc37de6fce10',
            name: 'Baja Chipotle Sauce',
            calories: 70,
            resturantName: 'Subway',
          },
          {
            id: '67ee6a387f4ebc37de6fce10',
            name: 'MVP Parmesan Vinaigrette',
            calories: 60,
            resturantName: 'Subway',
          },
          {
            id: '67ee6a387f4ebc37de6fce10',
            name: 'Peppercorn Ranch Sauce',
            calories: 80,
            resturantName: 'Subway',
          },
        ],
      },
    ]
  }

  if (
    example.length === 3 &&
    example.includes('Breakfast') &&
    example.includes('Lunch') &&
    example.includes('Dinner')
  ) {
    json = [
      {
        day: 'Monday',
        caloriesProvided: 2000,
        breakfast: [
          {
            id: '67ee6a207f4ebc37de6fce02',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a207f4ebc37de6fce02',
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '67ee6a207f4ebc37de6fce02',
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
        lunch: [
          {
            id: '67ee6a207f4ebc37de6fce02',
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            id: '67ee6a207f4ebc37de6fce02',
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: '16oz Bottled Dressing, Caesar',
            calories: 250,
            resturantName: 'SaladWorks',
          },
        ],
        dinner: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Shredded Smoked Pork Shoulder (no bbq sauce)',
            calories: 226.8,
            resturantName: 'South Campus',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Garlic Chili White Cheddar Cheese Sauce',
            calories: 72.3,
            resturantName: 'South Campus',
          },
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Shrimp and Cod with Tomato Spinach Saffron Sauce',
            calories: 89.2,
            resturantName: 'South Campus',
          },
        ],
      },
    ]
  }
  return json
}
