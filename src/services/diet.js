export const calculateBMR = ({ dob, gender, weight, height, goal }) => {
  const birthDate = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()

  // Adjust for the birthday not having occurred yet this year
  if (
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
  ) {
    age--
  }

  // Convert height from inches to centimeters
  const heightInCm = height * 2.54

  let bmr = 0

  // Calculate BMR based on gender
  if (gender.toLowerCase() === 'male') {
    bmr = 10 * weight + 6.25 * heightInCm - 5 * age + 5
  } else {
    bmr = 10 * weight + 6.25 * heightInCm - 5 * age - 161
  }

  // Adjust BMR based on goal
  if (goal === 'Gain Weight') {
    bmr *= 1.2 // Multiply by 1.2 for gaining weight
  } else if (goal === 'Maintain Weight') {
    bmr *= 1.0 // No adjustment for maintaining weight
  } else if (goal === 'Loss Weight') {
    bmr *= 0.8 // Multiply by 0.8 for losing weight
  }

  return bmr
}
