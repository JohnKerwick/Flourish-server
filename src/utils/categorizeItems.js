export const categorizeItem = (item) => {
  const name =
    item.name
      ?.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .trim() || ''
  const category = item.category?.toLowerCase().trim() || ''

  // --- MAIN COURSES ---
  if (
    /\b(burger|cheeseburger|wrap|pizza|bowl|platter|entree|carved|roast|burrito|grilled|sandwich|chicken|beef|tofu|fish|pasta|curry|main|tenders|meatloaf|enchilada|gyro|quesadilla|flatizza|nugget|frittata|wellington|sub|hoagie|meatball|bratwurst|steak|ziti|ravioli|gnocchi|al pastor|biryani|lo mein|noodles|souvlaki|taco|tamale|panini|pork loin|shawarma|kebab|shawerma|brisket|moussaka|crepe)\b/.test(
      name
    ) ||
    /\b(the king|the triple b|turkey club|the honey bee|southern charm|the crew|the toasted granny|give me a v|ultimate blt|blt|point melt|chickfila|impossible|meatless|vegan patty|club)\b/.test(
      name
    )
  ) {
    return 'Main'
  }

  // --- BREAKFAST MAINS ---
  if (
    /\b(bagel|biscuit|pancake|waffle|toast|omelet|egg|scramble|french toast|hash|muffin|croissant|bacon|ham|sausage|quiche|minis|oatmeal|cereal|flatizza)\b/.test(
      name
    )
  ) {
    return 'Main'
  }

  // --- SIDES ---
  if (
    /\b(fries|soup|salad|coleslaw|veggies|vegetables|mashed|rice|quinoa|side|chips|hash|grits|stuffing|potato|plantain|slaw|okra|lentils|beans|falafel|pilaf|cornbread|breadstick|brussels sprouts|sprouts|yuca|bread|muffin|roll|hushpuppies|croutons|onion rings|pickled red onions|pico de gallo|sunflower seeds|cajun roasted potatoes|baby corn|chopped green onions|pad thai noodles|pickled onions|chopped romaine|crouton|sliced tomatoes|tempura mushrooms|roasted corn|flax seeds|spicy roasted sunflower seeds|candied pumpkin seeds|crispy corn tortilla strips|roasted mushrooms and red peppers|sliced roma tomatoes|diced green peppers|pickled cucumbers|roasted mushrooms|roasted bell peppers|sliced black olives|diced tomatoes|diced onions|roasted sweet potatoes|celery sticks|jerk roasted sweet potatoes|southwest bbq roasted potatoes|baba ghanoush|mango salsa)\b/.test(
      name
    )
  ) {
    return 'Side'
  }

  // --- DESSERTS ---
  if (
    /\b(cookie|cake|pie|ice cream|brownie|dessert|cobbler|pudding|parfait|tart|mousse|sundae|sorbet|crumble|banana bread|donut|fudge|bark|danish|custard|cannoli|muffie|cupcake|twist|croissant|cinnamon scone|assorted mini rolls|oreo pieces|m&m pieces|fruit cup|lemon cooler cookies|chocolate chunk cookies|red velvet cookies|mini cannolis|lemon bars|cinnamon sugar nuggets|salted caramel blondie)\b/.test(
      name
    )
  ) {
    return 'Dessert'
  }

  // --- DRINKS ---
  if (
    /\b(milk|juice|tea|coffee|water|soda|smoothie|beverage|lemonade|drink|frappuccino|latte|mocha|americano|espresso|chai|matcha|sparkling|cider|hot chocolate|macchiato|oj|punch|coke|cola|sprite|pepsi|mountain dew|starry|icedream|energy|powerade|kombucha|ginger ale|iced tea|root beer)\b/.test(
      name
    )
  ) {
    return 'Drink'
  }

  // --- SNACKS ---
  if (
    /\b(snack|granola|bar|nuts|pretzel|trail mix|popcorn|cracker|string cheese|jerky|protein bar|cookie pack|munchies|fritos|doritos|chips|fruit cup|pico de gallo|sunflower seeds|chips|sliced jalapenos|cajun roasted potatoes|flax seeds|candied pumpkin seeds|spicy roasted sunflower seeds|crispy corn tortilla strips)\b/.test(
      name
    )
  ) {
    return 'Snack'
  }

  // --- CONDIMENTS / TOPPINGS ---
  if (
    /\b(ketchup|mustard|dressing|vinaigrette|sauce|gravy|hummus|dip|spread|salsa|relish|aioli|topping|syrup|mayo|pesto|chutney|foam|shot|boost|topping|scoop|butter|vinaigrette|oil|vinegar|basil pesto|hot sauce|marinade|maraschino|glaze|ranch|vinaigrettes|crema|remoulade|sprinkles|chipotle vinaigrette|vegan chipotle mayonnaise|vegan mayonnaise|pesto|guacamole)\b/.test(
      name
    )
  ) {
    return 'Condiment'
  }

  // --- FRUITS ---
  if (
    /\b(fruit|apple|banana|grape|melon|cantaloupe|orange|pineapple|berry|berries|pear|peach|plum|kiwi|watermelon|honeydew|mango|cherry|fig|apricot|raisins|dried fruit|fruit salad)\b/.test(
      name
    )
  ) {
    return 'Fruit'
  }

  // --- VEGETABLES ---
  if (
    /\b(carrot|broccoli|spinach|cabbage|zucchini|vegetable|green beans|cauliflower|pepper|kale|lettuce|beets|asparagus|peas|collard greens|mushroom|squash|edamame|okra|tomato|cucumber|onion|basil|cilantro|garlic|chard|radish|bean sprouts|bamboo shoots|snap peas|bok choy|artichoke hearts|portobello mushrooms|baby corn|marinated cucumbers|pickled red onions|curried tomatoes and chickpeas|moong dal tadka|curried corn|beluga lentils with roasted tomatoes|cabbage|collard greens|marinated cucumbers|pickled onions)\b/.test(
      name
    )
  ) {
    return 'Vegetable'
  }

  // --- DAIRY ---
  if (
    /\b(cheese|yogurt|milk|cream|butter|sour cream|mozzarella|cheddar|parmesan|feta|provolone|havarti|ricotta|gouda|brie|custard|queso blanco)\b/.test(
      name
    )
  ) {
    return 'Dairy'
  }

  // --- PLANT-BASED / VEGAN ---
  if (/\b(vegan|tofu|plant-based|meatless|impossible|tempeh|seitan|vegetarian)\b/.test(name)) {
    return 'Plant-Based'
  }

  // --- SEAFOOD ---
  if (/\b(shrimp|fish|salmon|tuna|lobster|crab|mussels|squid|clams|octopus|scallops|sardines|halibut)\b/.test(name)) {
    return 'Seafood'
  }

  // --- BEVERAGES (ALCOHOLIC) ---
  if (/\b(beer|wine|cocktail|whiskey|vodka|rum|tequila|gin|sangria|cider|margarita)\b/.test(name)) {
    return 'Alcoholic Beverage'
  }

  // --- FALLBACK ---
  return 'Uncategorized'
}
