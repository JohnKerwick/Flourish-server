import axios from 'axios';
import dotenv from 'dotenv';


dotenv.config()

export async function deepSeekRes(content) {
  try {

  const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat', // or 'deepseek-chat'
        messages: [
          { role: 'user', content: content }
        ],
        temperature: 1.0
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('DeepSeek API response:', response.data);

   return response.data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API error:', error.response?.data || error.message);
     return {
    error: 'DeepSeek API error',
    details: error.response?.data || error.message
  };
  }
}
