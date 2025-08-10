import { BOT_NAME as bot_name, processBotCommand } from '../services/agent_chatbot.js'
import { listReports, runReportNow } from '../services/AI_Reports.js'
import { getLogger } from '../utils/logger.js'
import * as whatsapp from '../whatsapp.js'
const logger = getLogger('messageHandlers')

async function start(client) {
  client.on('message_create', async message => {
    const messageText = message.body.trim()
    const command = messageText.split(' ')[0].toLowerCase()

    if (!message.fromMe)
      return
    if (messageText.startsWith(bot_name)) // Ignore messages sent by the bot itself
      return
    if (!messageText.startsWith('!')) // Process only commands starting with '!'
      return

    if (command === '!ping') {
      whatsapp.sendMessage(message, `${bot_name} pong`)
    }

    if (command === '!bot') {
      logger.info({ from: message.from }, 'Processando comando !bot')
      await processBotCommand(client, message)
    }

    if (command === '!reports') {
      const parts = messageText.split(/\s+/).slice(1)
      const sub = (parts[0] || '').toLowerCase()

      if (!sub) {
        const data = listReports()
        const resp = data.map(r => `• ${r.name} (${r.enabled ? 'on' : 'off'}) cron=${r.cron}\n  ${r.description}`).join('\n') || 'Nenhum report.'

        await whatsapp.sendMessage(message, `${bot_name} Reports:\n${resp}`)

        return
      }
      if (sub === 'run') {
        const name = parts[1]

        if (!name) {
          await whatsapp.sendMessage(message, `${bot_name} Uso: !reports run <nome>`)

          return
        }
        try {
          await runReportNow(name)
        } catch (err) {
          await whatsapp.sendMessage(message, `${bot_name} Erro: ${err.message}`)
        }

        return
      }
      await whatsapp.sendMessage(message, `${bot_name} Uso: !reports [list]|run <nome>`)
    }
  })
};

export { start }

