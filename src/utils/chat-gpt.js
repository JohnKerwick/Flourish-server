import { OpenAI } from 'openai'
import dotenv from 'dotenv'

dotenv.config()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function processMealRecommendations(content) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      // model: 'gpt-4-1106-preview',
      messages: [{ role: 'user', content }],
      temperature: 0.7,
    })
    const result = {
      responseText: response.choices[0].message.content,
      usage: response.usage, // ✅ Token usage info
    }

    return result
  } catch (error) {
    console.error('OpenAI Error:', error.message)
    throw error
  }
}
