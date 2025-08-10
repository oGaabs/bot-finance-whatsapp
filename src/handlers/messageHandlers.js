import { BOT_NAME as bot_name, processBotCommand } from '../services/agent_chatbot.js'
import { getLogger } from '../utils/logger.js'
import * as whatsapp from '../whatsapp.js'
const logger = getLogger('messageHandlers')

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
      logger.info({ from: message.from }, 'Processando comando !bot')
      await processBotCommand(client, message)
    }
  })
};

export { start }

