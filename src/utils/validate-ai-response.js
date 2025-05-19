export function validateAiResponse(example) {
  if (example.length === 7) {
    return example
  } 
  if (example.length > 7) {
    return example.slice(0, 7)
  } 
  if (example.length < 7) {
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const result = [];

  while (result.length < 7) {
    const nextItem = { ...example[result.length % example.length] };
    nextItem.day = daysOfWeek[result.length]; 
    result.push(nextItem);
  }

  return result;
  }
}
