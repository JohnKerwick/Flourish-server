export const isForbiddenCombo = (items) => {
  const itemCats = items.map((i) => i.category?.toLowerCase().trim()).filter(Boolean)

  const hasMultiple = (cat) => itemCats.filter((c) => c === cat).length > 1

  const has = (cat) => itemCats.includes(cat)

  // Rule: only one 'main', 'dessert', 'drink', and 'side' per meal
  if (hasMultiple('main') || hasMultiple('dessert') || hasMultiple('drink') || hasMultiple('side')) {
    return true
  }

  // Rule: dessert should not be served with side (assuming soup is categorized as side)
  if (has('dessert') && has('side')) {
    return true
  }

  // Rule: main should not be combined with snack (snack is not part of a proper main meal)
  if (has('main') && has('snack')) {
    return true
  }

  // Rule: main should not be combined with only condiment (unless other items are present)
  if (has('main') && has('condiment') && itemCats.length <= 2) {
    return true
  }

  // Rule: more than one dairy item is unusual in one meal
  if (hasMultiple('dairy')) {
    return true
  }

  // Rule: avoid pairing seafood and dairy
  if (has('seafood') && has('dairy')) {
    return true
  }

  // Rule: avoid alcohol with breakfast categories
  if (has('alcoholic beverage') && (has('dairy') || has('fruit') || has('cereal') || has('snack'))) {
    return true
  }

  return false
}
