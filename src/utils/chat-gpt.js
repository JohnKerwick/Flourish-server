import { OpenAI } from 'openai'
import dotenv from 'dotenv'
import { enforceTokenDelay, estimateChatTokens, getBestModelForTokens, sleep } from './estimateTokens'

dotenv.config()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function processMealRecommendations(content) {
  try {
    const response = await openai.chat.completions.create({
      // model: 'gpt-4o',
      model: 'gpt-4-1106-preview',
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

export async function processMealRecommendationsVariant(content) {
  const messages = [{ role: 'user', content }]
  const tokenCount = estimateChatTokens(messages)
  console.log(`Estimated token count: ${tokenCount}`)
  // const model = getBestModelForTokens(tokenCount)
  const model = 'gpt-4.1-mini' // 16 count,"total_tokens": 8579,

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    })

    return {
      responseText: response.choices[0].message.content,
      usage: response.usage,
      modelUsed: model,
      tokenCount,
    }
  } catch (error) {
    console.error('OpenAI Error:', error.message)
    throw error
  }
}
