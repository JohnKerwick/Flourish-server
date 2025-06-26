export function buildPrompt(ingredients, type, targetCalories) {
  const data = ingredients.map((m) => ({
    name: m.name,
    calories: m.nutrients.calories,
    protein: m.nutrients.protein,
    fat: m.nutrients.fat,
    carbohydrate: m.nutrients.carbohydrate,
  }));

  return `
You are a nutritionist AI.

From the following list of ingredients, generate as many realistic ${type} meal combinations as possible.

Constraints:
- Calories should be close to ${targetCalories}
- Combine 2 to 4 ingredients max
- Return a JSON array of objects with fields:
  name, ingredients (array of names), nutrients (calories, protein, fat, carbohydrate)

Ingredients:
${JSON.stringify(data, null, 2)}
`;
}

export function parseGeneratedMeals(text) {
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    return JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    console.error('OpenAI response parsing failed:', err.message);
    return [];
  }
}
