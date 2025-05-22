
import { OpenAI } from 'openai'
import dotenv from 'dotenv'

dotenv.config()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function processMealRecommendations(content) {
  try {

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      // model: 'o4-mini',
      messages: [{ role: 'user', content }],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Error:', error.message);
    throw error;
  }
}
