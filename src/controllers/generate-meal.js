import { runMealGenerationManually } from '../utils/generate-meals_cron'

export const CONTROLLER_GENERATE = {
  async generateMealManually(req, res) {
    res.status(202).json({
      message: 'Meal Generation completed and data saved to MongoDB successfully',
    })
    runMealGenerationManually()
    try {
      notifyError('Meal Generation Sucess')
    } catch (error) {
      console.error('Error during Meal Generation:', error)
      notifyError(error)
      res.status(500).json({ message: 'Meal Generation failed', error: error.message })
    }
  },
}
