import * as gpt from '../agentLlm/gpt.js'
import { getLogger } from '../utils/logger.js'
import * as whatsapp from '../whatsapp.js'
const logger = getLogger('messageHandlers')

const bot_name = '<BOT>'

async function start(client) {
  client.on('message_create', async message => {
    const messageText = message.body.trim()
    const command = messageText.split(' ')[0].toLowerCase()

    if (!message.fromMe) return
    if (messageText.startsWith(bot_name)) return // Ignore messages sent by the bot itself
    if (!messageText.startsWith('!')) return // Process only commands starting with '!'
    if (command === '!ping') {
      whatsapp.sendMessage(message, `${bot_name} pong`)
    }

    if (command === '!bot') {
      const agentPrompt = "You are a helpful assistant. Respond concisely and clearly and with emojis when appropriate."
      const userPrompt = messageText.replace('!bot', '').trim()
      const userName = message.from

      try {
        const botResponse = await gpt.callMistralResponse(
          userName,
          agentPrompt,
          userPrompt
        )

        whatsapp.sendMessage(message, `${bot_name} ${botResponse}`)
      } catch (err) {
        whatsapp.sendMessage(message, `${bot_name} Sorry, I encountered an error while processing your request.`)

        logger.error({ err }, 'Error calling Mistral API')
      }
    }
  })
};

export { start }

