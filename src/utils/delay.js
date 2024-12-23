export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const randomDelay = () => Math.floor(Math.random() * (5000 - 1000 + 1)) + 10000

export default { delay, randomDelay }
