export function exampleJson(example) {
  let json = []
  if (example.length === 1 && example.includes('Breakfast')) {
    json = [
      {
        mealType: 'Breakfast',
        items: [
          {
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
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
        mealType: 'Lunch',
        items: [
          {
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
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
        mealType: 'Dinner',
        items: [
          {
            name: 'Shredded Smoked Pork Shoulder (no bbq sauce)',
            calories: 226.8,
            resturantName: 'South Campus',
          },
          {
            name: 'Garlic Chili White Cheddar Cheese Sauce',
            calories: 72.3,
            resturantName: 'South Campus',
          },
          {
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
        mealType: 'Breakfast',
        items: [
          {
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
      },
      {
        mealType: 'Lunch',
        items: [
          {
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
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
        mealType: 'Breakfast',
        items: [
          {
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
      },
      {
        mealType: 'Dinner',
        items: [
          {
            name: 'Baja Chipotle Sauce',
            calories: 70,
            resturantName: 'Subway',
          },
          {
            name: 'MVP Parmesan Vinaigrette',
            calories: 60,
            resturantName: 'Subway',
          },
          {
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
        mealType: 'Lunch',
        items: [
          {
            name: 'Caramel Sauce',
            calories: 105.3,
            resturantName: '251 North',
          },
          {
            name: 'Rainbow Sprinkles',
            calories: 135.5,
            resturantName: '251 North',
          },
          {
            name: 'Lemon Mint Vinaigrette',
            calories: 98.5,
            resturantName: '251 North',
          },
        ],
      },
      {
        mealType: 'Dinner',
        items: [
          {
            name: 'Baja Chipotle Sauce',
            calories: 70,
            resturantName: 'Subway',
          },
          {
            name: 'MVP Parmesan Vinaigrette',
            calories: 60,
            resturantName: 'Subway',
          },
          {
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
        mealType: 'Breakfast',
        items: [
          {
            name: 'Plain Cream Cheese',
            calories: 101.3,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            name: 'Strawberry Yogurt',
            calories: 67.4,
            resturantName: 'Yahentamitsi Dining Hall',
          },
          {
            name: 'Vanilla Greek Yogurt',
            calories: 85.7,
            resturantName: 'Yahentamitsi Dining Hall',
          },
        ],
      },
      {
        mealType: 'Lunch',
        items: [
          {
            name: '16oz Bottled Dressing, Balsamic Vinaigrette',
            calories: 250,
            resturantName: 'SaladWorks',
          },
          {
            name: '16oz Bottled Dressing, Blue Cheese',
            calories: 270,
            resturantName: 'SaladWorks',
          },
          {
            name: '16oz Bottled Dressing, Caesar',
            calories: 250,
            resturantName: 'SaladWorks',
          },
        ],
      },
      {
        mealType: 'Dinner',
        items: [
          {
            name: 'Shredded Smoked Pork Shoulder (no bbq sauce)',
            calories: 226.8,
            resturantName: 'South Campus',
          },
          {
            name: 'Garlic Chili White Cheddar Cheese Sauce',
            calories: 72.3,
            resturantName: 'South Campus',
          },
          {
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
