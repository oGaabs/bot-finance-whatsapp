import qrcode from 'qrcode-terminal'
import whatsappWebPkg from 'whatsapp-web.js'
import { getLogger } from './utils/logger.js'
const logger = getLogger('whatsapp')

const { Client, LocalAuth } = whatsappWebPkg

let client = null

function getClient() {
  if (!client) {
    logger.info('Criando novo cliente WhatsApp...')
    client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true, args: ["--no-sandbox"] },
    })

    logger.info('Cliente WhatsApp criado! Verificando QR Code...')
    client.on("qr", (qr) => qrcode.generate(qr, { small: true }))   // When the client received QR-Code
  }

  return client
}
async function sendMessage(message, replyText) {
  await new Promise(resolve => setTimeout(resolve, 1000)) // Just a delay for API

  const chat = await message.getChat()
  const rawNumberTo = message.to

  const formatUser = `${message.rawData.notifyName} (${rawNumberTo})`

  if (chat.isGroup) {
    logger.info({ group: chat.name, from: formatUser, body: message.body }, 'Mensagem de grupo recebida')
    const formatted = formatOutgoingMessage(replyText, { context: 'group', chatName: chat.name })
    logger.info({ group: chat.name, to: formatUser, reply: formatted }, 'Enviando resposta para grupo')
    await chat.sendMessage(formatted)

    return
  }

  logger.info({ to: rawNumberTo, body: message.body }, 'Mensagem direta recebida')
  const formatted = formatOutgoingMessage(replyText, { context: 'direct' })
  logger.info({ to: rawNumberTo, reply: formatted }, 'Enviando resposta direta')

  await client.sendMessage(rawNumberTo, formatted)
}

// Envia mensagem direta sem precisar do objeto message original (usado por reminders / scheduler)
async function sendRaw(to, text) {
  if (!client)
    throw new Error('Cliente WhatsApp não inicializado')

  if (!to.endsWith('@c.us')) {
    to += '@c.us'
  }

  try {
    const formatted = formatOutgoingMessage(text, { context: to.endsWith('@g.us') ? 'group' : 'direct' })
    logger.info({ to, text: formatted }, 'Enviando mensagem (raw)')
    await client.sendMessage(to, formatted)
  } catch (err) {
    logger.error({ err, to }, 'Falha ao enviar mensagem raw')
  }
}

function formatOutgoingMessage(text, { context = 'direct', chatName } = {}) {
  if (!text)
    return ''

  let out = String(text)

  // Normalizar quebras de linha e remover \r
  out = out.replace(/\r/g, '')

  // Colapsar múltiplas linhas em branco
  out = out.replace(/\n{3,}/g, '\n\n').trim()

  // Prefixo contextual
  if (context === 'group') {
    const header = chatName ? `*🤖 Assistant* · ${chatName}` : '*🤖 Assistant*'
    out = header + '\n' + out
  }

  return out
}

export { formatOutgoingMessage, getClient, sendMessage, sendRaw }

