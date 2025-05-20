export function exampleJson(example) {
  let json = []
  if (example.length === 1 && example.includes('Breakfast')) {
    json = [
      {
        days: 'Monday',
        breakfast: [
          {
            id: '6799d34882a7649a9de25c37',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '6799d34a82a7649a9de25c39',
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '6799d34a82a7649a9de25c3a',
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
        lunch: [
          {
            id: '67acac3190199bff8920256a',
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            id: '67acac3190199bff8920256b',
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
            id: '67acac3190199bff8920256c',
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
        dinner: [
          {
            id: '67caa4be0909e38b69423866',
            name: 'Shredded Smoked Pork Shoulder (no bbq sauce)',
            calories: 226.8,
            resturantName: 'South Campus',
          },
          {
            id: '67f918d275d7a16b2b8dc522',
            name: 'Garlic Chili White Cheddar Cheese Sauce',
            calories: 72.3,
            resturantName: 'South Campus',
          },
          {
            id: '67f918d375d7a16b2b8dc524',
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
        breakfast: [
          {
            id: '6799d34882a7649a9de25c37',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '6799d34a82a7649a9de25c39',
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
        breakfast: [
          {
            id: '67ee6a307f4ebc37de6fce0b',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '6799d34a82a7649a9de25c39',
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '6799d34a82a7649a9de25c3a',
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
        dinner: [
          {
            id: '67aca0a320afa3d5aa710984',
            name: 'Baja Chipotle Sauce',
            calories: 70,
            resturantName: 'Subway',
          },
          {
            id: '67aca0a320afa3d5aa7109c4',
            name: 'MVP Parmesan Vinaigrette',
            calories: 60,
            resturantName: 'Subway',
          },
          {
            id: '67aca0a320afa3d5aa7109d1',
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
        lunch: [
          {
            id: '6799d3e182a7649a9de25cc7',
            name: 'Caramel Sauce',
            calories: 105.3,
            resturantName: '251 North',
          },
          {
            id: '6799d3e782a7649a9de25ccf',
            name: 'Rainbow Sprinkles',
            calories: 135.5,
            resturantName: '251 North',
          },
          {
            id: '6799d3d582a7649a9de25cb7',
            name: 'Lemon Mint Vinaigrette',
            calories: 98.5,
            resturantName: '251 North',
          },
        ],
        dinner: [
          {
            id: '67aca0a320afa3d5aa710984',
            name: 'Baja Chipotle Sauce',
            calories: 70,
            resturantName: 'Subway',
          },
          {
            id: '67aca0a320afa3d5aa7109c4',
            name: 'MVP Parmesan Vinaigrette',
            calories: 60,
            resturantName: 'Subway',
          },
          {
            id: '67aca0a320afa3d5aa7109d1',
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
        breakfast: [
          {
            id: '6799d34882a7649a9de25c37',
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '6799d34a82a7649a9de25c39',
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            id: '6799d34a82a7649a9de25c3a',
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
        lunch: [
          {
            id: '6799d34a82a7649a9de25c3a',
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            id: '67acac3190199bff8920256b',
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
            id: '67acac3190199bff8920256c',
            name: '16oz Bottled Dressing, Caesar',
            calories: 250,
            resturantName: 'SaladWorks',
          },
        ],
        dinner: [
          {
            id: '67caa4be0909e38b69423866',
            name: 'Shredded Smoked Pork Shoulder (no bbq sauce)',
            calories: 226.8,
            resturantName: 'South Campus',
          },
          {
            id: '67f918d275d7a16b2b8dc522',
            name: 'Garlic Chili White Cheddar Cheese Sauce',
            calories: 72.3,
            resturantName: 'South Campus',
          },
          {
            id: '67f918d375d7a16b2b8dc524',
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
