import { callMistralResponse } from '../agentLlm/gpt.js'
import { getLogger } from '../utils/logger.js'
import * as whatsapp from '../whatsapp.js'

const logger = getLogger('agent_chatbot')
const BOT_NAME = '<BOT>'

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant. Respond concisely and clearly and with emojis when appropriate.'

export async function processBotCommand(client, message) {
  const fullText = message.body.trim()
  const userPrompt = fullText.replace(/^!bot/i, '').trim()
  const userId = message.from

  if (!userPrompt) {
    await whatsapp.sendMessage(message, `${BOT_NAME} Por favor adicione uma pergunta após !bot`)

    return
  }

  try {
    const botResponse = await callMistralResponse(
      userId,
      DEFAULT_SYSTEM_PROMPT,
      userPrompt
    )

    await whatsapp.sendMessage(message, `${BOT_NAME} ${botResponse}`)
  } catch (err) {
    logger.error({ err }, 'Erro ao chamar modelo GPT')
    await whatsapp.sendMessage(message, `${BOT_NAME} Ocorreu um erro ao processar sua solicitação.`)
  }
}

export { BOT_NAME }

