import { encoding_for_model } from 'tiktoken'

const TOKEN_LIMITS = {
  'gpt-4o': 30000,
  'gpt-4-1106-preview': 300000,
  'gpt-3.5-turbo': 1000000,
}

function estimateChatTokens(messages, model = 'gpt-4-1106-preview') {
  const encoding = encoding_for_model(model)
  let tokens = 0
  for (const msg of messages) {
    tokens += 4 // per-message overhead
    tokens += encoding.encode(msg.content || '').length
  }
  tokens += 2 // reply priming
  return tokens
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

//? not working properly, need to fix
async function enforceTokenDelay(tokenEstimate, model) {
  const tpm = TOKEN_LIMITS[model] || 30000
  const usedRatio = tokenEstimate / tpm
  if (usedRatio >= 0.9) {
    const waitMs = Math.ceil(usedRatio * 60000)
    console.log(`⏳ Waiting ${waitMs}ms to avoid rate limit (used: ${tokenEstimate}/${tpm})`)
    await sleep(waitMs)
  }
}
// utils/getBestModelForTokens.js

function getBestModelForTokens(tokenCount) {
  if (tokenCount > 30000) return '' // higher TPM, token cap
  if (tokenCount > 16000) return 'gpt-4o' // cheaper
  return 'gpt-3.5-turbo' // fallback for small jobs
}

export { estimateChatTokens, enforceTokenDelay, sleep, getBestModelForTokens }
